import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, spotifyFetch, SpotifyApiError } from "@/lib/spotifyApi";
import { getErrorMessage } from "@/lib/errors";
import type {
  DiscoverResponse,
  SpotifyArtist,
  SpotifyCurrentlyPlaying,
  SpotifySearchArtistsResponse,
  SpotifySearchTracksResponse,
  SpotifyTopTracksResponse,
  SpotifyTrack,
} from "@/types/spotify";

export const runtime = "nodejs";

const MARKET = "US";

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

  try {
    const playback = await spotifyFetch<SpotifyCurrentlyPlaying>(accessToken, "/me/player");
    if (!playback || !playback.item) {
      return NextResponse.json({ noActivePlayback: true });
    }

    const track = playback.item;
    const artistId = track.artists[0].id;

    const [artist, topTracksResponse] = await Promise.all([
      spotifyFetch<SpotifyArtist>(accessToken, `/artists/${artistId}`),
      spotifyFetch<SpotifyTopTracksResponse>(accessToken, `/artists/${artistId}/top-tracks?market=${MARKET}`),
    ]);

    const topGenre = artist?.genres?.[0];

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
      .filter((t) => t.id !== track.id)
      .slice(0, 20);

    const artistRecommendations = dedupeById(genreArtists)
      .filter((a) => a.id !== artistId)
      .slice(0, 9);

    return NextResponse.json({
      currSong: {
        songId: track.id,
        songUri: track.uri,
        songName: track.name,
        songArtist: track.artists.map((a) => a.name).join(", "),
        songArtistId: artistId,
        songPicture: track.album.images[0]?.url ?? null,
        durationMs: track.duration_ms,
        releaseDate: track.album.release_date,
        genres: artist?.genres ?? [],
      },
      songRecommendations,
      artistRecommendations,
      playback: {
        isPlaying: playback.is_playing,
        progressMs: playback.progress_ms ?? 0,
        deviceAvailable: Boolean(playback.device?.id),
      },
    });
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
