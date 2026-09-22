import type { CurrentTrackNoActivePlayback, CurrentTrackResponse, CurrentTrackSuccess } from "@/types/spotify";

// Fetches "what's playing right now" from our own current-track route. Called by
// the `syncNowPlaying` thunk, which is the single owner of the dispatches that
// follow (mount, 5s poll, end-of-track trigger, post-skip retry).
export async function fetchCurrentTrack(): Promise<CurrentTrackSuccess | CurrentTrackNoActivePlayback> {
  const response = await fetch("/api/spotify/current-track");
  const data: CurrentTrackResponse = await response.json();

  if (!response.ok || "error" in data) {
    throw new Error("error" in data ? data.error : "Something went wrong, please try again.");
  }

  return data;
}
