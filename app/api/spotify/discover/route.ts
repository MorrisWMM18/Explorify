import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, spotifyFetch, SpotifyApiError } from "@/lib/spotifyApi";
import { getArtistGenres } from "@/lib/artistGenres";
import { getErrorMessage } from "@/lib/errors";
import type {
  DiscoverResponse,
  SpotifyArtist,
  SpotifySearchArtistsResponse,
  SpotifySearchTracksResponse,
  SpotifyTopTracksResponse,
  SpotifyTrack,
} from "@/types/spotify";

// Recommendations only. What's currently playing is /current-track's job — this
// route is handed the seed it produced rather than re-reading /me/player.
//
// Deliberately does not call /recommendations, /related-artists or
// /audio-features: Spotify deprecated all three on 2024-11-27 for any app not
// already in Extended Quota Mode before that date, and there is no application
// path to get them back. Artist top tracks plus genre-filtered Search return the
// same Track/Artist object shapes those endpoints used to.

export const runtime = "nodejs";

const MARKET = "US";
const MAX_SONG_RECOMMENDATIONS = 20;
const MAX_ARTIST_RECOMMENDATIONS = 9;

// Spotify ids are base62. artistId is client-supplied now and gets interpolated
// into a Spotify path, so reject anything that isn't an id before using it.
// trackId never reaches a path (it's only a filter comparand below), but it's
// validated the same way as input hygiene.
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

  const { artistId, trackId } = (body ?? {}) as { artistId?: unknown; trackId?: unknown };
  if (typeof artistId !== "string" || !SPOTIFY_ID.test(artistId)) {
    return NextResponse.json({ error: "A valid artistId is required." }, { status: 400 });
  }
  if (typeof trackId !== "string" || !SPOTIFY_ID.test(trackId)) {
    return NextResponse.json({ error: "A valid trackId is required." }, { status: 400 });
  }

  try {
    const [genres, topTracksResponse] = await Promise.all([
      getArtistGenres(accessToken, artistId),
      spotifyFetch<SpotifyTopTracksResponse>(
        accessToken,
        `/artists/${artistId}/top-tracks?market=${MARKET}`
      ),
    ]);

    const topGenre = genres[0];
    if (!topGenre) {
      // Either the artist genuinely has no genres tagged or getArtistGenres
      // swallowed a failure — both leave artistRecommendations empty, so say so.
      console.warn("[/api/spotify/discover] no genres for", artistId);
    }

    // Best-effort genre augmentation: if Search behaves unexpectedly for a given
    // genre string, fall back to just the artist's own top tracks rather than
    // failing the whole request.
    let genreTracks: SpotifyTrack[] = [];
    let genreArtists: SpotifyArtist[] = [];
    if (topGenre) {
      const genreQuery = encodeURIComponent(`genre:"${topGenre}"`);

      try {
        const genreTracksResponse = await spotifyFetch<SpotifySearchTracksResponse>(
          accessToken,
          `/search?q=${genreQuery}&type=track&market=${MARKET}&limit=20`
        );
        genreTracks = genreTracksResponse?.tracks?.items ?? [];
      } catch {
        genreTracks = [];
      }

      try {
        const genreArtistsResponse = await spotifyFetch<SpotifySearchArtistsResponse>(
          accessToken,
          `/search?q=${genreQuery}&type=artist&market=${MARKET}&limit=20`
        );
        genreArtists = genreArtistsResponse?.artists?.items ?? [];
      } catch {
        genreArtists = [];
      }
    }

    const songRecommendations = dedupeById([...(topTracksResponse?.tracks ?? []), ...genreTracks])
      .filter((track) => track.id !== trackId)
      .slice(0, MAX_SONG_RECOMMENDATIONS);

    const artistRecommendations = dedupeById(genreArtists)
      .filter((artist) => artist.id !== artistId)
      .slice(0, MAX_ARTIST_RECOMMENDATIONS);

    return NextResponse.json({ songRecommendations, artistRecommendations });
  } catch (error) {
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
