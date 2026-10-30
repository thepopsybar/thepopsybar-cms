import type { CSSProperties } from "react";
import Blossom, { type BloomRing } from "./Blossom";

/* Decorative, hand-built SVG scenes for the preloader corners. All gradients (#ps-*) are defined once in PreloaderScene. */

const css = (vars: Record<string, string | number>) => vars as CSSProperties;

const bloom = (d: number): BloomRing[] => [
  { count: 6, len: 1, fill: "url(#ps-petal-blush)", delay: d },
  { count: 6, len: 0.62, offset: 30, fill: "url(#ps-petal-cream)", delay: d + 0.25, stroke: true },
];

function Spark({ x, y, s = 1, d = 0 }: { x: number; y: number; s?: number; d?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        className="ps-twk"
        d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z"
        fill="url(#ps-gold)"
        style={css({ "--d": `${d}s` })}
      />
    </g>
  );
}

function Petal({ x, y, r, d }: { x: number; y: number; r: number; d: number }) {
  return (
    <ellipse className="ps-fall" cx={x} cy={y} rx={5} ry={2.6} transform={`rotate(${r} ${x} ${y})`} fill="#e9b3c5" style={css({ "--d": `${d}s` })} />
  );
}

/* ---------------- TOP LEFT: Mocktails ---------------- */
export function MocktailCorner() {
  return (
    <svg className="ps-art" viewBox="0 0 220 220" aria-hidden="true" focusable="false">
      <Blossom x={30} y={46} scale={0.26} rings={bloom(0.3)} heart="url(#ps-gold)" heartR={14} heartDelay={0.8} />
      <Blossom x={198} y={186} scale={0.18} rings={bloom(0.7)} heart="url(#ps-gold)" heartR={14} heartDelay={1.1} />

      {/* coupe */}
      <ellipse cx="85" cy="173" rx="26" ry="5" fill="#d9bd82" opacity="0.25" />
      <path d="M38 72 H132 C132 110 110 128 85 128 C60 128 38 110 38 72 Z" fill="url(#ps-glass)" stroke="#d9bd82" strokeWidth="1.2" />
      <path d="M43 80 H127 C124 108 106 122 85 122 C64 122 46 108 43 80 Z" fill="url(#ps-mock1)" />
      <path d="M50 76 C52 98 66 112 76 118" stroke="#fff" strokeOpacity="0.65" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="83" y="128" width="4" height="42" fill="url(#ps-glass)" stroke="#d9bd82" strokeWidth="0.8" />
      <ellipse cx="85" cy="172" rx="26" ry="5" fill="url(#ps-glass)" stroke="#d9bd82" strokeWidth="1" />
      <Petal x={70} y={84} r={20} d={0.2} />
      <Petal x={96} y={90} r={-30} d={0.9} />
      <g transform="translate(124 70) rotate(-24)">
        <circle r="16" fill="#f4cf86" stroke="#e6b25a" strokeWidth="1" />
        <circle r="12.5" fill="#fbe7b0" />
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1="0" y1="0" x2="0" y2="-12" stroke="#f4cf86" strokeWidth="1.2" transform={`rotate(${i * 45})`} />
        ))}
      </g>

      {/* highball */}
      <path d="M146 56 H190 L185 156 Q185 162 179 162 H157 Q151 162 151 156 Z" fill="url(#ps-glass)" stroke="#d9bd82" strokeWidth="1.2" />
      <path d="M149 88 H187 L184 154 H154 Z" fill="url(#ps-mock2)" />
      <rect x="157" y="98" width="12" height="12" rx="2" transform="rotate(-12 163 104)" fill="#fff" fillOpacity="0.35" stroke="#fff" strokeOpacity="0.6" />
      <rect x="168" y="118" width="11" height="11" rx="2" transform="rotate(14 173 123)" fill="#fff" fillOpacity="0.3" stroke="#fff" strokeOpacity="0.55" />
      <circle cx="162" cy="136" r="2" fill="#fff" fillOpacity="0.7" />
      <circle cx="176" cy="104" r="1.6" fill="#fff" fillOpacity="0.7" />
      <path d="M174 30 L166 146" stroke="url(#ps-gold)" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="178" cy="54" rx="8" ry="3.4" transform="rotate(-35 178 54)" fill="#a9b595" />
      <ellipse cx="160" cy="52" rx="8" ry="3.4" transform="rotate(30 160 52)" fill="#b9c4a6" />
      <path d="M150 62 C152 100 154 130 156 150" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.6" fill="none" strokeLinecap="round" />

      <Spark x={20} y={110} s={0.9} d={0.4} />
      <Spark x={118} y={34} s={1.1} d={1.3} />
      <Spark x={204} y={96} s={0.8} d={0.9} />
    </svg>
  );
}

