import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, spotifyFetch, SpotifyApiError } from "@/lib/spotifyApi";
import { getErrorMessage } from "@/lib/errors";
import type {
  ArtistDetailResponse,
  SpotifyArtist,
  SpotifyTopTracksResponse,
} from "@/types/spotify";

const MARKET = "US";

export async function GET(
  req: NextRequest,
  { params }: { params: { artistId: string } }
): Promise<NextResponse<ArtistDetailResponse>> {
  const accessToken = await getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { artistId } = params;

  try {
    // Both endpoints are still available post-deprecation — unlike
    // /related-artists, which 403s for this app.
    const [artist, topTracks] = await Promise.all([
      spotifyFetch<SpotifyArtist>(accessToken, `/artists/${artistId}`),
      spotifyFetch<SpotifyTopTracksResponse>(
        accessToken,
        `/artists/${artistId}/top-tracks?market=${MARKET}`
      ),
    ]);

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    return NextResponse.json({
      artist,
      topTracks: topTracks?.tracks ?? [],
    });
  } catch (error) {
    const status = error instanceof SpotifyApiError ? error.status : 500;
    const message =
      status === 429
        ? "Spotify is rate-limiting requests right now — try again in a moment."
        : getErrorMessage(error) || "Failed to load artist";
    console.error(
      "[/api/spotify/artists/[artistId]]",
      status,
      error instanceof SpotifyApiError ? error.path : undefined,
      message,
      error instanceof SpotifyApiError ? error.rawBody : undefined
    );
    return NextResponse.json({ error: message }, { status });
  }
}

export const runtime = "nodejs";
