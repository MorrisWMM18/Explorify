import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { CurrSong, DiscoverSuccess, SpotifyArtist, SpotifyTrack } from "@/types/spotify";

// Real Spotify playback control state — separate axis from CurrSong (stable track
// metadata). progressMs/lastSyncedAt let the UI tick a live position between
// authoritative resyncs instead of polling every second.
export interface PlaybackControlState {
  isPlaying: boolean;
  progressMs: number;
  lastSyncedAt: number; // client Date.now() when progressMs was last authoritative
  deviceAvailable: boolean;
  premiumRequired: boolean; // sticky until a control call succeeds
}

export interface SongState {
  currSong: CurrSong | null;
  songRecommendations: SpotifyTrack[];
  artistRecommendations: SpotifyArtist[];
  noActivePlayback: boolean;
  nowPlayingTrackId: string | null;
  playback: PlaybackControlState | null;
}

const initialState: SongState = {
  currSong: null,
  songRecommendations: [],
  artistRecommendations: [],
  noActivePlayback: false,
  // Shared "now playing" pointer so only one Song row's 30s preview plays at a time.
  nowPlayingTrackId: null,
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
    setNowPlayingTrack: (state, action: PayloadAction<string | null>) => {
      state.nowPlayingTrackId = action.payload;
    },
    setCurrSong: (state, action: PayloadAction<CurrSong>) => {
      state.currSong = action.payload;
      state.noActivePlayback = false;
    },
    // Authoritative resync from a /me/player-backed fetch (mount, 20s interval, post-skip).
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
  setNowPlayingTrack,
  setCurrSong,
  setPlaybackState,
  setLocalPlaybackProgress,
  setDeviceAvailable,
  setPremiumRequired,
} = songSlice.actions;

export const selectSong = (state: { song: SongState }) => state.song.currSong;
export const selectSongRecommendations = (state: { song: SongState }) => state.song.songRecommendations;
export const selectArtistRecommendations = (state: { song: SongState }) => state.song.artistRecommendations;
export const selectNoActivePlayback = (state: { song: SongState }) => state.song.noActivePlayback;
export const selectNowPlayingTrackId = (state: { song: SongState }) => state.song.nowPlayingTrackId;
export const selectPlayback = (state: { song: SongState }) => state.song.playback;
export const selectControlsDisabled = (state: { song: SongState }) =>
  state.song.noActivePlayback ||
  !state.song.playback ||
  !state.song.playback.deviceAvailable ||
  state.song.playback.premiumRequired;

export default songSlice.reducer;
