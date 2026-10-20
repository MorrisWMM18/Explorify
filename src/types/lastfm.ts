/** ---------------------------------------------
 * Last.fm API objects (https://www.last.fm/api)
 ------------------------------------------------*/

export interface LastfmSimilarTrack {
  name: string;
  artist: { name: string };
  match: number;
}

// GET ?method=track.getsimilar
export interface LastfmSimilarTracksResponse {
  similartracks: { track: LastfmSimilarTrack[] };
}

// Last.fm can report errors in the body, sometimes alongside a 200
export interface LastfmErrorResponse {
  error: number;
  message: string;
}

export interface LastfmSimilarArtist {
  name: string;
  match: string; // a string here, unlike LastfmSimilarTrack.match
}

// GET ?method=artist.getsimilar
export interface LastfmSimilarArtistsResponse {
  similarartists: { artist: LastfmSimilarArtist[] };
}

export interface LastfmTopTrack {
  name: string;
  artist: { name: string };
}

// GET ?method=artist.gettoptracks
export interface LastfmTopTracksResponse {
  toptracks: { track: LastfmTopTrack[] };
}
