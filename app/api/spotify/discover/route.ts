import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, spotifyFetch, SpotifyApiError } from "@/lib/spotifyApi";
import { getErrorMessage } from "@/lib/errors";
import {
  getArtistTopTracks,
  getSimilarArtists,
  getSimilarTracks,
  LastfmApiError,
} from "@/lib/lastfm";
import { resolveSpotifyArtist, resolveSpotifyTrack } from "@/lib/resolveTrack";
import type { DiscoverResponse, SpotifyArtist, SpotifyTrack } from "@/types/spotify";
import type { LastfmSimilarArtist, LastfmTopTrack } from "@/types/lastfm";

// Endpoint that provides music and artist recommendations.
// Seed track -> Last.fm track.getSimilar / artist.getSimilar -> each name resolved
// back to a Spotify track / artist via Search. If no songs come out of that, falls
// back to the top songs of the first few similar artists.

export const runtime = "nodejs";

// TODO: Move these two variables to project-wide env variable
const MAX_SONG_RECOMMENDATIONS = 20;
const MAX_ARTIST_RECOMMENDATIONS = 9;

// Fallback when Last.fm has no similar-track data for the seed (common for newer
// releases): top songs from the first few similar artists.
const FALLBACK_ARTIST_COUNT = 5;
const FALLBACK_SONGS_PER_ARTIST = 2;

// Spotify ids are base62. artistId is client-supplied now and gets interpolated
// into a Spotify path, so reject anything that isn't an id before using it.
// trackId is interpolated into /tracks/{id} for the seed lookup, so the same applies.
const SPOTIFY_ID = /^[A-Za-z0-9]{1,40}$/;

function dedupeById<T extends { id?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

// LastfmSimilarTrack is structurally a LastfmTopTrack, so both paths share this.
async function resolveTracks(
  accessToken: string,
  tracks: LastfmTopTrack[]
): Promise<SpotifyTrack[]> {
  const resolved = await Promise.all(
    tracks.map((track) => resolveSpotifyTrack(accessToken, track.artist.name, track.name))
  );
  return resolved.filter((track): track is SpotifyTrack => track !== null);
}

async function resolveArtists(
  accessToken: string,
  similar: LastfmSimilarArtist[]
): Promise<SpotifyArtist[]> {
  const resolved = await Promise.all(
    similar.map((artist) => resolveSpotifyArtist(accessToken, artist.name))
  );
  return resolved.filter((artist): artist is SpotifyArtist => artist !== null);
}

// Best-effort per artist: this is already a fallback, so one artist's Last.fm
// failure drops that artist's songs rather than failing the whole request.
// Results stay in similarity order: A1 A2 B1 B2 …
async function getFallbackSongs(
  accessToken: string,
  similarArtists: LastfmSimilarArtist[]
): Promise<SpotifyTrack[]> {
  const topTracks = await Promise.all(
    similarArtists.slice(0, FALLBACK_ARTIST_COUNT).map((artist) =>
      getArtistTopTracks(artist.name, FALLBACK_SONGS_PER_ARTIST).catch((error) => {
        console.error("[getFallbackSongs]", artist.name, getErrorMessage(error));
        return [];
      })
    )
  );
  return resolveTracks(accessToken, topTracks.flat());
}

export async function POST(req: NextRequest): Promise<NextResponse<DiscoverResponse>> {
  const accessToken = await getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  // Post-validation this matches DiscoverRequest (src/types/spotify.ts); it's
  // destructured as unknown here because the body is untrusted input.
  const { artistId, trackId } = (body ?? {}) as { artistId?: unknown; trackId?: unknown };
  if (typeof artistId !== "string" || !SPOTIFY_ID.test(artistId)) {
    return NextResponse.json(
      { error: "Couldn't work out what's playing — skip to another track and try again." },
      { status: 400 }
    );
  }
  if (typeof trackId !== "string" || !SPOTIFY_ID.test(trackId)) {
    return NextResponse.json(
      { error: "Couldn't work out what's playing — skip to another track and try again." },
      { status: 400 }
    );
  }

  try {
    // Seed names come from /tracks/{id} rather than CurrSong.songArtist, which is a
    // comma-joined list of every artist and matches nothing on Last.fm.
    const seed = await spotifyFetch<SpotifyTrack>(accessToken, `/tracks/${trackId}`);
    const seedArtist = seed?.artists?.[0]?.name;
    if (!seed?.name || !seedArtist) {
      return NextResponse.json({ songRecommendations: [], artistRecommendations: [] });
    }

    const [lastfmTracks, lastfmArtists] = await Promise.all([
      getSimilarTracks(seedArtist, seed.name, MAX_SONG_RECOMMENDATIONS),
      getSimilarArtists(seedArtist, MAX_ARTIST_RECOMMENDATIONS),
    ]);

    const [similarTracks, similarArtists] = await Promise.all([
      resolveTracks(accessToken, lastfmTracks),
      resolveArtists(accessToken, lastfmArtists),
    ]);

    let songRecommendations = dedupeById(similarTracks)
      .filter((track) => track.id !== trackId)
      .slice(0, MAX_SONG_RECOMMENDATIONS);

    if (songRecommendations.length === 0) {
      console.log("[/api/spotify/discover] song fallback", seedArtist, "-", seed.name);
      songRecommendations = dedupeById(await getFallbackSongs(accessToken, lastfmArtists))
        .filter((track) => track.id !== trackId)
        .slice(0, FALLBACK_ARTIST_COUNT * FALLBACK_SONGS_PER_ARTIST);
    }

    const artistRecommendations = dedupeById(similarArtists)
      .filter((artist) => artist.id !== artistId)
      .slice(0, MAX_ARTIST_RECOMMENDATIONS);

    return NextResponse.json({ songRecommendations, artistRecommendations });
  } catch (error) {
    if (error instanceof LastfmApiError) {
      console.error("[/api/spotify/discover] Last.fm", error.status, error.code, getErrorMessage(error));
      return NextResponse.json(
        {
          error: process.env.LASTFM_API_KEY
            ? "Couldn't get recommendations from Last.fm — try again in a moment."
            : "Song recommendations aren't configured (missing Last.fm API key).",
        },
        { status: 502 }
      );
    }

    const status = error instanceof SpotifyApiError ? error.status : 500;
    const message =
      status === 429
        ? "Spotify is rate-limiting requests right now — try again in a moment."
        : getErrorMessage(error) || "Discover failed";
    console.error(
      "[/api/spotify/discover]",
      status,
      error instanceof SpotifyApiError ? error.path : undefined,
      getErrorMessage(error),
      error instanceof SpotifyApiError ? error.rawBody : undefined
    );
    return NextResponse.json({ error: message }, { status });
  }
}
