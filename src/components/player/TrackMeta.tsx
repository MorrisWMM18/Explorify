import { formatDuration } from "@/lib/format";
import type { CurrSong } from "@/types/spotify";

import TrackActionsMenu from "../songs/TrackActionsMenu";

interface TrackMetaProps {
  currSong: CurrSong;
}

/**
 * Now Playing label, title and artist, plus the track's `…` menu. Split from
 * TrackDetails because the mobile layout slots the progress bar and transport
 * controls between the two.
 */
export function TrackHeading({ currSong }: TrackMetaProps) {
  return (
    <div className="fade-up px-10 text-center md:px-0 md:pr-10 md:text-left">
      <div className="relative mb-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Now Playing</p>
        {currSong.songId && (
          <TrackActionsMenu
            trackUri={currSong.songUri}
            trackName={currSong.songName}
            artistName={currSong.songArtist}
            artistId={currSong.songArtistId || null}
            className="absolute -right-10 top-1/2 -translate-y-1/2 text-ink-3 hover:bg-glass-hover"
          />
        )}
      </div>
      <h1 className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] md:text-[34px]">
        {currSong.songName}
      </h1>
      <p className="mt-2 text-base">{currSong.songArtist}</p>
    </div>
  );
}

const detailCardClass = "rounded-row border border-hairline-hi bg-glass px-[18px] py-3.5";

/** The track's metadata, one small card per field. */
export function TrackDetails({ currSong }: TrackMetaProps) {
  return (
    <div className="fade-up grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className={`${detailCardClass} md:col-span-full`}>
        <p className="text-[13px] text-ink-4">Album</p>
        <p className="mt-1 text-[15px] font-medium text-ink-2">
          {currSong.albumName || "Unknown"}
        </p>
      </div>

      <div className={`${detailCardClass} md:col-span-full`}>
        <p className="text-[13px] text-ink-4">Playing On</p>
        <p className="mt-1 text-[15px] font-medium text-ink-2">
          {[currSong.deviceName, currSong.deviceType].filter(Boolean).join(" · ") || "Unknown"}
        </p>
      </div>

      <div className={detailCardClass}>
        <p className="text-[13px] text-ink-4">Release Date</p>
        <p className="mt-1 text-[15px] font-medium text-ink-2">
          {currSong.releaseDate || "Unknown"}
        </p>
      </div>

      <div className={detailCardClass}>
        <p className="text-[13px] text-ink-4">Duration</p>
        <p className="mt-1 text-[15px] font-medium text-ink-2">
          {formatDuration(currSong.durationMs)}
        </p>
      </div>
    </div>
  );
}
