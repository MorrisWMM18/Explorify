"use client";

import { useEffect, useRef, useState } from "react";

import {
  selectSong,
  selectSongRecommendations,
  selectNoActivePlayback,
  updateDiscoverResults,
  setNoActivePlayback,
  setPlaybackState,
} from "@/store/songSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { usePlaybackSync } from "@/hooks/usePlaybackSync";
import { getErrorMessage } from "@/lib/errors";
import type { DiscoverResponse } from "@/types/spotify";

import GlassPanel from "../ui/GlassPanel";
import AlbumArt from "./AlbumArt";
import TrackMeta from "./TrackMeta";
import DiscoverButton from "./DiscoverButton";
import TransportControls from "./TransportControls";
import TrackProgress from "./TrackProgress";

function NowPlayingCard() {
  const dispatch = useAppDispatch();
  const currSong = useAppSelector(selectSong);
  const songRecommendations = useAppSelector(selectSongRecommendations);
  const noActivePlayback = useAppSelector(selectNoActivePlayback);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keeps current track in sync with the real player: mount fetch, 5s poll,
  // end-of-track trigger and refocus resync all live in here.
  usePlaybackSync();

  const previousSongIdRef = useRef<string | null>(null);
  const discoverInFlightRef = useRef(false);
  const pendingRediscoverRef = useRef(false);

  async function runDiscover({ auto = false }: { auto?: boolean } = {}) {
    // Rapid skipping can outrun a single request — queue one re-run instead of
    // stacking a discover call per track.
    if (discoverInFlightRef.current) {
      pendingRediscoverRef.current = true;
      return;
    }

    discoverInFlightRef.current = true;
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
        dispatch(setPlaybackState({ ...data.playback, lastSyncedAt: Date.now() }));
      }
    } catch (err) {
      // A background refresh failing is noise — don't paint an error under a
      // button the user never pressed.
      if (auto) console.error("[NowPlayingCard] auto rediscover failed", err);
      else setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      discoverInFlightRef.current = false;

      if (pendingRediscoverRef.current) {
        pendingRediscoverRef.current = false;
        runDiscover({ auto: true });
      }
    }
  }

  // Keep the recommendation lists tied to whatever is actually playing. Only
  // kicks in after the user has pressed Discover at least once — a fresh page
  // load shows the Now Playing card alone until they ask for recommendations.
  const songId = currSong?.songId ?? null;
  useEffect(() => {
    if (!songId) return;

    const previousSongId = previousSongIdRef.current;
    previousSongIdRef.current = songId;

    if (!previousSongId || songId === previousSongId) return;
    if (songRecommendations.length === 0) return;

    runDiscover({ auto: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  return (
    <section className="flex flex-col gap-5">
      <GlassPanel radius="card" className="grid grid-cols-[300px_1fr] gap-11 p-9">
        <div className="flex flex-col gap-[22px]">
          <AlbumArt
            key={songId ?? "empty"}
            src={currSong?.songPicture ?? null}
            songName={currSong?.songName ?? null}
          />
          <TransportControls />
          <TrackProgress />
        </div>

        {currSong ? (
          <TrackMeta key={currSong.songId} currSong={currSong} />
        ) : (
          <div className="fade-up flex flex-col justify-center gap-2">
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
        onDiscover={() => runDiscover()}
        loading={loading}
        noActivePlayback={noActivePlayback}
        error={error}
      />
    </section>
  );
}

export default NowPlayingCard;
