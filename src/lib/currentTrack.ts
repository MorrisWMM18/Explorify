import type { CurrentTrackNoActivePlayback, CurrentTrackResponse, CurrentTrackSuccess } from "@/types/spotify";

// Fetches "what's playing right now" from our own current-track route. Shared by
// NowPlayingCard's mount effect, its 5s playback resync, and TransportControls'
// post-skip refetch.
// Throws on the error case, so the resolved value already excludes it — callers keep
// narrowing with `"noActivePlayback" in data` only, same as the pre-extraction inline code.
export async function fetchCurrentTrack(): Promise<CurrentTrackSuccess | CurrentTrackNoActivePlayback> {
  const response = await fetch("/api/spotify/current-track");
  const data: CurrentTrackResponse = await response.json();

  if (!response.ok || "error" in data) {
    throw new Error("error" in data ? data.error : "Something went wrong, please try again.");
  }

  return data;
}
