"use client";

import { useAppSelector } from "@/store/hooks";
import { selectSong, selectSongRecommendations } from "@/store/songSlice";

import GlassPanel from "../ui/GlassPanel";
import SongRow from "./SongRow";

function RecommendedSongs() {
  const songRecommendations = useAppSelector(selectSongRecommendations);
  const currSong = useAppSelector(selectSong);

  return (
    <section>
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="font-display text-[22px] font-semibold">Recommended for you</h2>
        {currSong && <p className="text-[13px]">Based on {currSong.songName}</p>}
      </div>

      <GlassPanel radius="panel" className="flex flex-col p-2.5">
        {songRecommendations.length > 0 ? (
          songRecommendations.map((track) => <SongRow key={track.id} track={track} />)
        ) : (
          <p className="p-6 text-center text-sm">
            Hit Discover to see songs picked from what you&apos;re listening to.
          </p>
        )}
      </GlassPanel>
    </section>
  );
}

export default RecommendedSongs;
