"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectNowPlayingTrackId, setNowPlayingTrack } from "@/store/songSlice";
import { getErrorMessage } from "@/lib/errors";
import { formatDuration } from "@/lib/format";
import type { SpotifyTrack } from "@/types/spotify";

import IconButton from "../ui/IconButton";
import EqBars from "./EqBars";
import AddToPlaylistModal from "../playlists/AddToPlaylistModal";

interface SongRowProps {
  track: SpotifyTrack;
}

function SongRow({ track }: SongRowProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const nowPlayingTrackId = useAppSelector(selectNowPlayingTrackId);
  const isPlaying = nowPlayingTrackId === track.id;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  // If another row starts playing, stop this one's preview. The coordination
  // lives here (not in the click handler) because the *other* rows never run
  // the handler — they only see nowPlayingTrackId change.
  useEffect(() => {
    if (!isPlaying && audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Discover replaces the whole recommendations array, so rows unmount while
  // audio may still be playing. Without this the clip keeps going with no UI.
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, []);

  function getAudio() {
    if (!audioRef.current && track.preview_url) {
      const audio = new Audio(track.preview_url);
      audio.addEventListener("ended", () => {
        dispatch(setNowPlayingTrack(null));
        setRemaining(null);
      });
      audio.addEventListener("timeupdate", () => {
        if (!Number.isFinite(audio.duration)) return;
        // Floor to whole seconds so this re-renders ~1x/sec, not ~4x.
        setRemaining(Math.floor(audio.duration - audio.currentTime));
      });
      audioRef.current = audio;
    }
    return audioRef.current;
  }

  function togglePreview() {
    const audio = getAudio();
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      dispatch(setNowPlayingTrack(null));
      setRemaining(null);
    } else {
      audio.currentTime = 0;
      audio.play().catch((err) => setPlaybackError(getErrorMessage(err)));
      dispatch(setNowPlayingTrack(track.id));
    }
  }

  async function playInSpotify() {
    setPlaybackError(null);
    try {
      const response = await fetch("/api/spotify/playback", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackUri: track.uri }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Playback failed");
      }
    } catch (err) {
      setPlaybackError(getErrorMessage(err));
    }
  }

  const albumArt = track.album.images[1]?.url ?? track.album.images[0]?.url;
  const artist = track.artists[0];

  function goToArtist() {
    if (artist?.id) router.push(`/artist/${artist.id}`);
  }

  return (
    <div>
      <div className="grid grid-cols-[48px_1fr_auto] items-center gap-3.5 rounded-row px-3 py-[9px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={albumArt}
          alt=""
          width={48}
          height={48}
          className="size-12 rounded-lg object-cover"
        />

        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15px] font-medium">{track.name}</span>
          <Button
            onPress={goToArtist}
            isDisabled={!artist?.id}
            className="w-fit truncate text-left text-[13px]"
          >
            {artist?.name}
          </Button>
        </div>

        <div className="flex items-center gap-[7px]">
          {isPlaying && (
            <div className="flex items-center gap-2.5 px-1.5">
              <EqBars />
              <span className="min-w-[28px] text-xs tabular-nums">
                {formatDuration(Math.max(0, remaining ?? 0) * 1000)}
              </span>
            </div>
          )}

          <IconButton
            aria-label={
              track.preview_url
                ? isPlaying
                  ? `Pause preview of ${track.name}`
                  : `Play preview of ${track.name}`
                : "Preview unavailable for this track"
            }
            onPress={togglePreview}
            isDisabled={!track.preview_url}
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

          <IconButton aria-label={`Play ${track.name} on Spotify`} onPress={playInSpotify}>
            <span
              aria-hidden="true"
              className="ml-0.5 size-0 border-y-[5px] border-l-[8px] border-y-transparent"
            />
          </IconButton>

          <MenuTrigger>
            <IconButton aria-label={`More options for ${track.name}`}>
              <span aria-hidden="true" className="flex gap-[3px]">
                <span className="size-[3px] rounded-full bg-current" />
                <span className="size-[3px] rounded-full bg-current" />
                <span className="size-[3px] rounded-full bg-current" />
              </span>
            </IconButton>
            <Popover>
              <Menu
                className="min-w-[190px] overflow-hidden rounded-row outline-none"
                onAction={(key) => {
                  if (key === "add") setIsPlaylistModalOpen(true);
                  if (key === "artist") goToArtist();
                }}
              >
                <MenuItem id="add" className="cursor-pointer px-[15px] py-2.5 text-[13px] outline-none">
                  Add to playlist
                </MenuItem>
                <MenuItem
                  id="artist"
                  className="cursor-pointer px-[15px] py-2.5 text-[13px] outline-none"
                >
                  Go to artist page
                </MenuItem>
              </Menu>
            </Popover>
          </MenuTrigger>
        </div>
      </div>

      {playbackError && (
        <p role="alert" className="px-3 pb-2 text-[13px]">
          {playbackError}
        </p>
      )}

      <AddToPlaylistModal
        track={track}
        isOpen={isPlaylistModalOpen}
        onOpenChange={setIsPlaylistModalOpen}
      />
    </div>
  );
}

export default SongRow;
