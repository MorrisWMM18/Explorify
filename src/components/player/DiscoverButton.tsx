"use client";

import PillButton from "../ui/PillButton";

interface DiscoverButtonProps {
  onDiscover: () => void;
  loading: boolean;
  // False until the first playback sync resolves. Discover seeds itself from the
  // synced track, so there is nothing to ask for until one exists.
  ready: boolean;
  noActivePlayback: boolean;
  error: string | null;
}

function DiscoverButton({
  onDiscover,
  loading,
  ready,
  noActivePlayback,
  error,
}: DiscoverButtonProps) {
  return (
    <div className="flex flex-col items-start gap-4">
      <PillButton
        onPress={onDiscover}
        isDisabled={loading || !ready}
        className="px-[30px] py-3.5"
      >
        {loading ? "Loading…" : "Discover new songs"}
      </PillButton>

      {noActivePlayback && (
        <p role="status" className="text-sm">
          Nothing is playing right now — start a song on Spotify and try again.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

export default DiscoverButton;
