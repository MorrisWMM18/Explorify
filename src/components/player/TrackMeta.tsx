import { formatDuration } from "@/lib/format";
import type { CurrSong } from "@/types/spotify";

interface TrackMetaProps {
  currSong: CurrSong;
}

/** Right-hand column of the Now Playing card: title and track metadata. */
function TrackMeta({ currSong }: TrackMetaProps) {
  return (
    <div className="flex flex-col gap-6">
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
          <p className="mb-2 text-[13px]">Genres</p>
          {currSong.genres.length > 0 ? (
            <ul className="flex list-none flex-wrap gap-[7px] p-0">
              {currSong.genres.map((genre) => (
                <li
                  key={genre}
                  className="rounded-full border border-hairline-hi bg-glass px-3 py-1.5 text-xs text-ink-2 shadow-control"
                >
                  {genre}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">Unknown</p>
          )}
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
