import type { ReactElement } from "react";

/**
 * Live cart preview. Pure presentational SVG, drawn in layers (back to front):
 *   1 backdrop  2 umbrella  3 counter props (per experience)  4 cart body
 *   5 signage panel (event name + menu title)  6 gloss and shadow overlay
 *
 * Colours come from CSS variables set on the wrapper (see .cartx in globals.css), so switching
 * themes cross-fades. It is an illustration, not a photo: the site has no blank cart photograph
 * to composite onto, so the cart is drawn rather than overlaid on someone else's branded photo.
 */

export const cartExperiences = ["Mocktails", "Signature Experiences", "Coffee & Beverage", "Sweet Experiences"] as const;
export type CartExperience = (typeof cartExperiences)[number];

export const cartThemes = ["Coastal Blue", "Citrus Sunset", "Watermelon Pop", "Blush & Gold"] as const;
export type CartTheme = (typeof cartThemes)[number];

type Palette = Record<
  "wall" | "wall2" | "floor" | "canopy" | "canopy2" | "panel" | "rim" | "ink" | "accent" | "drink" | "drink2" | "leaf",
  string
>;

export const themePalettes: Record<CartTheme, Palette> = {
  "Coastal Blue": { wall: "#eef5f8", wall2: "#d8e7ef", floor: "#cfdde4", canopy: "#5f9ac2", canopy2: "#fbf8f1", panel: "#f4f9fc", rim: "#7fb0cf", ink: "#1f3a4d", accent: "#3f7ea8", drink: "#58bfe0", drink2: "#a9e6f3", leaf: "#6fae8f" },
  "Citrus Sunset": { wall: "#fff3e6", wall2: "#fbdfc4", floor: "#efd2b6", canopy: "#ee8a3c", canopy2: "#fff7ea", panel: "#fff5e8", rim: "#f0a65f", ink: "#5a2f10", accent: "#d9701f", drink: "#ff9b42", drink2: "#ffd36b", leaf: "#8fae5a" },
  "Watermelon Pop": { wall: "#fff0f2", wall2: "#fbdce1", floor: "#f0cdd3", canopy: "#e5546b", canopy2: "#f6fbf2", panel: "#fff2f3", rim: "#7fb87a", ink: "#4b1d26", accent: "#c93a54", drink: "#f26b80", drink2: "#ffb6c0", leaf: "#5f9f5a" },
  "Blush & Gold": { wall: "#fcf5f2", wall2: "#f3e2e0", floor: "#ead7d4", canopy: "#e8b6c2", canopy2: "#fffaf4", panel: "#fffaf6", rim: "#c9a45c", ink: "#2f2327", accent: "#a64f75", drink: "#e598ae", drink2: "#f6d3dc", leaf: "#a9b58a" },
};

/** Menu title on the signage plus the three items listed on the menu card (names from the real collections). */
const experienceMenus: Record<CartExperience, { title: string; items: [string, string, string] }> = {
  Mocktails: { title: "Mocktail Menu", items: ["Signature Mocktails", "Popping Boba", "Jaman Chaanakha"] },
  "Signature Experiences": { title: "Signature Bar", items: ["Perfume Bar", "Oud Bar", "Lip Bar"] },
  "Coffee & Beverage": { title: "Coffee Menu", items: ["Espresso & Coffee", "Matcha & Specialty", "Thai Tea & Milk Tea"] },
  "Sweet Experiences": { title: "Sweet Menu", items: ["La Crêperie", "Churros", "Gelato"] },
};

export function menuTitleFor(experience: string): string {
  return experienceMenus[experience as CartExperience]?.title ?? "Menu";
}

