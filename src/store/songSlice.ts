import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { CurrSong, DiscoverSuccess, SpotifyArtist, SpotifyTrack } from "@/types/spotify";

export interface SongState {
  currSong: CurrSong | null;
  songRecommendations: SpotifyTrack[];
  artistRecommendations: SpotifyArtist[];
  noActivePlayback: boolean;
  nowPlayingTrackId: string | null;
}

const initialState: SongState = {
  currSong: null,
  songRecommendations: [],
  artistRecommendations: [],
  noActivePlayback: false,
  // Shared "now playing" pointer so only one Song row's 30s preview plays at a time.
  nowPlayingTrackId: null,
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
    },
    setNowPlayingTrack: (state, action: PayloadAction<string | null>) => {
      state.nowPlayingTrackId = action.payload;
    },
    setCurrSong: (state, action: PayloadAction<CurrSong>) => {
      state.currSong = action.payload;
      state.noActivePlayback = false;
    },
  },
});

export const { updateDiscoverResults, setNoActivePlayback, setNowPlayingTrack, setCurrSong } =
  songSlice.actions;

export const selectSong = (state: { song: SongState }) => state.song.currSong;
export const selectSongRecommendations = (state: { song: SongState }) => state.song.songRecommendations;
export const selectArtistRecommendations = (state: { song: SongState }) => state.song.artistRecommendations;
export const selectNoActivePlayback = (state: { song: SongState }) => state.song.noActivePlayback;
export const selectNowPlayingTrackId = (state: { song: SongState }) => state.song.nowPlayingTrackId;

export default songSlice.reducer;
