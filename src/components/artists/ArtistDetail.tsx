"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import emptyMixImage from "../../images/emptymix.svg";
import { getErrorMessage } from "@/lib/errors";
import type { ArtistDetailResponse, ArtistDetailSuccess } from "@/types/spotify";

import GlassPanel from "../ui/GlassPanel";
import PillButton from "../ui/PillButton";
import SongRow from "../songs/SongRow";

interface ArtistDetailProps {
  artistId: string;
}

function formatFollowers(total: number) {
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M followers`;
  if (total >= 1_000) return `${Math.round(total / 1_000)}K followers`;
  return `${total} followers`;
}

function ArtistDetail({ artistId }: ArtistDetailProps) {
  const router = useRouter();
  const [data, setData] = useState<ArtistDetailSuccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadArtist() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/spotify/artists/${artistId}`, {
          signal: controller.signal,
        });
        const payload: ArtistDetailResponse = await response.json();
        if (!response.ok || "error" in payload) {
          throw new Error(
            "error" in payload ? payload.error : "Failed to load artist"
          );
        }
        setData(payload);
      } catch (err) {
        // An aborted request is a navigation, not a failure to report.
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(getErrorMessage(err));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadArtist();
    return () => controller.abort();
  }, [artistId]);

  const artist = data?.artist;
  const artistPhoto = artist?.images?.[0]?.url || emptyMixImage;

  return (
    <section className="flex flex-col gap-9">
      <PillButton
        variant="glass"
        onPress={() => router.back()}
        className="self-start px-4 py-2 text-[13px]"
      >
        ← Back
      </PillButton>

      {loading && <p className="text-sm">Loading artist…</p>}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}

      {artist && (
        <>
          <GlassPanel radius="card" className="grid grid-cols-[240px_1fr] items-start gap-10 p-9">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={artistPhoto}
              alt=""
              className="size-[240px] flex-none rounded-full object-cover"
            />
            <div className="flex flex-col gap-3.5">
              <h1 className="font-display text-[38px] font-semibold tracking-[-0.01em]">
                {artist.name}
              </h1>
              <div className="flex items-center gap-3.5 text-sm">
                {artist.genres[0] && <span>{artist.genres[0]}</span>}
                {artist.genres[0] && artist.followers && <span aria-hidden="true">·</span>}
                {artist.followers && <span>{formatFollowers(artist.followers.total)}</span>}
              </div>
            </div>
          </GlassPanel>

          <div>
            <h2 className="mb-3.5 font-display text-[20px] font-semibold">Top tracks</h2>
            <GlassPanel radius="panel" className="flex flex-col p-2.5">
              {data.topTracks.length > 0 ? (
                data.topTracks.map((track) => <SongRow key={track.id} track={track} />)
              ) : (
                <p className="p-6 text-center text-sm">No top tracks available.</p>
              )}
            </GlassPanel>
          </div>
        </>
      )}
    </section>
  );
}

export default ArtistDetail;
