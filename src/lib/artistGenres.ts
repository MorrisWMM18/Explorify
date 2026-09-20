import { spotifyFetch } from "@/lib/spotifyApi";
import type { SpotifyArtist } from "@/types/spotify";

// Genres come from a separate /artists/{id} lookup, and both callers want them for
// the same small set of artists: /current-track polls every 5s, and /discover seeds
// its genre search from whatever is playing. One module-level cache shared by both
// keeps a steady poll down to roughly one Spotify call per tick, and usually makes
// discover's lookup a hit because the poll just warmed it. Genres aren't
// user-specific, so the cache isn't either.
const GENRE_CACHE_TTL_MS = 10 * 60_000;
const genreCache = new Map<string, { genres: string[]; cachedAt: number }>();

export async function getArtistGenres(accessToken: string, artistId: string): Promise<string[]> {
  const cached = genreCache.get(artistId);
  if (cached && Date.now() - cached.cachedAt < GENRE_CACHE_TTL_MS) return cached.genres;

  try {
    const artist = await spotifyFetch<SpotifyArtist>(accessToken, `/artists/${artistId}`);
    const genres = artist?.genres ?? [];
    genreCache.set(artistId, { genres, cachedAt: Date.now() });
    return genres;
  } catch {
    // Best-effort: callers degrade to no genres rather than failing the whole
    // request. Not cached, so the next call retries.
    return [];
  }
}
