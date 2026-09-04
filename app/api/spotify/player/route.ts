import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, spotifyFetch, SpotifyApiError } from "@/lib/spotifyApi";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";

// Resumes or pauses playback on the user's active device. Premium-only on Spotify's
// side — surfaced as a clear error rather than a silent failure.
export async function PUT(req: NextRequest) {
  const accessToken = await getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { isPlaying }: { isPlaying?: boolean } = await req.json();
  if (typeof isPlaying !== "boolean") {
    return NextResponse.json({ error: "isPlaying is required" }, { status: 400 });
  }

  try {
    await spotifyFetch(accessToken, isPlaying ? "/me/player/play" : "/me/player/pause", {
      method: "PUT",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof SpotifyApiError ? error.status : 500;
    let message = getErrorMessage(error) || "Playback failed";
    if (status === 403) {
      message = "Full playback requires Spotify Premium.";
    } else if (status === 404) {
      message = "No active Spotify device found — open Spotify on a device and try again.";
    }
    return NextResponse.json({ error: message }, { status });
  }
}
