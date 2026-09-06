import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, spotifyFetch, SpotifyApiError } from "@/lib/spotifyApi";
import { getErrorMessage } from "@/lib/errors";
import type { CurrentTrackResponse, SpotifyArtist, SpotifyCurrentlyPlaying } from "@/types/spotify";

export const runtime = "nodejs";

// This route is polled every 5s by usePlaybackSync, and genres only come from a
// separate artist lookup. Memoize per artist so a steady poll doesn't re-fetch
// near-static data — genres aren't user-specific, so the cache isn't either.
const GENRE_CACHE_TTL_MS = 10 * 60_000;
const genreCache = new Map<string, { genres: string[]; cachedAt: number }>();

async function getArtistGenres(accessToken: string, artistId: string): Promise<string[]> {
  const cached = genreCache.get(artistId);
  if (cached && Date.now() - cached.cachedAt < GENRE_CACHE_TTL_MS) return cached.genres;

  try {
    const artist = await spotifyFetch<SpotifyArtist>(accessToken, `/artists/${artistId}`);
    const genres = artist?.genres ?? [];
    genreCache.set(artistId, { genres, cachedAt: Date.now() });
    return genres;
  } catch {
    // Best-effort: this route runs on every poll, not only on a user-initiated
    // click, so a failed lookup degrades to no genres rather than failing the
    // whole request. Not cached, so the next poll retries.
    return [];
  }
}

export async function GET(req: NextRequest): Promise<NextResponse<CurrentTrackResponse>> {
  const accessToken = await getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const playback = await spotifyFetch<SpotifyCurrentlyPlaying>(accessToken, "/me/player");
    if (!playback || !playback.item) {
      return NextResponse.json({ noActivePlayback: true });
    }

    // Throw an error if the current playback isn't a track (e.g. podcast, audiobook)
    if (playback.currently_playing_type !== "track") {
      return NextResponse.json({
        error: "Explorify doesn't support podcasts yet — play a song and try again!",
      });
    }

    const track = playback.item;
    const artistId = track.artists[0].id;

    const genres = await getArtistGenres(accessToken, artistId);

    return NextResponse.json({
      currSong: {
        songId: track.id,
        songUri: track.uri,
        songName: track.name,
        songArtist: track.artists.map((artist) => artist.name).join(", "),
        songArtistId: artistId,
        songPicture: track.album.images[0]?.url ?? null,
        durationMs: track.duration_ms,
        releaseDate: track.album.release_date,
        genres,
      },
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
        : getErrorMessage(error) || "Failed to load current track";
    console.error(
      "[/api/spotify/current-track]",
      status,
      error instanceof SpotifyApiError ? error.path : undefined,
      message,
      error instanceof SpotifyApiError ? error.rawBody : undefined
    );
    return NextResponse.json({ error: message }, { status });
  }
}
