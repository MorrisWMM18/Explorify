"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components";

import { getErrorMessage } from "@/lib/errors";
import type { SpotifyTrack } from "@/types/spotify";

import IconButton from "../ui/IconButton";
import AddToPlaylistModal from "../playlists/AddToPlaylistModal";

interface SongRowProps {
  track: SpotifyTrack;
  /** Stagger offset for the list’s fade-up entrance. */
  enterDelayMs?: number;
}

function SongRow({ track, enterDelayMs = 0 }: SongRowProps) {
  const router = useRouter();

  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

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
    <div className="fade-up" style={{ animationDelay: `${enterDelayMs}ms` }}>
      <div className="grid grid-cols-[48px_1fr_auto] items-center gap-3.5 rounded-row px-3 py-[9px] transition duration-150 hover:bg-glass-hover">
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
            className="w-fit truncate text-left text-[13px] text-ink-4 hover:text-ink-2"
          >
            {artist?.name}
          </Button>
        </div>

        <div className="flex items-center gap-[7px]">
          <IconButton aria-label={`Play ${track.name} on Spotify`} onPress={playInSpotify}>
            <span
              aria-hidden="true"
              className="ml-0.5 size-0 border-y-[5px] border-l-[8px] border-y-transparent"
            />
          </IconButton>

          <MenuTrigger>
            <IconButton
              aria-label={`More options for ${track.name}`}
              className="text-ink-3 hover:bg-glass-hover"
            >
              <span aria-hidden="true" className="flex gap-[3px]">
                <span className="size-[3px] rounded-full bg-current" />
                <span className="size-[3px] rounded-full bg-current" />
                <span className="size-[3px] rounded-full bg-current" />
              </span>
            </IconButton>
            <Popover
              placement="bottom end"
              offset={8}
              className="glass-menu min-w-[190px] rounded-panel p-1.5 entering:[animation:menu-in_0.18s_var(--ease-slide)] exiting:[animation:menu-out_0.13s_ease-in]"
            >
              <Menu
                className="outline-none"
                onAction={(key) => {
                  if (key === "add") setIsPlaylistModalOpen(true);
                  if (key === "artist") goToArtist();
                }}
              >
                <MenuItem
                  id="add"
                  className="cursor-pointer rounded-row px-[15px] py-2.5 text-[13px] text-ink-2 outline-none hover:bg-glass-hover focus:bg-glass-hover pressed:bg-glass-hover"
                >
                  Add to playlist
                </MenuItem>
                <MenuItem
                  id="artist"
                  className="cursor-pointer rounded-row px-[15px] py-2.5 text-[13px] text-ink-2 outline-none hover:bg-glass-hover focus:bg-glass-hover pressed:bg-glass-hover"
                >
                  Go to artist page
                </MenuItem>
              </Menu>
            </Popover>
          </MenuTrigger>
        </div>
      </div>

      {playbackError && (
        <p role="alert" className="px-3 pb-2 text-[13px] text-danger">
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
