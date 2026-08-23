// TODO: Implement the backend logic for this.
"use client";

import { useState } from "react";
import { Slider, SliderFill, SliderThumb, SliderTrack } from "react-aria-components";

import { useAppSelector } from "@/store/hooks";
import { selectSongAnalysis } from "@/store/songSlice";
import { formatDuration } from "@/lib/format";

// songAnalysis.durationMs is 0 until Discover is pressed (see NowPlayingCard) —
// fall back to a placeholder so the bar never renders as an empty 0:00 track.
const PLACEHOLDER_DURATION_MS = 210_000; // 3:30

/**
 * Dummy scrubber beneath the transport row. Local state only — dragging the
 * thumb updates the elapsed/remaining labels but sends nothing to Spotify.
 */
function TrackProgress() {
  const songAnalysis = useAppSelector(selectSongAnalysis);
  const durationMs = songAnalysis.durationMs || PLACEHOLDER_DURATION_MS;

  const [position, setPosition] = useState(0);

  return (
    <Slider
      value={position}
      onChange={setPosition}
      minValue={0}
      maxValue={durationMs}
      step={1000}
      aria-label="Seek"
      className="flex flex-col gap-1.5"
    >
      <SliderTrack className="h-[5px] rounded-full bg-divider">
        <SliderFill className="h-full rounded-full accent-gloss" />
        <SliderThumb className="size-3 rounded-full bg-accent shadow-control dragging:scale-110" />
      </SliderTrack>

      <div className="flex items-center justify-between text-xs text-ink-4">
        <span>{formatDuration(position)}</span>
        <span>-{formatDuration(durationMs - position)}</span>
      </div>
    </Slider>
  );
}

export default TrackProgress;
