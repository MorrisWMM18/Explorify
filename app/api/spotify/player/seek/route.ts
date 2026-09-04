import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, spotifyFetch, SpotifyApiError } from "@/lib/spotifyApi";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";

// Seeks to a position (ms) within the currently playing track on the user's active device.
export async function PUT(req: NextRequest) {
  const accessToken = await getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { positionMs }: { positionMs?: number } = await req.json();
  if (typeof positionMs !== "number") {
    return NextResponse.json({ error: "positionMs is required" }, { status: 400 });
  }

  try {
    await spotifyFetch(accessToken, `/me/player/seek?position_ms=${Math.round(positionMs)}`, {
      method: "PUT",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof SpotifyApiError ? error.status : 500;
    let message = getErrorMessage(error) || "Seek failed";
    if (status === 403) {
      message = "Full playback requires Spotify Premium.";
    } else if (status === 404) {
      message = "No active Spotify device found — open Spotify on a device and try again.";
    }
    return NextResponse.json({ error: message }, { status });
  }
}
