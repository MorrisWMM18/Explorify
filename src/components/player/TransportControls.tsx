// TODO: Implement the backend logic for this.
"use client";

import { useState } from "react";

import IconButton from "../ui/IconButton";

// TODO: Implement backend logic for this.
/**
 * Dummy transport row beneath the album art: play/pause toggles a local icon,
 * prev/next are no-ops. Nothing here calls the Spotify API or touches Redux.
 */
function TransportControls() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="flex items-center justify-center gap-5">
      <IconButton aria-label="Previous track" size="sm" className="text-ink-2">
        <span aria-hidden="true" className="flex items-center">
          <span className="h-2.5 w-[3px] rounded-[1px] bg-current" />
          <span className="size-0 border-y-[5px] border-r-[8px] border-y-transparent" />
        </span>
      </IconButton>

      <IconButton
        aria-label={isPlaying ? "Pause" : "Play"}
        size="lg"
        className="glass-panel hover:bg-glass-hover"
        onPress={() => setIsPlaying((playing) => !playing)}
      >
        {isPlaying ? (
          <span aria-hidden="true" className="flex gap-[3px]">
            <span className="h-2.5 w-[3px] rounded-[1px] bg-current" />
            <span className="h-2.5 w-[3px] rounded-[1px] bg-current" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="ml-0.5 size-0 border-y-[5px] border-l-[8px] border-y-transparent"
          />
        )}
      </IconButton>

      <IconButton aria-label="Next track" size="sm" className="text-ink-2">
        <span aria-hidden="true" className="flex items-center">
          <span className="size-0 border-y-[5px] border-l-[8px] border-y-transparent" />
          <span className="h-2.5 w-[3px] rounded-[1px] bg-current" />
        </span>
      </IconButton>
    </div>
  );
}

export default TransportControls;
