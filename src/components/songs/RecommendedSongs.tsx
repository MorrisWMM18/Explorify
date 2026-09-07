"use client";

import { Fragment } from "react";

import { useAppSelector } from "@/store/hooks";
import { selectSong, selectSongRecommendations } from "@/store/songSlice";

import GlassPanel from "../ui/GlassPanel";
import SongRow from "./SongRow";

// Rows cascade in rather than landing at once. Capped so the tail stays under
// ~320ms however many recommendations discover returns.
const STAGGER_MS = 40;
const MAX_STAGGERED_ROWS = 8;

function RecommendedSongs() {
  const songRecommendations = useAppSelector(selectSongRecommendations);
  const currSong = useAppSelector(selectSong);

  // Derived from list *content*, not the array reference: a re-discover that
  // returns the same tracks shouldn’t re-flash, a different set should.
  const listKey = songRecommendations.map((track) => track.id).join("-");

  return (
    <section>
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="font-display text-[22px] font-semibold">Recommended for you</h2>
        {currSong && <p className="text-[13px]">Based on {currSong.songName}</p>}
      </div>

      <GlassPanel radius="panel" className="flex flex-col p-2.5">
        {songRecommendations.length > 0 ? (
          // A keyed fragment remounts the whole list, so rows that survived the
          // refresh re-animate alongside the new ones — and adds no DOM node.
          <Fragment key={listKey}>
            {songRecommendations.map((track, index) => (
              <SongRow
                key={track.id}
                track={track}
                enterDelayMs={Math.min(index, MAX_STAGGERED_ROWS) * STAGGER_MS}
              />
            ))}
          </Fragment>
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
