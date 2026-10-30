import { defaults, type PageKey } from "./defaults";
import { flatten, type Tree } from "./flatten";

export type FieldType = "text" | "textarea" | "link" | "image";

export type FieldInfo = {
  key: string;
  group: string;
  label: string;
  type: FieldType;
  defaultValue: string;
};

export type OrderGroup = {
  /** Key used in the section_settings table. */
  key: string;
  label: string;
  sections: { id: string; label: string }[];
};

export const PAGE_LABELS: Record<PageKey, { label: string; path: string; blurb: string }> = {
  home: { label: "Homepage", path: "/", blurb: "Hero, value strip, experiences, occasions, cart designer, gallery strip, story and the inquiry form." },
  about: { label: "About page", path: "/about", blurb: "Story, philosophy, services, values and approach." },
  events: { label: "Events page", path: "/events", blurb: "Intro, and the copy and photo for each occasion." },
  contact: { label: "Contact page", path: "/contact", blurb: "Intro, contact details, form text and map section." },
  plan: { label: "Plan Your Event page", path: "/plan-your-event", blurb: "Intro, steps, occasion picker and form text." },
  gallery: { label: "Gallery page", path: "/gallery", blurb: "Intro text and the description for each occasion." },
  occasions: { label: "Occasion cards", path: "/", blurb: "Photo and caption for each occasion card on the homepage." },
  footer: { label: "Footer", path: "/", blurb: "Footer text, contact details and social links." },
  experienceShared: { label: "Experience pages: shared text", path: "/experiences/signatureexperiences", blurb: "Highlights and closing call-to-action shared by all four experience pages." },
  experiences: { label: "Experience pages", path: "/experiences/signatureexperiences", blurb: "Each category page and its experience sections." },
};

export const PAGE_KEYS = Object.keys(PAGE_LABELS) as PageKey[];

export function humanize(segment: string): string {
  const spaced = segment
    .replace(/-/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function typeFor(lastSegment: string, value: string): FieldType {
  if (/href$/i.test(lastSegment)) return "link";
  if (/image$/i.test(lastSegment)) return "image";
  if (value.length > 90 || value.includes("\n")) return "textarea";
  return "text";
}

export function listFields(page: PageKey): FieldInfo[] {
  const flat = flatten(defaults[page] as Tree, page);
  return Object.entries(flat).map(([key, defaultValue]) => {
    const segments = key.split(".").slice(1);
    const last = segments[segments.length - 1];
    return {
      key,
      group: segments.slice(0, -1).map(humanize).join(" › ") || "General",
      label: humanize(last),
      type: typeFor(last, defaultValue),
      defaultValue,
    };
  });
}

/** Every key that may be saved. Server actions reject anything else. */
export const ALLOWED_KEYS: Set<string> = new Set(
  PAGE_KEYS.flatMap((page) => Object.keys(flatten(defaults[page] as Tree, page))),
);

export function isImageKey(key: string): boolean {
  return /image$/i.test(key.split(".").pop() ?? "");
}

const HOME_LABELS: Record<string, string> = {
  hero: "Hero",
  strip: "Value strip",
  experiences: "Experiences",
  occasions: "Occasions",
  cart: "Design your cart",
  gallery: "Gallery strip",
  story: "Story",
  plan: "Plan your event form",
};

export function orderGroups(page: PageKey): OrderGroup[] {
  if (page === "home") {
    return [{ key: "home", label: "Homepage sections", sections: Object.keys(defaults.home).map((id) => ({ id, label: HOME_LABELS[id] ?? humanize(id) })) }];
  }
  if (page === "about") {
    return [{ key: "about", label: "About page sections", sections: Object.keys(defaults.about).map((id) => ({ id, label: humanize(id) })) }];
  }
  if (page === "experiences") {
    return Object.entries(defaults.experiences).map(([slug, category]) => ({
      key: `experiences.${slug}`,
      label: `${category.title}: experiences`,
      sections: Object.entries(category.sections).map(([id, section]) => ({ id, label: section.title })),
    }));
  }
  return [];
}

/** Every (settingKey, sectionId) pair that may be saved, including gallery categories. */
export function allowedSectionSettings(galleryCategorySlugs: string[]): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = { gallery: new Set(galleryCategorySlugs) };
  for (const page of PAGE_KEYS) {
    for (const group of orderGroups(page)) out[group.key] = new Set(group.sections.map((s) => s.id));
  }
  return out;
}

/** Built-in default for every editable key. */
export const DEFAULT_VALUES: Record<string, string> = Object.assign(
  {},
  ...PAGE_KEYS.map((page) => flatten(defaults[page] as Tree, page)),
);

export function isLinkKey(key: string): boolean {
  return /href$/i.test(key.split(".").pop() ?? "");
}

/** Accepts site-relative paths, #anchors, http(s), mailto and tel links. Rejects javascript: and friends. */
export function isSafeLink(value: string): boolean {
  return value === "" || /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(value);
}

/** Local /images/... files or this account's Cloudinary URLs. */
export function isAllowedImageValue(value: string, isCloudinary: (url: string) => boolean): boolean {
  if (value === "") return true;
  if (/^\/images\/[A-Za-z0-9._-]+$/.test(value)) return true;
  return isCloudinary(value);
}
