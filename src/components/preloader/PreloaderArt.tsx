import Blossom, { type BloomRing } from "./Blossom";

const CENTER_RINGS: BloomRing[] = [
  { count: 8, len: 1, fill: "url(#pl-petal)", delay: 0.4, opacity: 0.92 },
  { count: 8, len: 0.75, offset: 22.5, fill: "url(#pl-petal-in)", delay: 0.9, opacity: 0.95 },
  { count: 6, len: 0.44, fill: "#fffaf6", stroke: true, delay: 1.4 },
];

/** The central blooming flower, perfume bottle and fragrance trails. */
export default function PreloaderArt() {
  return (
    <svg className="preloader__art" viewBox="0 0 320 320" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="pl-petal" cx="50%" cy="85%" r="95%">
          <stop offset="0" stopColor="#f4d6dd" />
          <stop offset="0.55" stopColor="#e3a9bf" />
          <stop offset="1" stopColor="#a64f75" />
        </radialGradient>
        <radialGradient id="pl-petal-in" cx="50%" cy="85%" r="95%">
          <stop offset="0" stopColor="#fffaf6" />
          <stop offset="0.6" stopColor="#f4d6dd" />
          <stop offset="1" stopColor="#c9708f" />
        </radialGradient>
        <linearGradient id="pl-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9a25e" />
          <stop offset="0.5" stopColor="#e8d3a0" />
          <stop offset="1" stopColor="#795d28" />
        </linearGradient>
        <linearGradient id="pl-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffaf6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#f4d6dd" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      <g className="pl-bottle">
        <rect x="136" y="38" width="48" height="22" rx="4" fill="url(#pl-gold)" />
        <rect x="150" y="60" width="20" height="14" fill="url(#pl-gold)" opacity="0.85" />
        <path
          d="M118 92 Q118 76 140 74 H180 Q202 76 202 92 V226 Q202 246 182 248 H138 Q118 246 118 226 Z"
          fill="url(#pl-glass)"
          stroke="#c9a25e"
          strokeWidth="1.2"
        />
        <path d="M128 100 V220" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </g>

      <g className="pl-trails" fill="none" stroke="#c9a25e" strokeWidth="1" strokeLinecap="round">
        <path d="M160 36 C130 20 190 8 156 -8" pathLength="1" />
        <path d="M176 40 C206 24 150 10 184 -6" pathLength="1" />
      </g>

      <Blossom x={160} y={176} rings={CENTER_RINGS} heart="url(#pl-gold)" heartR={7} heartDelay={1.9} sway />

      <g className="pl-drift" fill="#e3a9bf">
        <ellipse className="pl-drift__p pl-drift__p--1" cx="52" cy="70" rx="6" ry="3.2" />
        <ellipse className="pl-drift__p pl-drift__p--2" cx="270" cy="96" rx="5" ry="2.8" />
        <ellipse className="pl-drift__p pl-drift__p--3" cx="262" cy="250" rx="6" ry="3" />
        <ellipse className="pl-drift__p pl-drift__p--4" cx="46" cy="232" rx="4.5" ry="2.6" />
      </g>
    </svg>
  );
}
