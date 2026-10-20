import type {
  LastfmErrorResponse,
  LastfmSimilarArtist,
  LastfmSimilarArtistsResponse,
  LastfmSimilarTrack,
  LastfmSimilarTracksResponse,
  LastfmTopTrack,
  LastfmTopTracksResponse,
} from "@/types/lastfm";

const LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/";

// Last.fm asks every client to identify itself with a User-Agent.
const USER_AGENT = "Explorify/0.1";

// Last.fm error 6: what it returns for an artist or track it doesn't know.
const LASTFM_NOT_FOUND = 6;

export class LastfmApiError extends Error {
  status: number;
  code?: number;

  constructor(message: string, status: number, { code }: { code?: number } = {}) {
    super(message);
    this.name = "LastfmApiError";
    this.status = status;
    this.code = code;
  }
}

// Shared request path for every Last.fm method. Returns null for error 6 (unknown
// artist/track), since "Last.fm has no data" isn't a failure.
async function lastfmFetch<T>(params: Record<string, string>): Promise<T | null> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    throw new LastfmApiError("Last.fm API key is not configured (LASTFM_API_KEY).", 500);
  }

  const query = new URLSearchParams({ ...params, api_key: apiKey, format: "json" });
  const response = await fetch(`${LASTFM_API_BASE}?${query}`, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });

  let body: (T & Partial<LastfmErrorResponse>) | null = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (body?.error === LASTFM_NOT_FOUND) return null;

  if (!response.ok || !body || body.error) {
    throw new LastfmApiError(
      body?.message || `Last.fm API error ${response.status}`,
      response.ok ? 502 : response.status,
      { code: body?.error }
    );
  }

  return body;
}

// Only names are sent to Last.fm — never Spotify ids or URIs.
export async function getSimilarTracks(
  artist: string,
  track: string,
  limit: number
): Promise<LastfmSimilarTrack[]> {
  const body = await lastfmFetch<LastfmSimilarTracksResponse>({
    method: "track.getsimilar",
    artist,
    track,
    autocorrect: "1",
    limit: String(limit),
  });
  return body?.similartracks?.track ?? [];
}

export async function getSimilarArtists(artist: string, limit: number): Promise<LastfmSimilarArtist[]> {
  const body = await lastfmFetch<LastfmSimilarArtistsResponse>({
    method: "artist.getsimilar",
    artist,
    autocorrect: "1",
    limit: String(limit),
  });
  return body?.similarartists?.artist ?? [];
}

export async function getArtistTopTracks(artist: string, limit: number): Promise<LastfmTopTrack[]> {
  const body = await lastfmFetch<LastfmTopTracksResponse>({
    method: "artist.gettoptracks",
    artist,
    autocorrect: "1",
    limit: String(limit),
  });
  return body?.toptracks?.track ?? [];
}
