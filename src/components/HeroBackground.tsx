"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SLIDES = [
  "/images/hero-bg-1.jpeg",
  "/images/hero-bg-2.jpeg",
  "/images/hero-bg-3.jpeg",
  "/images/hero-bg-4.jpeg",
  "/images/hero-bg-5.jpeg",
] as const;

// Must stay in sync with --hero-fade in globals.css (800ms), and be shorter than this.
const INTERVAL_MS = 7000;

type SlideState = { active: number; previous: number | null };

export default function HeroBackground() {
  const [{ active, previous }, setSlide] = useState<SlideState>({
    active: 0,
    previous: null,
  });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;

    const stop = () => {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };

    const start = () => {
      stop();
      // Reduced motion: hold on the first image instead of cycling.
      if (query.matches) return;
      timer = window.setInterval(() => {
        setSlide((s) => ({
          active: (s.active + 1) % SLIDES.length,
          previous: s.active,
        }));
      }, INTERVAL_MS);
    };

    const onChange = () => {
      if (query.matches) setSlide({ active: 0, previous: null });
      start();
    };

    start();
    query.addEventListener("change", onChange);

    return () => {
      stop();
      query.removeEventListener("change", onChange);
    };
  }, []);

  return (
    <div className="hero-bg" aria-hidden="true">
      {SLIDES.map((src, i) => (
        <div
          key={src}
          className="hero-bg__slide"
          data-state={i === active ? "active" : i === previous ? "previous" : "idle"}
        >
          <Image
            src={src}
            alt=""
            fill
            sizes="100vw"
            loading="eager"
            fetchPriority={i === 0 ? "high" : "auto"}
          />
        </div>
      ))}
      <div className="hero-bg__overlay" />
    </div>
  );
}
