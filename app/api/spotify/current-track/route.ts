import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, spotifyFetch, SpotifyApiError } from "@/lib/spotifyApi";
import { getErrorMessage } from "@/lib/errors";
import type { CurrentTrackResponse, SpotifyArtist, SpotifyCurrentlyPlaying } from "@/types/spotify";

export async function GET(req: NextRequest): Promise<NextResponse<CurrentTrackResponse>> {
  const accessToken = await getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const playback = await spotifyFetch<SpotifyCurrentlyPlaying>(accessToken, "/me/player");
    if (!playback || !playback.item) {
      return NextResponse.json({ noActivePlayback: true });
    }

    // Throw an error if the current playback isn't a track (e.g. podcast, audiobook)
    if (playback.currently_playing_type !== "track") {
      return NextResponse.json({
        error: "Explorify doesn't support podcasts yet — play a song and try again!",
      });
    }

    const track = playback.item;
    const artistId = track.artists[0].id;

    // Genres only come from a separate artist lookup — best-effort, since this
    // route runs unconditionally on every mount rather than just on a Discover
    // click, so a transient Spotify hiccup here shouldn't block the whole card.
    let genres: string[] = [];
    try {
      const artist = await spotifyFetch<SpotifyArtist>(accessToken, `/artists/${artistId}`);
      genres = artist?.genres ?? [];
    } catch {
      genres = [];
    }

    return NextResponse.json({
      currSong: {
        songId: track.id,
        songUri: track.uri,
        songName: track.name,
        songArtist: track.artists.map((artist) => artist.name).join(", "),
        songArtistId: artistId,
        songPicture: track.album.images[0]?.url ?? null,
        durationMs: track.duration_ms,
        releaseDate: track.album.release_date,
        genres,
      },
    });
  } catch (error) {
    const status = error instanceof SpotifyApiError ? error.status : 500;
    const message =
      status === 429
        ? "Spotify is rate-limiting requests right now — try again in a moment."
        : getErrorMessage(error) || "Failed to load current track";
    console.error(
      "[/api/spotify/current-track]",
      status,
      error instanceof SpotifyApiError ? error.path : undefined,
      message,
      error instanceof SpotifyApiError ? error.rawBody : undefined
    );
    return NextResponse.json({ error: message }, { status });
  }
}
