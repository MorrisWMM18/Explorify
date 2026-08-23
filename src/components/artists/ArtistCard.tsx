"use client";

import { useRouter } from "next/navigation";
import { Button } from "react-aria-components";

import emptyMixImage from "../../images/emptymix.svg";
import type { SpotifyArtist } from "@/types/spotify";

interface ArtistCardProps {
  artist: SpotifyArtist;
}

function ArtistCard({ artist }: ArtistCardProps) {
  const router = useRouter();
  // Spotify genuinely returns artists with an empty images array.
  const artistPhoto = artist.images?.[0]?.url || emptyMixImage;

  return (
    <Button
      onPress={() => router.push(`/artist/${artist.id}`)}
      className="flex w-full cursor-pointer flex-col items-center gap-3.5 rounded-panel p-8 text-center"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={artistPhoto}
        alt=""
        className="size-[140px] flex-none rounded-full object-cover"
      />
      <span className="font-display text-[19px] font-semibold">{artist.name}</span>
      <span className="text-[13px]">{artist.genres[0] ?? ""}</span>
    </Button>
  );
}

export default ArtistCard;
