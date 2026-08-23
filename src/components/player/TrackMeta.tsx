import { formatDuration } from "@/lib/format";
import type { CurrSong, SongAnalysis } from "@/types/spotify";

interface TrackMetaProps {
  currSong: CurrSong;
  songAnalysis: SongAnalysis;
}

/** Right-hand column of the Now Playing card: title and track metadata. */
function TrackMeta({ currSong, songAnalysis }: TrackMetaProps) {
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

      {/* Song popularity - TODO: Figure if we need to replace this */}
      <div>
        <p className="mb-2 text-[13px]">Popularity</p>
        <div
          className="h-[7px] max-w-[320px] overflow-hidden rounded-[4px]"
          role="progressbar"
          aria-label="Popularity"
          aria-valuenow={songAnalysis.popularity}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-[4px]"
            style={{ width: `${songAnalysis.popularity}%` }}
          />
        </div>
      </div>

      {/* Song metadata */}
      <div className="grid grid-cols-2 gap-6">
        <div className="col-span-full">
          <p className="mb-2 text-[13px]">Genres</p>
          {songAnalysis.genres.length > 0 ? (
            <ul className="flex list-none flex-wrap gap-[7px] p-0">
              {songAnalysis.genres.map((genre) => (
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
          <p className="text-sm">{songAnalysis.releaseDate || "Unknown"}</p>
        </div>

        <div>
          <p className="mb-1.5 text-[13px]">Duration</p>
          <p className="text-sm">{formatDuration(songAnalysis.durationMs)}</p>
        </div>

        {songAnalysis.explicit && (
          <div className="col-span-full">
            <span className="rounded-[4px] px-2.5 py-[3px] text-xs tracking-widest">
              EXPLICIT
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default TrackMeta;
