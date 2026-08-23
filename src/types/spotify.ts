export interface SpotifyFollowers {
  href: string | null;
  total: number;
}

export interface SpotifyPagingObject<T> {
  href: string;
  items: T[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

// Artist Object (full) — GET /artists/{id}, search (type=artist)
export interface SpotifyArtist {
  external_urls: SpotifyExternalUrls;
  followers?: SpotifyFollowers;
  genres: string[];
  href: string;
  id: string;
  images?: SpotifyImage[];
  name: string;
  popularity?: number;
  type: "artist";
  uri: string;
}

// Simplified User Object — as embedded in Playlist objects
export interface SpotifyPlaylistOwner {
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  type: "user";
  uri: string;
  display_name?: string | null;
}

// Simplified Playlist Object — GET /me/playlists items, POST .../playlists response
export interface SpotifySimplifiedPlaylist {
  collaborative: boolean;
  description: string | null;
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  images: SpotifyImage[];
  name: string;
  owner: SpotifyPlaylistOwner;
  public: boolean | null;
  snapshot_id: string;
  tracks: { href: string; total: number };
  type: "playlist";
  uri: string;
}

// GET /artists/{id}/top-tracks
export interface SpotifyTopTracksResponse {
  tracks: SpotifyTrack[];
}

// GET /search?type=track
export interface SpotifySearchTracksResponse {
  tracks: SpotifyPagingObject<SpotifyTrack>;
}

// GET /search?type=artist
export interface SpotifySearchArtistsResponse {
  artists: SpotifyPagingObject<SpotifyArtist>;
}

// ---- Bespoke app-level DTOs (NOT raw Spotify shapes) ----


export interface SongAnalysis {
  popularity: number;
  explicit: boolean;
  durationMs: number;
  releaseDate: string | null;
  genres: string[];
}

// POST /api/spotify/discover response shapes
export interface DiscoverNoActivePlayback {
  noActivePlayback: true;
}

export interface DiscoverSuccess {
  currSong: CurrSong;
  songAnalysis: SongAnalysis;
  songRecommendations: SpotifyTrack[];
  artistRecommendations: SpotifyArtist[];
}

export interface DiscoverError {
  error: string;
}

export type DiscoverResponse = DiscoverNoActivePlayback | DiscoverSuccess | DiscoverError;

// GET /api/spotify/artists/[artistId] response shapes.
// Discriminated by key presence, like the unions above, so consumers keep
// narrowing with `"error" in data`.
export interface ArtistDetailSuccess {
  artist: SpotifyArtist;
  topTracks: SpotifyTrack[];
}

export interface ArtistDetailError {
  error: string;
}

export type ArtistDetailResponse = ArtistDetailSuccess | ArtistDetailError;

/** -------------------------
 * Spotify API schemas
 ----------------------------*/

// GET /me/player returned by the Spotify API
export interface SpotifyCurrentlyPlaying {
  device: SpotifyDevice;
  repeat_state: "off" | "track" | "context";
  shuffle_state: boolean;
  context: SpotifyPlaybackContext | null;
  timestamp: number;
  progress_ms: number | null;
  is_playing: boolean;
  item: SpotifyTrack | null;
  currently_playing_type: "track" | "episode" | "ad" | "unknown";
  actions: SpotifyPlaybackActions;
}

export interface SpotifyDevice {
  id: string | null;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number | null;
  supports_volume: boolean;
}

export interface SpotifyPlaybackContext {
  type: string;
  href: string;
  external_urls: SpotifyExternalUrls;
  uri: string;
}

export interface SpotifyTrack {
  album: SpotifySimplifiedAlbum;
  artists: SpotifySimplifiedArtist[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  name: string;
  popularity: number;
  preview_url: string | null;
  track_number: number;
  type: "track";
  uri: string;
}

export interface SpotifyExternalUrls {
  spotify: string;
}

export interface SpotifyPlaybackActions {
  interrupting_playback?: boolean;
  pausing?: boolean;
  resuming?: boolean;
  seeking?: boolean;
  skipping_next?: boolean;
  skipping_prev?: boolean;
  toggling_repeat_context?: boolean;
  toggling_shuffle?: boolean;
  toggling_repeat_track?: boolean;
  transferring_playback?: boolean;
}

export interface SpotifySimplifiedAlbum {
  album_type: "album" | "single" | "compilation";
  total_tracks: number;
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  images: SpotifyImage[];
  name: string;
  release_date: string;
  release_date_precision: "year" | "month" | "day";
  type: "album";
  uri: string;
  artists: SpotifySimplifiedArtist[];
}

export interface SpotifySimplifiedArtist {
  external_urls: SpotifyExternalUrls;
  href: string;
  id: string;
  name: string;
  type: "artist";
  uri: string;
}

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

/** ---------------------------------------------
 * Custom Explorify backend endpoint schemas
 ------------------------------------------------*/

export interface CurrSong {
  songId: string;
  songUri: string;
  songName: string;
  songArtist: string;
  songArtistId: string;
  songPicture: string | null;
  songPopularity: number;
}

export interface CurrentTrackSuccess {
  currSong: CurrSong;
}

export interface CurrentTrackNoActivePlayback {
  noActivePlayback: true;
}

export interface CurrentTrackError {
  error: string;
}

// Response schema for /app/api/spotify/current-track
export type CurrentTrackResponse =
  | CurrentTrackSuccess
  | CurrentTrackNoActivePlayback
  | CurrentTrackError;
