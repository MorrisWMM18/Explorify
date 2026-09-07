import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Dispatch } from "@reduxjs/toolkit";
import { fetchCurrentTrack } from "@/lib/currentTrack";
import type { CurrSong, DiscoverSuccess, SpotifyArtist, SpotifyTrack } from "@/types/spotify";

// Real Spotify playback control state
// progressMs/lastSyncedAt let the UI tick a live position between
// authoritative resyncs instead of polling every second.
export interface PlaybackControlState {
  isPlaying: boolean;
  progressMs: number;
  lastSyncedAt: number; // client Date.now() when progressMs was last authoritative
  deviceAvailable: boolean;
  premiumRequired: boolean;
}

export interface SongState {
  currSong: CurrSong | null;
  songRecommendations: SpotifyTrack[];
  artistRecommendations: SpotifyArtist[];
  noActivePlayback: boolean;
  playback: PlaybackControlState | null;
}

const initialState: SongState = {
  currSong: null,
  songRecommendations: [],
  artistRecommendations: [],
  noActivePlayback: false,
  playback: null,
};

export const songSlice = createSlice({
  name: "song",
  initialState,
  reducers: {
    updateDiscoverResults: (state, action: PayloadAction<DiscoverSuccess>) => {
      const { currSong, songRecommendations, artistRecommendations } = action.payload;
      state.currSong = currSong;
      state.songRecommendations = songRecommendations;
      state.artistRecommendations = artistRecommendations;
      state.noActivePlayback = false;
    },
    setNoActivePlayback: (state) => {
      state.noActivePlayback = true;
      state.currSong = null;
      state.playback = null;
    },
    setCurrSong: (state, action: PayloadAction<CurrSong>) => {
      state.currSong = action.payload;
      state.noActivePlayback = false;
    },
    // Authoritative resync from a /me/player-backed fetch (see syncNowPlaying below).
    // Preserves the existing premiumRequired flag — a GET proves nothing either way.
    setPlaybackState: (
      state,
      action: PayloadAction<{
        isPlaying: boolean;
        progressMs: number;
        deviceAvailable: boolean;
        lastSyncedAt: number;
      }>
    ) => {
      const premiumRequired = state.playback?.premiumRequired ?? false;
      state.playback = { ...action.payload, premiumRequired };
    },
    // Optimistic patch after a control action (e.g. seek). No-ops when playback is null.
    // lastSyncedAt comes from the caller so this reducer stays pure.
    setLocalPlaybackProgress: (
      state,
      action: PayloadAction<{ progressMs: number; lastSyncedAt: number }>
    ) => {
      if (!state.playback) return;
      state.playback.progressMs = action.payload.progressMs;
      state.playback.lastSyncedAt = action.payload.lastSyncedAt;
    },
    setDeviceAvailable: (state, action: PayloadAction<boolean>) => {
      if (!state.playback) return;
      state.playback.deviceAvailable = action.payload;
    },
    setPremiumRequired: (state, action: PayloadAction<boolean>) => {
      if (!state.playback) return;
      state.playback.premiumRequired = action.payload;
    },
  },
});

export const {
  updateDiscoverResults,
  setNoActivePlayback,
  setCurrSong,
  setPlaybackState,
  setLocalPlaybackProgress,
  setDeviceAvailable,
  setPremiumRequired,
} = songSlice.actions;

// Spotify's player state is eventually consistent: a GET issued right after a skip
// usually still returns the previous track, so syncAfterSkip retries a few times.
const SKIP_SYNC_RETRY_MS = 350;
const SKIP_SYNC_MAX_ATTEMPTS = 4;

/**
 * Authoritative resync from /me/player. Every caller — the playback poll, the
 * end-of-track trigger, the post-skip retry — wants the same three dispatches.
 * Resolves to the synced song id (null when nothing is playing) so callers can
 * tell whether the track actually changed, or undefined when the fetch failed.
 */
export const syncNowPlaying =
  () =>
  async (dispatch: Dispatch): Promise<string | null | undefined> => {
    try {
      const data = await fetchCurrentTrack();

      if ("noActivePlayback" in data) {
        dispatch(setNoActivePlayback());
        return null;
      }

      dispatch(setCurrSong(data.currSong));
      dispatch(setPlaybackState({ ...data.playback, lastSyncedAt: Date.now() }));
      return data.currSong.songId;
    } catch {
      return undefined;
    }
  };

/**
 * Resyncs after a next/previous command, retrying until Spotify reports a
 * different track. `previous` can legitimately return the same track (Spotify
 * restarts the current one when more than 3s in), in which case this just
 * exhausts its attempts — harmless, and every attempt still applies the
 * progress reset.
 */
export const syncAfterSkip =
  (previousSongId: string | null) =>
  async (dispatch: Dispatch): Promise<void> => {
    for (let attempt = 0; attempt < SKIP_SYNC_MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, SKIP_SYNC_RETRY_MS));
      }

      const songId = await syncNowPlaying()(dispatch);
      // undefined means the fetch failed — keep retrying rather than treating it
      // as a track change.
      if (songId !== undefined && songId !== previousSongId) return;
    }
  };

export const selectSong = (state: { song: SongState }) => state.song.currSong;
export const selectSongRecommendations = (state: { song: SongState }) => state.song.songRecommendations;
export const selectArtistRecommendations = (state: { song: SongState }) => state.song.artistRecommendations;
export const selectNoActivePlayback = (state: { song: SongState }) => state.song.noActivePlayback;
export const selectPlayback = (state: { song: SongState }) => state.song.playback;
export const selectControlsDisabled = (state: { song: SongState }) =>
  state.song.noActivePlayback ||
  !state.song.playback ||
  !state.song.playback.deviceAvailable ||
  state.song.playback.premiumRequired;

export default songSlice.reducer;
