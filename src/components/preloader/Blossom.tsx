import type { CSSProperties } from "react";

/** One petal, 104 units long, base at the origin. Scaled and rotated by the wrappers below. */
const PETAL = "M0 0 C-34 -26 -30 -86 0 -104 C30 -86 34 -26 0 0 Z";

export type BloomRing = {
  count: number;
  /** Petal length relative to the 104-unit base petal. */
  len: number;
  fill: string;
  /** Rotation offset in degrees, so layered rings interleave. */
  offset?: number;
  /** Seconds after the blossom's own start (--t) before this ring begins to unfold. */
  delay: number;
  stroke?: boolean;
  opacity?: number;
};

type BlossomProps = {
  x: number;
  y: number;
  scale?: number;
  rings: BloomRing[];
  heart?: string;
  heartR?: number;
  heartDelay?: number;
  sway?: boolean;
};

/**
 * A layered blossom drawn as SVG. Petals unfold with CSS (see .ps-pt in globals.css).
 * Rotation uses SVG transform attributes with integer-ish values so server and client markup match.
 */
export default function Blossom({ x, y, scale = 1, rings, heart, heartR = 7, heartDelay = 1, sway = false }: BlossomProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className={sway ? "ps-sway" : undefined}>
        {rings.map((ring, r) => (
          <g key={r} transform={`scale(${ring.len})`}>
            {Array.from({ length: ring.count }, (_, i) => (
              <g key={i} transform={`rotate(${((360 / ring.count) * i + (ring.offset ?? 0)).toFixed(1)})`}>
                <path
                  className="ps-pt"
                  d={PETAL}
                  fill={ring.fill}
                  stroke={ring.stroke ? "#e3a9bf" : "none"}
                  strokeWidth={ring.stroke ? 1.2 : 0}
                  style={{ "--d": `${(ring.delay + i * 0.06).toFixed(2)}s`, "--po": ring.opacity ?? 1 } as CSSProperties}
                />
              </g>
            ))}
          </g>
        ))}
        {heart ? (
          <circle className="ps-heart" r={heartR} fill={heart} style={{ "--d": `${heartDelay.toFixed(2)}s` } as CSSProperties} />
        ) : null}
      </g>
    </g>
  );
}
