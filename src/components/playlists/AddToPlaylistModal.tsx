"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  Dialog,
  Heading,
  Input,
  Label,
  Modal,
  ModalOverlay,
  TextField,
} from "react-aria-components";

import type { SpotifySimplifiedPlaylist, SpotifyTrack } from "@/types/spotify";
import { getErrorMessage } from "@/lib/errors";

interface AddToPlaylistModalProps {
  track: SpotifyTrack;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type PlaylistsResponse = { playlists: SpotifySimplifiedPlaylist[] } | { error: string };
type CreatePlaylistResponse = { playlist: SpotifySimplifiedPlaylist } | { error: string };

function AddToPlaylistModal({ track, isOpen, onOpenChange }: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<SpotifySimplifiedPlaylist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);

  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [creating, setCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Which playlists this track has been added to during this session, driving
  // the per-row check badge the design calls for.
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Lazy-load: only fetch once the modal is actually opened, matching the
  // old dropdown's on-demand behaviour.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function loadPlaylists() {
      setLoadingPlaylists(true);
      setPlaylistsError(null);
      try {
        const response = await fetch("/api/spotify/playlists");
        const data: PlaylistsResponse = await response.json();
        if (!response.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "Failed to load playlists");
        }
        if (!cancelled) setPlaylists(data.playlists);
      } catch (err) {
        if (!cancelled) setPlaylistsError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoadingPlaylists(false);
      }
    }

    loadPlaylists();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  async function addToPlaylist(playlistId: string) {
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/spotify/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackUri: track.uri }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to add track");
      setAddedIds((prev) => new Set(prev).add(playlistId));
      setStatusMessage("Added to playlist.");
    } catch (err) {
      setStatusMessage(getErrorMessage(err));
    }
  }

  async function createPlaylistAndAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setCreating(true);
    setStatusMessage(null);
    try {
      const response = await fetch("/api/spotify/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlaylistName, trackUri: track.uri }),
      });
      const data: CreatePlaylistResponse = await response
        .json()
        .catch(() => ({ error: "Failed to create playlist" }));
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Failed to create playlist");
      }
      setPlaylists((prev) => [data.playlist, ...prev]);
      setAddedIds((prev) => new Set(prev).add(data.playlist.id));
      setNewPlaylistName("");
      setStatusMessage(`Created "${data.playlist.name}" and added the track.`);
    } catch (err) {
      setStatusMessage(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      <Modal className="flex max-h-[80vh] w-[450px] flex-col gap-[18px] overflow-auto rounded-card p-7">
        <Dialog className="flex flex-col gap-[18px] outline-none">
          {({ close }) => (
            <>
              <div className="flex items-center justify-between">
                <Heading slot="title" className="font-display text-[17px] font-semibold">
                  Add to playlist
                </Heading>
                <Button aria-label="Close" onPress={close} className="size-7 rounded-full">
                  ×
                </Button>
              </div>

              <p className="text-[13px]">
                {track.name} — {track.artists[0]?.name}
              </p>

              <ul className="flex list-none flex-col gap-0.5 p-0">
                {loadingPlaylists ? (
                  <li className="p-3 text-sm">Loading…</li>
                ) : playlistsError ? (
                  <li role="alert" className="p-3 text-sm">
                    {playlistsError}
                  </li>
                ) : playlists.length === 0 ? (
                  <li className="p-3 text-sm">No playlists yet.</li>
                ) : (
                  playlists.map((playlist) => {
                    const isAdded = addedIds.has(playlist.id);
                    return (
                      <li key={playlist.id}>
                        <Button
                          onPress={() => addToPlaylist(playlist.id)}
                          className="flex w-full items-center justify-between rounded-row p-3 text-left"
                        >
                          <span className="flex flex-col">
                            <span className="text-sm">{playlist.name}</span>
                            <span className="text-xs">
                              {playlist.tracks.total} tracks
                            </span>
                          </span>
                          <span
                            aria-hidden="true"
                            className="flex size-[27px] flex-none items-center justify-center rounded-full text-[13px]"
                          >
                            {isAdded ? "✓" : "+"}
                          </span>
                          <span className="sr-only">
                            {isAdded ? "Added" : "Add to this playlist"}
                          </span>
                        </Button>
                      </li>
                    );
                  })
                )}
              </ul>

              <hr className="h-px border-0" />

              <form onSubmit={createPlaylistAndAdd} className="flex gap-2.5">
                <TextField
                  value={newPlaylistName}
                  onChange={setNewPlaylistName}
                  className="flex-1"
                >
                  <Label className="sr-only">New playlist name</Label>
                  <Input
                    placeholder="New playlist name"
                    className="w-full rounded-chip px-3.5 py-2.5 text-sm outline-none"
                  />
                </TextField>
                <Button
                  type="submit"
                  isDisabled={creating || !newPlaylistName.trim()}
                  className="whitespace-nowrap rounded-chip px-5 py-2.5 text-[13px] font-semibold disabled:cursor-default"
                >
                  {creating ? "Creating…" : "Create"}
                </Button>
              </form>

              {statusMessage && (
                <p role="status" className="text-[13px]">
                  {statusMessage}
                </p>
              )}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export default AddToPlaylistModal;
