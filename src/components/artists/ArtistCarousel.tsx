"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "react-aria-components";

import { selectArtistRecommendations } from "@/store/songSlice";
import { useAppSelector } from "@/store/hooks";

import IconButton from "../ui/IconButton";
import ArtistCard from "./ArtistCard";

const VISIBLE_SLIDES = 5;
const AUTOPLAY_MS = 4000;

function ArtistCarousel() {
  const artistRecommendations = useAppSelector(selectArtistRecommendations);
  const slides = artistRecommendations.slice(0, VISIBLE_SLIDES);
  const count = slides.length;

  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  // Keep the index in range when a new discover returns fewer artists.
  useEffect(() => {
    if (count > 0 && index >= count) setIndex(0);
  }, [count, index]);

  // Autoplay, but never while the user is hovering, focused inside, or has
  // asked for reduced motion.
  useEffect(() => {
    if (count <= 1 || isPaused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count, isPaused]);

  if (count === 0) {
    return (
      <section>
        <h2 className="mb-4 font-display text-[22px] font-semibold">
          Artists you might like
        </h2>
        <p className="p-6 text-center text-sm">
          Hit Discover to find artists outside your usual rotation.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-4 font-display text-[22px] font-semibold">Artists you might like</h2>

      <div
        className="flex items-center gap-4"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={(e) => {
          if (!trackRef.current?.contains(e.relatedTarget as Node)) setIsPaused(false);
        }}
      >
        <IconButton size="md" aria-label="Previous artist" onPress={() => goTo(index - 1)}>
          <span aria-hidden="true">‹</span>
        </IconButton>

        <div className="flex-1 overflow-hidden rounded-[24px]" ref={trackRef}>
          <div
            className="flex transition-transform duration-700 ease-slide"
            style={{
              width: `${count * 100}%`,
              transform: `translateX(-${index * (100 / count)}%)`,
            }}
          >
            {slides.map((artist) => (
              <div
                key={artist.id}
                className="px-2"
                style={{ flex: `0 0 ${100 / count}%` }}
              >
                <ArtistCard artist={artist} />
              </div>
            ))}
          </div>
        </div>

        <IconButton size="md" aria-label="Next artist" onPress={() => goTo(index + 1)}>
          <span aria-hidden="true">›</span>
        </IconButton>
      </div>

      <div className="mt-[18px] flex justify-center gap-2">
        {slides.map((artist, i) => (
          <Button
            key={artist.id}
            aria-label={`Go to ${artist.name}`}
            aria-current={i === index}
            onPress={() => goTo(i)}
            className="h-[7px] rounded-[4px] transition-all"
            style={{ width: i === index ? 22 : 7 }}
          />
        ))}
      </div>
    </section>
  );
}

export default ArtistCarousel;
