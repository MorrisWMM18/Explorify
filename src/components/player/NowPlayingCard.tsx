"use client";

import { useEffect, useState } from "react";

import {
  selectSong,
  selectNoActivePlayback,
  updateDiscoverResults,
  setNoActivePlayback,
  setCurrSong,
} from "@/store/songSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getErrorMessage } from "@/lib/errors";
import type { CurrentTrackResponse, DiscoverResponse } from "@/types/spotify";

import GlassPanel from "../ui/GlassPanel";
import AlbumArt from "./AlbumArt";
import TrackMeta from "./TrackMeta";
import DiscoverButton from "./DiscoverButton";
import TransportControls from "./TransportControls";
import TrackProgress from "./TrackProgress";

function NowPlayingCard() {
  const dispatch = useAppDispatch();
  const currSong = useAppSelector(selectSong);
  const noActivePlayback = useAppSelector(selectNoActivePlayback);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getCurrPlaying() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/spotify/discover", { method: "POST" });
      const data: DiscoverResponse = await response.json();

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "Something went wrong, please try again."
        );
      }

      if ("noActivePlayback" in data) {
        dispatch(setNoActivePlayback());
      } else {
        dispatch(updateDiscoverResults(data));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentTrack() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/spotify/current-track");
        const data: CurrentTrackResponse = await response.json();

        if (!response.ok || "error" in data) {
          throw new Error(
            "error" in data ? data.error : "Something went wrong, please try again."
          );
        }

        if (cancelled) return;

        if ("noActivePlayback" in data) {
          dispatch(setNoActivePlayback());
        } else {
          dispatch(setCurrSong(data.currSong));
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCurrentTrack();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return (
    <section className="flex flex-col gap-5">
      <GlassPanel radius="card" className="grid grid-cols-[300px_1fr] gap-11 p-9">
        <div className="flex flex-col gap-[22px]">
          <AlbumArt src={currSong?.songPicture ?? null} songName={currSong?.songName ?? null} />
          <TransportControls />
          <TrackProgress />
        </div>

        {currSong ? (
          <TrackMeta currSong={currSong} />
        ) : (
          <div className="flex flex-col justify-center gap-2">
            <h1 className="font-display text-[34px] font-semibold leading-[1.1]">
              Welcome to Explorify
            </h1>
            <p className="text-base">
              Play something on Spotify, then hit Discover to find your next song.
            </p>
          </div>
        )}
      </GlassPanel>

      <DiscoverButton
        onDiscover={getCurrPlaying}
        loading={loading}
        noActivePlayback={noActivePlayback}
        error={error}
      />
    </section>
  );
}

export default NowPlayingCard;
