import { spotifyFetch, SpotifyApiError } from "@/lib/spotifyApi";
import { getErrorMessage } from "@/lib/errors";
import type { SpotifyArtist } from "@/types/spotify";

const GENRE_CACHE_TTL_MS = 10 * 60_000; // TODO: Move this to project-wide env variable
const genreCache = new Map<string, { genres: string[]; cachedAt: number }>();

export async function getArtistGenres(accessToken: string, artistId: string): Promise<string[]> {
  const cached = genreCache.get(artistId);
  if (cached && Date.now() - cached.cachedAt < GENRE_CACHE_TTL_MS) return cached.genres;

  try {
    const artist = await spotifyFetch<SpotifyArtist>(accessToken, `/artists/${artistId}`);
    const genres = artist?.genres ?? [];
    genreCache.set(artistId, { genres, cachedAt: Date.now() });
    return genres;
  } catch (error) {
    const status = error instanceof SpotifyApiError ? error.status : 500;
    console.error(
      "[getArtistGenres]",
      status,
      error instanceof SpotifyApiError ? error.path : undefined,
      getErrorMessage(error),
      error instanceof SpotifyApiError ? error.rawBody : undefined
    );
    return [];
  }
}
