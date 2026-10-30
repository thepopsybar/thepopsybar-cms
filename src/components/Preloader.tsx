"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Brand from "./Brand";
import PreloaderArt from "./preloader/PreloaderArt";
import PreloaderScene from "./preloader/PreloaderScene";

const SEEN_KEY = "popsy-preloader-seen";
/** The overlay always stays at least this long once shown, so the whole sequence can play. */
const MIN_MS = 6000;
/** Exceptional-failure cap: if "ready" never arrives (a stalled resource), the visitor is still let through. */
const MAX_MS = 15000;
const FADE_MS = 800;

type Phase = "idle" | "show" | "leaving" | "done";

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* storage may be blocked; the preloader simply may show again */
  }
}

function hasSeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Luxury homepage preloader. Shown once per browser session on the homepage only.
 * It is rendered visible in the server HTML (so there is no flash of the site first).
 *
 * Dismissal rules: it leaves only when BOTH (a) MIN_MS have passed since it first appeared and
 * (b) the page is ready (window load + fonts). MAX_MS is a safety cap for failures only.
 *
 * Strict Mode safety: the start time and "already leaving" flag live in refs (which survive the
 * dev double-mount), and the session is marked "seen" only when the preloader actually finishes,
 * never when it starts. Marking it at start made the second Strict Mode pass think it had already
 * been seen and dismiss it immediately.
 */
export default function Preloader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [phase, setPhase] = useState<Phase>("idle");
  const startRef = useRef<number | null>(null);
  const leavingRef = useRef(false);
  const removeTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isHome) return;
    if (leavingRef.current) return;
    if (hasSeen()) {
      setPhase("done");
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase("show");

    // Set once; unchanged by re-renders, effect re-runs and Strict Mode remounts.
    if (startRef.current === null) startRef.current = performance.now();
    const start = startRef.current;

    let cancelled = false;
    let loaded = document.readyState === "complete";
    let fontsReady = !document.fonts;
    let leaveTimer: number | undefined;

    const leave = () => {
      if (cancelled || leavingRef.current) return;
      leavingRef.current = true;
      markSeen();
      setPhase("leaving");
      removeTimerRef.current = window.setTimeout(() => setPhase("done"), reduced ? 250 : FADE_MS);
    };

    const check = () => {
      if (cancelled || !loaded || !fontsReady || leaveTimer !== undefined) return;
      const remaining = Math.max(0, MIN_MS - (performance.now() - start));
      leaveTimer = window.setTimeout(leave, remaining);
    };

    const onLoad = () => {
      loaded = true;
      check();
    };
    if (!loaded) window.addEventListener("load", onLoad, { once: true });
    if (document.fonts) {
      document.fonts.ready.then(
        () => {
          fontsReady = true;
          check();
        },
        () => {
          fontsReady = true;
          check();
        },
      );
    }
    check();

    const capTimer = window.setTimeout(leave, Math.max(0, MAX_MS - (performance.now() - start)));

    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(capTimer);
    };
  }, [isHome]);

  useEffect(() => () => window.clearTimeout(removeTimerRef.current), []);

  useEffect(() => {
    const html = document.documentElement;
    if (phase === "show") html.classList.add("preloader-active");
    else html.classList.remove("preloader-active");
    return () => html.classList.remove("preloader-active");
  }, [phase]);

  if (!isHome || phase === "done") return null;

  return (
    <div
      id="popsy-preloader"
      className={`preloader${phase === "leaving" ? " is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading The Popsy Bar"
      aria-hidden={phase === "leaving" ? true : undefined}
      inert={phase === "leaving" ? true : undefined}
    >
      <div className="preloader__glow" aria-hidden="true" />
      <PreloaderScene />
      <div className="preloader__stage">
        <PreloaderArt />

        <div className="preloader__logo">
          <Brand href={null} size="preloader" priority />
        </div>
        <p className="preloader__line">Curated experiences. Beautifully served.</p>
      </div>
    </div>
  );
}
