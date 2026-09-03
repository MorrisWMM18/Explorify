"use client";

import { useState } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectPlayback,
  selectControlsDisabled,
  setPlaybackState,
  setDeviceAvailable,
  setPremiumRequired,
  setCurrSong,
  setNoActivePlayback,
} from "@/store/songSlice";
import { fetchCurrentTrack } from "@/lib/currentTrack";

import IconButton from "../ui/IconButton";

type Pending = "playPause" | "previous" | "next" | null;

/**
 * Real transport row beneath the album art: play/pause and skip act on the user's
 * active Spotify device. Derives its state from Redux (`selectPlayback`) rather than
 * local state, so it stays in sync with the resync timer in NowPlayingCard.
 */
function TransportControls() {
  const dispatch = useAppDispatch();
  const playback = useAppSelector(selectPlayback);
  const controlsDisabled = useAppSelector(selectControlsDisabled);

  const [pending, setPending] = useState<Pending>(null);

  const isPlaying = playback?.isPlaying ?? false;
  const isDisabled = controlsDisabled || pending !== null;

  async function handleControlResponse(response: Response) {
    const data: { ok?: true; error?: string } = await response.json();

    if (!response.ok || "error" in data) {
      if (response.status === 403) {
        dispatch(setPremiumRequired(true));
      } else if (response.status === 404) {
        dispatch(setDeviceAvailable(false));
      } else {
        console.error("[TransportControls]", response.status, data.error);
      }
      return false;
    }

    if (playback?.premiumRequired) {
      dispatch(setPremiumRequired(false));
    }
    return true;
  }

  async function togglePlayPause() {
    if (!playback || pending) return;

    const wasPlaying = playback.isPlaying;
    const elapsedMs = wasPlaying ? playback.progressMs + (Date.now() - playback.lastSyncedAt) : playback.progressMs;

    setPending("playPause");
    // Optimistic flip so the icon and progress tick react instantly.
    dispatch(
      setPlaybackState({
        isPlaying: !wasPlaying,
        progressMs: elapsedMs,
        deviceAvailable: playback.deviceAvailable,
        lastSyncedAt: Date.now(),
      })
    );

    try {
      const response = await fetch("/api/spotify/player", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPlaying: !wasPlaying }),
      });

      const ok = await handleControlResponse(response);
      if (!ok) {
        // Revert the optimistic flip.
        dispatch(
          setPlaybackState({
            isPlaying: wasPlaying,
            progressMs: elapsedMs,
            deviceAvailable: playback.deviceAvailable,
            lastSyncedAt: Date.now(),
          })
        );
      }
    } catch (err) {
      console.error("[TransportControls] togglePlayPause failed", err);
      dispatch(
        setPlaybackState({
          isPlaying: wasPlaying,
          progressMs: elapsedMs,
          deviceAvailable: playback.deviceAvailable,
          lastSyncedAt: Date.now(),
        })
      );
    } finally {
      setPending(null);
    }
  }

  async function skip(direction: "next" | "previous") {
    if (pending) return;

    setPending(direction);
    try {
      const response = await fetch("/api/spotify/player/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });

      const ok = await handleControlResponse(response);
      if (!ok) return;

      // Spotify's next/previous endpoints return 204 with no track info, so refetch.
      const data = await fetchCurrentTrack();
      if ("noActivePlayback" in data) {
        dispatch(setNoActivePlayback());
      } else {
        dispatch(setCurrSong(data.currSong));
        dispatch(setPlaybackState({ ...data.playback, lastSyncedAt: Date.now() }));
      }
    } catch (err) {
      console.error("[TransportControls] skip failed", err);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex items-center justify-center gap-5">
      <IconButton
        aria-label="Previous track"
        size="sm"
        className="text-ink-2 disabled:opacity-40"
        isDisabled={isDisabled}
        onPress={() => skip("previous")}
      >
        <span aria-hidden="true" className="flex items-center">
          <span className="h-2.5 w-[3px] rounded-[1px] bg-current" />
          <span className="size-0 border-y-[5px] border-r-[8px] border-y-transparent" />
        </span>
      </IconButton>

      <IconButton
        aria-label={isPlaying ? "Pause" : "Play"}
        size="lg"
        className="glass-panel hover:bg-glass-hover disabled:opacity-40"
        isDisabled={isDisabled}
        onPress={togglePlayPause}
      >
        {isPlaying ? (
          <span aria-hidden="true" className="flex gap-[3px]">
            <span className="h-2.5 w-[3px] rounded-[1px] bg-current" />
            <span className="h-2.5 w-[3px] rounded-[1px] bg-current" />
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="ml-0.5 size-0 border-y-[5px] border-l-[8px] border-y-transparent"
          />
        )}
      </IconButton>

      <IconButton
        aria-label="Next track"
        size="sm"
        className="text-ink-2 disabled:opacity-40"
        isDisabled={isDisabled}
        onPress={() => skip("next")}
      >
        <span aria-hidden="true" className="flex items-center">
          <span className="size-0 border-y-[5px] border-l-[8px] border-y-transparent" />
          <span className="h-2.5 w-[3px] rounded-[1px] bg-current" />
        </span>
      </IconButton>
    </div>
  );
}

export default TransportControls;
