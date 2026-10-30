import type { CSSProperties } from "react";

type Sparkle = { x: number; y: number; s: number; o: number; minor?: boolean; t?: number };

/*
 * Fixed, hand-placed positions (percent of the viewport) so server and client markup always match.
 * Delay follows the wave's progress across the screen (left to right) unless `t` is given.
 * `minor` sparkles are hidden on small screens to keep the scene light.
 */
const SPARKLES: Sparkle[] = [
  { x: 8, y: 22, s: 9, o: 0.9 }, { x: 14, y: 46, s: 6, o: 0.7, minor: true }, { x: 5, y: 64, s: 7, o: 0.8 },
  { x: 20, y: 12, s: 6, o: 0.8, minor: true }, { x: 24, y: 34, s: 10, o: 0.95 }, { x: 18, y: 78, s: 8, o: 0.85 },
  { x: 28, y: 90, s: 6, o: 0.7, minor: true }, { x: 12, y: 92, s: 9, o: 0.9 }, { x: 30, y: 18, s: 6, o: 0.7, minor: true },
  { x: 34, y: 52, s: 7, o: 0.8 }, { x: 40, y: 10, s: 8, o: 0.8 }, { x: 46, y: 24, s: 6, o: 0.7 },
  { x: 58, y: 14, s: 7, o: 0.8, minor: true }, { x: 62, y: 30, s: 9, o: 0.9 }, { x: 66, y: 46, s: 6, o: 0.7, minor: true },
  { x: 72, y: 20, s: 9, o: 0.95 }, { x: 78, y: 40, s: 6, o: 0.7, minor: true }, { x: 84, y: 12, s: 8, o: 0.85 },
  { x: 90, y: 28, s: 10, o: 0.95 }, { x: 94, y: 50, s: 6, o: 0.7, minor: true }, { x: 88, y: 66, s: 8, o: 0.85 },
  { x: 76, y: 74, s: 6, o: 0.7, minor: true }, { x: 82, y: 88, s: 9, o: 0.9 }, { x: 92, y: 92, s: 7, o: 0.8 },
  { x: 70, y: 92, s: 6, o: 0.7, minor: true }, { x: 60, y: 90, s: 7, o: 0.75 }, { x: 40, y: 92, s: 6, o: 0.7, minor: true },
  { x: 96, y: 10, s: 6, o: 0.7 }, { x: 3, y: 38, s: 6, o: 0.7 },
  // fine golden particles gathering around the central flower, before the wave arrives
  { x: 44, y: 30, s: 5, o: 0.9, t: 1.3 }, { x: 56, y: 25, s: 6, o: 0.9, t: 1.5 }, { x: 50, y: 18, s: 5, o: 0.8, t: 1.8 },
  { x: 41, y: 40, s: 4, o: 0.8, t: 1.4 }, { x: 59, y: 38, s: 5, o: 0.8, t: 1.7 },
];

const sparkleStyle = (p: Sparkle): CSSProperties => {
  const t = p.t ?? 1.7 + (p.x / 100) * 2.9;
  return { left: `${p.x}%`, top: `${p.y}%`, "--s": `${p.s}px`, "--o": p.o, "--t": `${t.toFixed(2)}s` } as CSSProperties;
};

/** Glitter wave, light sheen and sparkles. Purely decorative: hidden from assistive tech and never interactive. */
export default function PreloaderScene() {
  return (
    <div className="ps-scene" aria-hidden="true">
      <div className="ps-sheen" />

      <div className="ps-wave">
        <svg viewBox="0 0 1200 600" preserveAspectRatio="none" focusable="false">
          <g fill="none" strokeLinecap="round">
            <path className="ps-w ps-w--glow" style={{ "--lag": "0s" } as CSSProperties} pathLength="1" stroke="#f0d9a0" strokeWidth="12" d="M-40 380 C140 520 280 120 500 240 S860 500 1040 280 S1180 110 1260 150" />
            <path className="ps-w ps-w--core" style={{ "--lag": "0s" } as CSSProperties} pathLength="1" stroke="#fff3d0" strokeWidth="2.2" d="M-40 380 C140 520 280 120 500 240 S860 500 1040 280 S1180 110 1260 150" />
            <path className="ps-w ps-w--glow" style={{ "--lag": "0.14s" } as CSSProperties} pathLength="1" stroke="#e3a9bf" strokeWidth="8" d="M-40 330 C160 450 300 170 520 290 S880 440 1060 240 S1190 160 1260 200" />
            <path className="ps-w ps-w--core" style={{ "--lag": "0.14s" } as CSSProperties} pathLength="1" stroke="#fbe3b0" strokeWidth="1.6" d="M-40 330 C160 450 300 170 520 290 S880 440 1060 240 S1190 160 1260 200" />
            <path className="ps-w ps-w--core" style={{ "--lag": "0.26s" } as CSSProperties} pathLength="1" stroke="#c9a25e" strokeWidth="1.2" d="M-40 440 C130 340 330 330 520 210 S900 330 1060 360 S1190 240 1260 280" />
          </g>
        </svg>
      </div>

      <div className="ps-sparkles">
        {SPARKLES.map((p, i) => (
          <i key={i} className={`ps-sp${p.minor ? " ps-sp--minor" : ""}`} style={sparkleStyle(p)} />
        ))}
      </div>
    </div>
  );
}
