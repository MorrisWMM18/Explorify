import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, spotifyFetch, SpotifyApiError } from "@/lib/spotifyApi";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";

// Skips to the next or previous track on the user's active device.
export async function POST(req: NextRequest) {
  const accessToken = await getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { direction }: { direction?: "next" | "previous" } = await req.json();
  if (direction !== "next" && direction !== "previous") {
    return NextResponse.json({ error: "direction must be 'next' or 'previous'" }, { status: 400 });
  }

  try {
    await spotifyFetch(accessToken, `/me/player/${direction}`, {
      method: "POST",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof SpotifyApiError ? error.status : 500;
    let message = getErrorMessage(error) || "Skip failed";
    if (status === 403) {
      message = "Full playback requires Spotify Premium.";
    } else if (status === 404) {
      message = "No active Spotify device found — open Spotify on a device and try again.";
    }
    return NextResponse.json({ error: message }, { status });
  }
}
