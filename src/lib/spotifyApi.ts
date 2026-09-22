import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export class SpotifyApiError extends Error {
  status: number;
  path?: string;
  rawBody?: string;

  constructor(
    message: string,
    status: number,
    { path, rawBody }: { path?: string; rawBody?: string } = {}
  ) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
    this.path = path;
    this.rawBody = rawBody;
  }
}

// Server-only: decrypts the httpOnly session cookie directly, bypassing the public
// /api/auth/session endpoint, so the raw Spotify access token never has to be
// forwarded through anything the browser can inspect.
export async function getAccessToken(req: NextRequest): Promise<string | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.error || !token.accessToken) return null;
  return token.accessToken;
}

// Like getAccessToken, but also returns the Spotify user id — needed by routes that
// build /users/{id}/... paths or filter by playlist ownership.
export async function getSpotifySession(
  req: NextRequest
): Promise<{ accessToken: string; spotifyId: string } | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.error || !token.accessToken) return null;
  return { accessToken: token.accessToken, spotifyId: token.spotifyId };
}

// Only function to interact with Spotify API
export async function spotifyFetch<T = unknown>(
  accessToken: string,
  path: string,
  init: RequestInit = {}
): Promise<T | null> {
  const response = await fetch(`${SPOTIFY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (response.status === 204) return null;

  // Read as text first so a non-JSON error response (HTML block page, empty body,
  // etc.) is still visible in the thrown error instead of silently becoming null.
  const rawText = await response.text();
  let body: any = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new SpotifyApiError(body?.error?.message || `Spotify API error ${response.status}`, response.status, {
      path,
      rawBody: body ? undefined : rawText.slice(0, 500),
    });
  }

  return body;
}
