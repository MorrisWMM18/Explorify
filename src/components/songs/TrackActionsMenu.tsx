"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components";

import IconButton from "../ui/IconButton";
import AddToPlaylistModal from "../playlists/AddToPlaylistModal";

interface TrackActionsMenuProps {
  trackUri: string;
  trackName: string;
  artistName: string;
  /** `null` disables "Go to artist page". */
  artistId: string | null;
  /** Forwarded to the `…` trigger button. */
  className?: string;
}

/**
 * The `…` menu (Add to playlist / Go to artist page), shared by recommended
 * song rows and the Now Playing card.
 */
function TrackActionsMenu({
  trackUri,
  trackName,
  artistName,
  artistId,
  className = "",
}: TrackActionsMenuProps) {
  const router = useRouter();
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  return (
    <>
      <MenuTrigger>
        <IconButton aria-label={`More options for ${trackName}`} className={className}>
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
            disabledKeys={artistId ? [] : ["artist"]}
            onAction={(key) => {
              if (key === "add") setIsPlaylistModalOpen(true);
              if (key === "artist" && artistId) router.push(`/artist/${artistId}`);
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

      <AddToPlaylistModal
        trackUri={trackUri}
        trackName={trackName}
        artistName={artistName}
        isOpen={isPlaylistModalOpen}
        onOpenChange={setIsPlaylistModalOpen}
      />
    </>
  );
}

export default TrackActionsMenu;
