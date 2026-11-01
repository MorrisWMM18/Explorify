import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, spotifyFetch, SpotifyApiError } from "@/lib/spotifyApi";
import { getErrorMessage } from "@/lib/errors";
import type { SpotifyCurrentlyPlaying } from "@/types/spotify";

export const runtime = "nodejs";

// Starts full-track playback on the user's active device (the "Airplay" button).
// Premium-only on Spotify's side — surfaced as a clear error rather than a silent failure.
export async function PUT(req: NextRequest) {
  const accessToken = await getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { trackUri, albumUri }: { trackUri?: string; albumUri?: string } = await req.json();
  if (!trackUri) {
    return NextResponse.json({ error: "trackUri is required" }, { status: 400 });
  }

  try {
    // Name the active device explicitly rather than letting Spotify pick one: an untargeted
    // play-with-uris command was observed to stop playback on the Spotify mobile app.
    const player = await spotifyFetch<SpotifyCurrentlyPlaying>(accessToken, "/me/player");
    const deviceId = player?.device?.id;
    const query = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";

    // Play the track within its album (as Spotify's own apps do) rather than as a lone
    // uri: the iPhone app was observed to drop a bare `uris` play.
    const body = albumUri
      ? { context_uri: albumUri, offset: { uri: trackUri }, position_ms: 0 }
      : { uris: [trackUri], position_ms: 0 };

    await spotifyFetch(accessToken, `/me/player/play${query}`, {
      method: "PUT",
      body: JSON.stringify(body),
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
