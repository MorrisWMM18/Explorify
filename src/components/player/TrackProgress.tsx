"use client";

import { useEffect, useState } from "react";
import { Slider, SliderFill, SliderThumb, SliderTrack } from "react-aria-components";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectSong,
  selectPlayback,
  selectControlsDisabled,
  setLocalPlaybackProgress,
  setDeviceAvailable,
  setPremiumRequired,
} from "@/store/songSlice";
import { formatDuration } from "@/lib/format";

// currSong is null until the mount-time current-track fetch resolves (or nothing's
// playing) — fall back to a placeholder so the bar never renders as an empty 0:00 track.
const PLACEHOLDER_DURATION_MS = 210_000; // 3:30

/**
 * Real scrubber beneath the transport row. Ticks a live position between
 * authoritative resyncs (see `usePlaybackSync`), and seeking on
 * release calls Spotify directly. No network traffic while dragging.
 */
function TrackProgress() {
  const dispatch = useAppDispatch();
  const currSong = useAppSelector(selectSong);
  const playback = useAppSelector(selectPlayback);
  const controlsDisabled = useAppSelector(selectControlsDisabled);
  const durationMs = currSong?.durationMs || PLACEHOLDER_DURATION_MS;

  const [isDragging, setIsDragging] = useState(false);
  const [displayMs, setDisplayMs] = useState(0);

  useEffect(() => {
    if (isDragging) return;

    function tick() {
      if (!playback) {
        setDisplayMs(0);
        return;
      }
      const elapsed = playback.isPlaying ? Date.now() - playback.lastSyncedAt : 0;
      setDisplayMs(Math.min(playback.progressMs + elapsed, durationMs));
    }

    tick();

    if (!playback?.isPlaying) return;

    const intervalId = setInterval(tick, 250);
    return () => clearInterval(intervalId);
  }, [playback, isDragging, durationMs]);

  async function handleSeekEnd(value: number) {
    // Optimistic — dispatch before the network call so the bar doesn't snap back
    // mid-flight, and resume ticking immediately from the new position.
    dispatch(setLocalPlaybackProgress({ progressMs: value, lastSyncedAt: Date.now() }));
    setIsDragging(false);

    try {
      const response = await fetch("/api/spotify/player/seek", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionMs: Math.round(value) }),
      });

      if (!response.ok) {
        const data: { error?: string } = await response.json().catch(() => ({}));
        if (response.status === 403) {
          dispatch(setPremiumRequired(true));
        } else if (response.status === 404) {
          dispatch(setDeviceAvailable(false));
        } else {
          console.error("[TrackProgress] seek failed", response.status, data.error);
        }
        // Deliberately not reverting the optimistic position — a few seconds of
        // drift until the next resync is less jarring than the bar snapping back.
      } else if (playback?.premiumRequired) {
        dispatch(setPremiumRequired(false));
      }
    } catch (err) {
      console.error("[TrackProgress] seek failed", err);
    }
  }

  return (
    <Slider
      value={displayMs}
      onChange={(value) => {
        setIsDragging(true);
        setDisplayMs(value);
      }}
      onChangeEnd={handleSeekEnd}
      minValue={0}
      maxValue={durationMs}
      step={1000}
      isDisabled={controlsDisabled}
      aria-label="Seek"
      className="flex flex-col gap-1.5"
    >
      <SliderTrack className="h-[5px] rounded-full bg-divider">
        <SliderFill className="h-full rounded-full accent-gloss" />
        <SliderThumb className="top-1/2 size-3 rounded-full bg-accent shadow-control dragging:scale-110" />
      </SliderTrack>

      <div className="flex items-center justify-between text-xs text-ink-4">
        <span>{formatDuration(displayMs)}</span>
        <span>-{formatDuration(durationMs - displayMs)}</span>
      </div>
    </Slider>
  );
}

export default TrackProgress;
