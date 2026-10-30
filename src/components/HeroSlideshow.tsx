"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const INTERVAL_MS = 3000;

type SlideshowState = {
  active: number;
  /** Slide that was showing before the current one (-1 on first render). */
  previous: number;
};

type HeroSlideshowProps = {
  images: string[];
};

/**
 * Decorative background slideshow. Renders behind the hero content (see .hero-bg in globals.css).
 * The incoming slide fades in over the outgoing one, which stays fully opaque underneath until
 * the next change, so there is never a dip to the page background mid-fade.
 */
export default function HeroSlideshow({ images }: HeroSlideshowProps) {
  const count = images.length;
  const [state, setState] = useState<SlideshowState>({ active: 0, previous: -1 });
  const [loaded, setLoaded] = useState<boolean[]>(() => images.map(() => false));
  const loadedRef = useRef<boolean[]>(loaded);

  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);

  useEffect(() => {
    if (count < 2) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;

    function advance() {
      if (document.hidden) return;
      setState((current) => {
        // Move to the next slide that has actually loaded; stay put if none has.
        for (let step = 1; step < count; step += 1) {
          const candidate = (current.active + step) % count;
          if (loadedRef.current[candidate]) {
            return { active: candidate, previous: current.active };
          }
        }
        return current;
      });
    }

    function stop() {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
    }

    function sync() {
      stop();
      // With reduced motion the first image stays as a static background.
      if (!reducedMotion.matches) {
        timer = window.setInterval(advance, INTERVAL_MS);
      }
    }

    sync();
    reducedMotion.addEventListener("change", sync);
    return () => {
      reducedMotion.removeEventListener("change", sync);
      stop();
    };
  }, [count]);

  function markLoaded(index: number) {
    setLoaded((prev) => (prev[index] ? prev : prev.map((value, i) => (i === index ? true : value))));
  }

  return (
    <div className="hero-bg" aria-hidden="true">
      {images.map((src, index) => {
        const className = [
          "hero-bg__slide",
          index === state.active ? "is-active" : index === state.previous ? "is-previous" : "",
          loaded[index] ? "is-loaded" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div key={src} className={className}>
            <Image
              src={src}
              alt=""
              fill
              sizes="100vw"
              loading={index === 0 ? "eager" : "lazy"}
              style={{ objectFit: "cover" }}
              onLoad={() => markLoaded(index)}
            />
          </div>
        );
      })}
    </div>
  );
}
