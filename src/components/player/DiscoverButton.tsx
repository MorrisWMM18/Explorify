"use client";

import PillButton from "../ui/PillButton";

interface DiscoverButtonProps {
  onDiscover: () => void;
  loading: boolean;
  noActivePlayback: boolean;
  error: string | null;
}

function DiscoverButton({
  onDiscover,
  loading,
  noActivePlayback,
  error,
}: DiscoverButtonProps) {
  return (
    <div className="flex flex-col items-start gap-4">
      <PillButton onPress={onDiscover} isDisabled={loading} className="px-[30px] py-3.5">
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
