"use client";

import { useEffect, useRef, useState } from "react";

import emptyMixImage from "../../images/emptymix.svg";

interface AlbumArtProps {
  src: string | null;
  songName: string | null;
}

/**
 * Song photo of the current track.
 *
 * Held at opacity 0 until the image itself has resolved, so the fade-up runs on
 * the artwork rather than on an empty box the art then pops into. The parent
 * remounts this on every track change, which is what replays the animation.
 */
function AlbumArt({ src, songName }: AlbumArtProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  // A cached image can finish before React attaches onLoad, which would leave the
  // art hidden for good — check the element directly on mount.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src ?? emptyMixImage}
      alt={songName ? `Album art for ${songName}` : ""}
      onLoad={() => setLoaded(true)}
      // A broken image never fires onLoad; reveal anyway rather than leave a blank slot.
      onError={() => setLoaded(true)}
      className={`aspect-square w-full rounded-art object-cover ${
        loaded ? "fade-up" : "opacity-0"
      }`}
    />
  );
}

export default AlbumArt;
