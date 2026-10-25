import { spotifyFetch, SpotifyApiError } from "@/lib/spotifyApi";
import { getErrorMessage } from "@/lib/errors";
import type {
  SpotifyArtist,
  SpotifySearchArtistsResponse,
  SpotifySearchTracksResponse,
  SpotifyTrack,
} from "@/types/spotify";

const MARKET = "US";
const SEARCH_LIMIT = 5; // Spotify caps search at 10

function normalise(name: string): string {
  return name.trim().toLowerCase();
}

// Turns a Last.fm (artist, track) name pair into a Spotify track. Only accepts a
// result whose artist name matches, so karaoke/tribute uploads are dropped
// rather than guessed. Best-effort: any failure resolves to null.
export async function resolveSpotifyTrack(
  accessToken: string,
  artist: string,
  track: string
): Promise<SpotifyTrack | null> {
  const query = encodeURIComponent(`track:"${track}" artist:"${artist}"`);

  try {
    const response = await spotifyFetch<SpotifySearchTracksResponse>(
      accessToken,
      `/search?q=${query}&type=track&market=${MARKET}&limit=${SEARCH_LIMIT}`
    );
    const wanted = normalise(artist);
    return (
      response?.tracks?.items?.find((item) =>
        item.artists.some((a) => normalise(a.name) === wanted)
      ) ?? null
    );
  } catch (error) {
    const status = error instanceof SpotifyApiError ? error.status : 500;
    console.error(
      "[resolveSpotifyTrack]",
      status,
      error instanceof SpotifyApiError ? error.path : undefined,
      getErrorMessage(error),
      error instanceof SpotifyApiError ? error.rawBody : undefined
    );
    return null;
  }
}

// Same idea for a Last.fm artist name: only an exact (normalised) name match is
// accepted. Best-effort: any failure resolves to null.
export async function resolveSpotifyArtist(
  accessToken: string,
  artist: string
): Promise<SpotifyArtist | null> {
  const query = encodeURIComponent(`artist:"${artist}"`);

  try {
    const response = await spotifyFetch<SpotifySearchArtistsResponse>(
      accessToken,
      `/search?q=${query}&type=artist&limit=${SEARCH_LIMIT}`
    );
    const wanted = normalise(artist);
    return response?.artists?.items?.find((item) => normalise(item.name) === wanted) ?? null;
  } catch (error) {
    const status = error instanceof SpotifyApiError ? error.status : 500;
    console.error(
      "[resolveSpotifyArtist]",
      status,
      error instanceof SpotifyApiError ? error.path : undefined,
      getErrorMessage(error),
      error instanceof SpotifyApiError ? error.rawBody : undefined
    );
    return null;
  }
}