/* ---------------- TOP RIGHT: Oud & Perfume ---------------- */
export function OudCorner() {
  return (
    <svg className="ps-art" viewBox="0 0 220 220" aria-hidden="true" focusable="false">
      <Blossom x={34} y={70} scale={0.22} rings={bloom(0.3)} heart="url(#ps-gold)" heartR={14} heartDelay={0.8} />
      <Blossom x={196} y={98} scale={0.2} rings={bloom(0.6)} heart="url(#ps-gold)" heartR={14} heartDelay={1.1} />

      {/* fragrance mist */}
      <g fill="none" strokeLinecap="round">
        <path className="ps-mist" style={css({ "--d": "0s" })} d="M78 40 C62 30 94 20 78 6" stroke="#c9a25e" strokeWidth="1.4" />
        <path className="ps-mist" style={css({ "--d": "0.9s" })} d="M90 38 C108 28 74 16 94 2" stroke="#e3a9bf" strokeWidth="1.4" />
        <path className="ps-mist" style={css({ "--d": "1.7s" })} d="M150 78 C138 66 166 58 152 44" stroke="#c9a25e" strokeWidth="1.2" />
      </g>

      {/* oud attar bottle */}
      <ellipse cx="80" cy="192" rx="36" ry="5" fill="#5b3a1e" opacity="0.18" />
      <path d="M80 92 C48 98 36 128 44 160 C48 180 64 190 80 190 C96 190 112 180 116 160 C124 128 112 98 80 92 Z" fill="url(#ps-oud)" stroke="#c9a25e" strokeWidth="1" />
      <path d="M46 140 Q80 154 114 140" stroke="url(#ps-gold)" strokeWidth="2" fill="none" />
      <path d="M44 162 Q80 176 116 162" stroke="url(#ps-gold)" strokeWidth="2" fill="none" />
      <path d="M80 118 L90 132 L80 146 L70 132 Z" fill="none" stroke="#e8d3a0" strokeWidth="1.2" />
      <circle cx="80" cy="132" r="2.4" fill="#e8d3a0" />
      <path d="M58 112 C50 128 50 150 56 166" stroke="#fff" strokeOpacity="0.28" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M71 92 V76 H89 V92 Z" fill="url(#ps-gold)" />
      <path d="M69 76 C69 63 80 58 80 44 C80 58 91 63 91 76 Z" fill="url(#ps-gold)" />
      <circle cx="80" cy="42" r="3.4" fill="#e8d3a0" />

      {/* slim perfume bottle */}
      <rect x="132" y="104" width="38" height="84" rx="7" fill="url(#ps-glass)" stroke="#c9a25e" strokeWidth="1.2" />
      <rect x="136" y="124" width="30" height="60" rx="4" fill="url(#ps-amber)" />
      <rect x="141" y="140" width="20" height="26" rx="2" fill="#fffaf6" fillOpacity="0.88" />
      <path d="M144 148 H158 M144 153 H154" stroke="#c9a25e" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="139" y="98" width="24" height="7" rx="2" fill="url(#ps-gold)" />
      <rect x="142" y="78" width="18" height="21" rx="3" fill="url(#ps-gold)" />
      <path d="M138 112 V176" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />

      {/* oud wood chips */}
      <path d="M100 194 l10 -6 l10 3 l-3 8 l-13 1 z" fill="#5b3a1e" />
      <path d="M118 200 l8 -4 l8 2 l-2 6 l-11 1 z" fill="#7a5128" />
      <path d="M92 204 l7 -3 l6 2 l-2 5 l-9 0 z" fill="#3f2713" />

      <Petal x={118} y={60} r={25} d={0.3} />
      <Petal x={186} y={140} r={-20} d={1.1} />
      <Spark x={24} y={120} s={0.9} d={0.6} />
      <Spark x={112} y={104} s={1} d={1.4} />
      <Spark x={196} y={40} s={1.1} d={0.2} />
    </svg>
  );
}

/* ---------------- BOTTOM LEFT: Catering & Buffet ---------------- */
function Plate({ cy, rx }: { cy: number; rx: number }) {
  const ry = Math.round(rx * 17) / 100;
  return (
    <g>
      <ellipse cx="110" cy={cy + 5} rx={rx} ry={ry} fill="#b89550" opacity="0.35" />
      <ellipse cx="110" cy={cy} rx={rx} ry={ry} fill="url(#ps-plate)" stroke="#c9a25e" strokeWidth="1" />
      <ellipse cx="110" cy={cy - 0.5} rx={rx - 5} ry={ry - 1.5} fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" />
    </g>
  );
}

function Macaron({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-9 2.6 C-9 8 9 8 9 2.6 Z" fill={c} />
      <rect x="-9.5" y="0" width="19" height="2.6" rx="1.2" fill="#fffaf6" />
      <path d="M-9 0 C-9 -9 9 -9 9 0 Z" fill={c} />
    </g>
  );
}

function Tartlet({ x, y, berry }: { x: number; y: number; berry: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-9 0 L-7 8 H7 L9 0 Z" fill="#e3c28a" />
      <ellipse cx="0" cy="0" rx="9" ry="3" fill="#fffaf6" />
      <circle cx="-2" cy="-2" r="3.2" fill={berry} />
      <circle cx="3" cy="-1" r="2.6" fill={berry} />
    </g>
  );
}

export function CateringCorner() {
  return (
    <svg className="ps-art" viewBox="0 0 220 220" aria-hidden="true" focusable="false">
      <Blossom x={34} y={52} scale={0.24} rings={bloom(0.3)} heart="url(#ps-gold)" heartR={14} heartDelay={0.8} />
      <Blossom x={192} y={74} scale={0.2} rings={bloom(0.6)} heart="url(#ps-gold)" heartR={14} heartDelay={1.1} />
      <Blossom x={26} y={190} scale={0.17} rings={bloom(0.9)} heart="url(#ps-gold)" heartR={14} heartDelay={1.3} />

      {/* stand */}
      <ellipse cx="110" cy="196" rx="30" ry="5" fill="url(#ps-plate)" stroke="#c9a25e" strokeWidth="1" />
      <rect x="107" y="46" width="6" height="150" fill="url(#ps-gold)" />
      <circle cx="110" cy="42" r="5" fill="url(#ps-gold)" />

      <Plate cy={162} rx={72} />
      <Plate cy={114} rx={52} />
      <Plate cy={70} rx={32} />

      {/* top: petit gateau */}
      <path d="M94 68 C94 50 126 50 126 68 Z" fill="#fffaf6" stroke="#f0d9c4" strokeWidth="0.8" />
      <path d="M96 62 C98 52 122 52 124 62 C116 58 104 58 96 62 Z" fill="#e3a9bf" />
      <circle cx="110" cy="50" r="3.4" fill="#a64f75" />

      {/* middle: macarons */}
      <Macaron x={80} y={110} c="#f4c3d1" />
      <Macaron x={98} y={112} c="#f6e3b8" />
      <Macaron x={116} y={112} c="#e3a9bf" />
      <Macaron x={134} y={110} c="#d9dfc3" />

      {/* bottom: tartlets */}
      <Tartlet x={62} y={158} berry="#c8507a" />
      <Tartlet x={82} y={162} berry="#a64f75" />
      <Tartlet x={102} y={165} berry="#d97a96" />
      <Tartlet x={122} y={165} berry="#c8507a" />
      <Tartlet x={142} y={162} berry="#a64f75" />
      <Tartlet x={160} y={158} berry="#d97a96" />

      {/* serving utensils */}
      <g transform="translate(200 176) rotate(28)">
        <rect x="-1.6" y="-4" width="3.2" height="30" rx="1.6" fill="url(#ps-gold)" />
        <ellipse cx="0" cy="-8" rx="5.4" ry="8" fill="url(#ps-gold)" />
      </g>
      <g transform="translate(184 184) rotate(-24)">
        <rect x="-1.6" y="0" width="3.2" height="28" rx="1.6" fill="url(#ps-gold)" />
        <rect x="-5" y="-8" width="1.8" height="10" rx="0.9" fill="url(#ps-gold)" />
        <rect x="-0.9" y="-9" width="1.8" height="11" rx="0.9" fill="url(#ps-gold)" />
        <rect x="3.2" y="-8" width="1.8" height="10" rx="0.9" fill="url(#ps-gold)" />
      </g>

      <Petal x={46} y={118} r={10} d={0.5} />
      <Spark x={22} y={140} s={0.9} d={0.5} />
      <Spark x={150} y={36} s={1.1} d={1.2} />
      <Spark x={206} y={130} s={0.8} d={0.1} />
    </svg>
  );
}

/* ---------------- BOTTOM RIGHT: Coffee & Beverage ---------------- */
function Bean({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <ellipse rx="6.5" ry="4.2" fill="url(#ps-coffee)" />
      <path d="M-5.5 0 Q0 -2.4 5.5 0" stroke="#c9a25e" strokeOpacity="0.7" strokeWidth="0.9" fill="none" />
    </g>
  );
}

export function CoffeeCorner() {
  return (
    <svg className="ps-art" viewBox="0 0 220 220" aria-hidden="true" focusable="false">
      <Blossom x={198} y={84} scale={0.19} rings={bloom(0.4)} heart="url(#ps-gold)" heartR={14} heartDelay={0.9} />
      <Blossom x={46} y={78} scale={0.15} rings={bloom(0.8)} heart="url(#ps-gold)" heartR={14} heartDelay={1.2} />

      {/* botanical sprig */}
      <path d="M22 156 C26 126 36 104 48 88" stroke="#98a584" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="30" cy="132" rx="9" ry="3.6" transform="rotate(-50 30 132)" fill="#a9b595" />
      <ellipse cx="40" cy="112" rx="9" ry="3.6" transform="rotate(-125 40 112)" fill="#b9c4a6" />
      <ellipse cx="25" cy="148" rx="8" ry="3.2" transform="rotate(-140 25 148)" fill="#b9c4a6" />

      {/* steam */}
      <g fill="none" strokeLinecap="round" stroke="#c9a25e" strokeWidth="1.6">
        <path className="ps-mist" style={css({ "--d": "0s" })} d="M78 98 C66 84 92 74 80 58" />
        <path className="ps-mist" style={css({ "--d": "0.8s" })} d="M94 98 C106 82 80 70 96 52" />
        <path className="ps-mist" style={css({ "--d": "1.5s" })} d="M110 98 C98 86 122 76 110 62" />
      </g>

      {/* cup and saucer */}
      <ellipse cx="92" cy="178" rx="64" ry="11" fill="#795d28" opacity="0.15" />
      <ellipse cx="92" cy="174" rx="64" ry="11" fill="url(#ps-cream)" stroke="#d9bd82" strokeWidth="1.2" />
      <ellipse cx="92" cy="173" rx="52" ry="7.5" fill="none" stroke="#e8d3a0" strokeWidth="0.9" />
      <path d="M131 122 C158 116 160 150 128 154" stroke="#d9bd82" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M131 122 C158 116 160 150 128 154" stroke="url(#ps-cream)" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M52 112 H132 C132 150 116 170 92 170 C68 170 52 150 52 112 Z" fill="url(#ps-cream)" stroke="#d9bd82" strokeWidth="1.2" />
      <path d="M55 134 Q92 148 129 134" stroke="url(#ps-gold)" strokeWidth="2" fill="none" />
      <ellipse cx="92" cy="112" rx="40" ry="8.5" fill="url(#ps-cream)" stroke="#d9bd82" strokeWidth="1" />
      <ellipse cx="92" cy="113" rx="35" ry="6.4" fill="url(#ps-coffee)" />
      <path d="M92 119 C80 113 82 108 87 109 C90 110 92 113 92 113 C92 113 94 110 97 109 C102 108 104 113 92 119 Z" fill="#f1e2d0" opacity="0.9" />
      <path d="M60 120 C62 138 72 154 84 162" stroke="#fff" strokeOpacity="0.8" strokeWidth="2.4" fill="none" strokeLinecap="round" />

      {/* glass espresso */}
      <path d="M168 122 H198 L194 168 Q194 172 190 172 H176 Q172 172 172 168 Z" fill="url(#ps-glass)" stroke="#d9bd82" strokeWidth="1.1" />
      <path d="M171 146 H195 L193 168 H173 Z" fill="url(#ps-coffee)" />
      <path d="M170 134 H196 L195 146 H171 Z" fill="#d1a266" />
      <path d="M174 126 L176 164" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.8" strokeLinecap="round" />

      <Bean x={30} y={198} r={20} />
      <Bean x={46} y={206} r={-30} />
      <Bean x={160} y={196} r={40} />
      <Bean x={178} y={204} r={-15} />
      <Bean x={196} y={192} r={60} />

      <Petal x={150} y={96} r={30} d={0.6} />
      <Spark x={20} y={80} s={0.9} d={0.7} />
      <Spark x={150} y={60} s={1.1} d={1.5} />
      <Spark x={210} y={140} s={0.8} d={0.3} />
    </svg>
  );
}
