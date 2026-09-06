"use client";

import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectPlayback, selectSong, syncNowPlaying } from "@/store/songSlice";

// Steady-state resync cadence: fast enough that a track changed from the Spotify
// app shows up almost immediately, slow enough to stay well inside rate limits.
const POLL_INTERVAL_MS = 5_000;
// A resync fired at the exact moment a track ends still sees the old track, so
// give Spotify a second to advance to the next one.
const END_OF_TRACK_GRACE_MS = 1_000;

/**
 * Owns every automatic resync of the Now Playing card: a steady poll, a precise
 * end-of-track trigger, and a resync when the track is changed. Mounted once,
 * by NowPlayingCard.
 */
export function usePlaybackSync() {
  const dispatch = useAppDispatch();
  const currSong = useAppSelector(selectSong);
  const playback = useAppSelector(selectPlayback);

  // Steady poll, paused while the tab is hidden. Deliberately has no currSong /
  // playback guard: when Spotify reports nothing playing the poll still has to
  // run, otherwise a momentary gap between tracks would stop it for the rest of
  // the session and only a reload would bring the card back.
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    function sync() {
      dispatch(syncNowPlaying());
    }

    function start() {
      if (intervalId === undefined) intervalId = setInterval(sync, POLL_INTERVAL_MS);
    }

    function stop() {
      if (intervalId === undefined) return;
      clearInterval(intervalId);
      intervalId = undefined;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        stop();
      } else {
        // Re-sync immediately
        sync();
        start();
      }
    }

    if (document.visibilityState === "visible") {
      sync();
      start();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dispatch]);

  // End-of-track trigger: the steady poll alone would leave the card showing a
  // finished song for up to a full interval. Re-evaluated on every authoritative
  // resync, seek and pause.
  useEffect(() => {
    if (!currSong || !playback?.isPlaying) return;

    const elapsedMs = playback.progressMs + (Date.now() - playback.lastSyncedAt);
    const delay = Math.max(currSong.durationMs - elapsedMs, 0) + END_OF_TRACK_GRACE_MS;
    
    if (delay > POLL_INTERVAL_MS + END_OF_TRACK_GRACE_MS) return;

    const timeoutId = setTimeout(() => {
      if (document.visibilityState === "visible") dispatch(syncNowPlaying());
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [currSong, playback, dispatch]);
}