/** Splits a long event name over two lines at the space nearest the middle. */
function splitName(name: string): string[] {
  if (name.length <= 15 || !name.includes(" ")) return [name];
  const mid = name.length / 2;
  let best = -1;
  for (let i = 0; i < name.length; i += 1) {
    if (name[i] === " " && (best === -1 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  }
  return [name.slice(0, best).trim(), name.slice(best + 1).trim()];
}

/** Scalloped, striped umbrella canopy built from curved wedges. */
function Canopy() {
  const cx = 300;
  const apex = { x: cx, y: 36 };
  const rimY = 152;
  const rx = 250;
  const wedges = 8;
  const pts = Array.from({ length: wedges + 1 }, (_, i) => {
    const t = Math.PI - (Math.PI * i) / wedges;
    return { x: cx + rx * Math.cos(t), y: rimY - 22 * Math.sin(t) };
  });
  const bulge = (p: { x: number; y: number }) => ({
    x: (apex.x + p.x) / 2 + (p.x - cx) * 0.2,
    y: (apex.y + p.y) / 2 - 8,
  });
  return (
    <g>
      {pts.slice(0, -1).map((a, i) => {
        const b = pts[i + 1];
        const ca = bulge(a);
        const cb = bulge(b);
        const sag = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + 26 };
        const d = `M${apex.x} ${apex.y} Q${ca.x} ${ca.y} ${a.x} ${a.y} Q${sag.x} ${sag.y} ${b.x} ${b.y} Q${cb.x} ${cb.y} ${apex.x} ${apex.y}Z`;
        return <path key={i} d={d} className={i % 2 === 0 ? "cp-canopy" : "cp-canopy2"} />;
      })}
      <path d={`M${apex.x} ${apex.y} Q${cx - 120} 44 ${pts[0].x} ${pts[0].y}`} fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2" />
      <circle cx={apex.x} cy={apex.y - 2} r="7" className="cp-gold" />
    </g>
  );
}

function Props({ experience }: { experience: CartExperience }) {
  const glass = (x: number, h: number, tilt: number, key: string) => (
    <g key={key} transform={`rotate(${tilt} ${x} 408)`}>
      <line x1={x + 4} y1={408 - h - 26} x2={x + 10} y2={408 - h + 6} className="cp-straw" />
      <path d={`M${x - 15} ${408 - h} h30 l-4 ${h} h-22z`} fill="rgba(255,255,255,.55)" stroke="rgba(47,35,39,.25)" />
      <path d={`M${x - 13} ${408 - h * 0.62} h26 l-3 ${h * 0.62} h-20z`} className="cp-drink" />
      <circle cx={x - 8} cy={408 - h * 0.35} r="3" className="cp-drink2" />
      <circle cx={x + 5} cy={408 - h * 0.2} r="3" className="cp-drink2" />
      <circle cx={x + 11} cy={408 - h} r="9" className="cp-garnish" />
    </g>
  );

  switch (experience) {
    case "Signature Experiences":
      return (
        <g>
          {[300, 348, 396].map((x, i) => (
            <g key={x}>
              <rect x={x - 16} y={408 - 54 + i * 4} width="32" height={54 - i * 4} rx="6" className="cp-glass" />
              <rect x={x - 12} y={408 - 44 + i * 4} width="24" height={30 - i * 4} rx="3" className="cp-drink" />
              <rect x={x - 8} y={408 - 68 + i * 4} width="16" height="16" rx="3" className="cp-gold" />
            </g>
          ))}
          <g>
            <path d="M440 408 q-4 -50 8 -64" fill="none" className="cp-stem" />
            <circle cx="448" cy="340" r="13" className="cp-garnish" />
            <circle cx="448" cy="340" r="5" className="cp-gold" />
            <path d="M444 376 q-18 -8 -26 -22 q22 2 26 22z" className="cp-leaf" />
          </g>
        </g>
      );
    case "Coffee & Beverage":
      return (
        <g>
          <rect x="296" y="318" width="86" height="90" rx="8" fill="#34302f" />
          <rect x="306" y="330" width="66" height="26" rx="4" fill="#4a4543" />
          <circle cx="339" cy="372" r="9" className="cp-gold" />
          <rect x="324" y="384" width="30" height="24" rx="3" fill="#25211f" />
          <g>
            <path d="M406 408 v-30 h26 v30z" fill="#fffdf8" stroke="rgba(47,35,39,.25)" />
            <path d="M432 386 q12 0 12 9 t-12 9" fill="none" stroke="rgba(47,35,39,.3)" strokeWidth="3" />
            <rect x="406" y="394" width="26" height="6" className="cp-drink" />
          </g>
          {glass(466, 52, 0, "iced")}
        </g>
      );
    case "Sweet Experiences":
      return (
        <g>
          <rect x="304" y="396" width="104" height="12" rx="4" className="cp-gold" />
          <rect x="350" y="404" width="12" height="4" className="cp-gold" />
          {[322, 356, 390].map((x, i) => (
            <g key={x}>
              <circle cx={x} cy={386} r="15" className={i === 1 ? "cp-drink2" : "cp-drink"} />
              <circle cx={x} cy={372} r="5" className="cp-garnish" />
            </g>
          ))}
          {[438, 466].map((x, i) => (
            <g key={x}>
              <rect x={x - 10} y={346 + i * 6} width="20" height={52 - i * 6} rx="10" className={i ? "cp-drink2" : "cp-drink"} />
              <rect x={x - 2} y={396} width="4" height="12" fill="#e6cfa6" />
            </g>
          ))}
        </g>
      );
    default:
      return (
        <g>
          {glass(318, 62, -4, "a")}
          {glass(366, 76, 2, "b")}
          {glass(414, 58, 5, "c")}
          <g>
            <path d="M458 408 v-44 h22 v44z" fill="rgba(255,255,255,.5)" stroke="rgba(47,35,39,.22)" />
            <path d="M461 390 h16 v18 h-16z" className="cp-drink2" />
            <circle cx="469" cy="352" r="10" className="cp-garnish" />
          </g>
        </g>
      );
  }
}

type CartPreviewProps = { eventName: string; experience: string; theme: string };

export default function CartPreview({ eventName, experience, theme }: CartPreviewProps): ReactElement {
  const exp = (cartExperiences as readonly string[]).includes(experience) ? (experience as CartExperience) : cartExperiences[0];
  const menu = experienceMenus[exp];
  const name = eventName.trim() || "Your Event";
  const lines = splitName(name);
  const longest = Math.max(...lines.map((line) => line.length));
  const fontSize = Math.max(16, Math.min(lines.length > 1 ? 34 : 50, 380 / (longest * 0.58)));
  const lineGap = fontSize * 1.1;
  // One line sits on the panel's optical centre; two lines are stacked around it.
  const blockTop = (lines.length > 1 ? 538 : 550) - (lines.length > 1 ? 4 : 0);
  const label = `Cart preview: ${exp}, ${theme} theme, sign reads ${name}`;

  return (
    <svg className="cartx__svg" viewBox="0 0 600 720" role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="cp-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="cp-wall-a" />
          <stop offset="1" className="cp-wall-b" />
        </linearGradient>
        <linearGradient id="cp-gloss" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".35" stopColor="#fff" stopOpacity=".08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="cp-shadow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#2f2327" stopOpacity=".28" />
          <stop offset="1" stopColor="#2f2327" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 1 backdrop */}
      <rect width="600" height="720" fill="url(#cp-wall)" />
      <rect y="640" width="600" height="80" className="cp-floor" />
      <circle cx="90" cy="250" r="70" className="cp-bokeh" />
      <circle cx="520" cy="330" r="90" className="cp-bokeh" />
      <circle cx="470" cy="120" r="40" className="cp-bokeh" />

      {/* 2 umbrella */}
      <rect x="296" y="150" width="8" height="262" rx="4" className="cp-gold" />
      <Canopy />

      {/* 3 counter props (re-mount on change so they ease in) */}
      <g transform="translate(300 408) scale(1.2) translate(-300 -408)">
      <g key={exp} className="cp-props">
        <rect x="76" y="258" width="148" height="150" rx="6" fill="#fff" stroke="rgba(47,35,39,.18)" />
        <rect x="86" y="268" width="128" height="130" rx="3" className="cp-panel" />
        <text x="150" y="292" textAnchor="middle" className="cp-menu-title">{menu.title}</text>
        <line x1="120" y1="302" x2="180" y2="302" className="cp-rule" />
        {menu.items.map((item, i) => (
          <g key={item}>
            <circle cx="102" cy={326 + i * 26} r="5" className={i % 2 ? "cp-drink2" : "cp-drink"} />
            <text x="114" y={330 + i * 26} className="cp-menu-item">{item}</text>
          </g>
        ))}
        <Props experience={exp} />
      </g>
      </g>

      {/* 4 cart body */}
      <ellipse cx="300" cy="676" rx="270" ry="22" fill="url(#cp-shadow)" />
      <rect x="40" y="408" width="520" height="22" rx="6" className="cp-top" />
      <rect x="52" y="430" width="496" height="214" rx="8" className="cp-body" />
      <rect x="80" y="640" width="14" height="22" rx="4" fill="#3b3235" />
      <rect x="506" y="640" width="14" height="22" rx="4" fill="#3b3235" />

      {/* 5 signage panel */}
      <rect x="76" y="450" width="448" height="174" rx="6" className="cp-panel" />
      <rect x="76" y="450" width="448" height="174" rx="6" fill="none" className="cp-rim" strokeWidth="3" />
      <rect x="86" y="460" width="428" height="154" rx="3" fill="none" className="cp-rim" strokeWidth="1" opacity=".55" />
      <text x="300" y="488" textAnchor="middle" className="cp-eyebrow">THE POPSY BAR</text>
      <g key={`${name}|${exp}`} className="cp-sign">
        {lines.map((line, i) => (
          <text key={i} x="300" y={blockTop + i * lineGap} textAnchor="middle" className="cp-name" style={{ fontSize }}>
            {line}
          </text>
        ))}
        <line x1="236" y1="588" x2="364" y2="588" className="cp-rule" />
        <text x="300" y="608" textAnchor="middle" className="cp-sub">{menu.title}</text>
      </g>

      {/* 6 gloss */}
      <rect x="76" y="450" width="448" height="174" rx="6" fill="url(#cp-gloss)" pointerEvents="none" />
      <rect x="40" y="408" width="520" height="22" rx="6" fill="url(#cp-gloss)" opacity=".5" pointerEvents="none" />
    </svg>
  );
}
