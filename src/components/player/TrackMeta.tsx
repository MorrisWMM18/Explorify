import { formatDuration } from "@/lib/format";
import type { CurrSong } from "@/types/spotify";

interface TrackMetaProps {
  currSong: CurrSong;
}

/** Right-hand column of the Now Playing card: title and track metadata. */
function TrackMeta({ currSong }: TrackMetaProps) {
  return (
    <div className="fade-up flex flex-col gap-6">
      {/* Song name + Artist */}
      <div>
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em]">
          Now Playing
        </p>
        <h1 className="font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.01em]">
          {currSong.songName}
        </h1>
        <p className="mt-2 text-base">{currSong.songArtist}</p>
      </div>

      <hr className="h-px border-0" />

      {/* Song metadata */}
      <div className="grid grid-cols-2 gap-6">
        <div className="col-span-full">
          <p className="mb-1.5 text-[13px]">Album</p>
          <p className="text-sm">{currSong.albumName || "Unknown"}</p>
        </div>

        <div className="col-span-full">
          <p className="mb-1.5 text-[13px]">Playing On</p>
          <p className="text-sm">
            {[currSong.deviceName, currSong.deviceType].filter(Boolean).join(" · ") || "Unknown"}
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-[13px]">Release Date</p>
          <p className="text-sm">{currSong.releaseDate || "Unknown"}</p>
        </div>

        <div>
          <p className="mb-1.5 text-[13px]">Duration</p>
          <p className="text-sm">{formatDuration(currSong.durationMs)}</p>
        </div>
      </div>
    </div>
  );
}

export default TrackMeta;
