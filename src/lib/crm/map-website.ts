import { isPastDate, isValidISODate, todayISO } from "./dates";
import { MAX_GUESTS, OCCASION_TITLES } from "./validate";

/** What gets stored for a public form submission (the `source` is added by trusted server code). */
export type WebsiteRecord = {
  full_name: string;
  email: string;
  event_date: string | null;
  occasion_type: string | null;
  guest_count: number | null;
  event_description: string;
  phone: string | null;
  event_location: string | null;
  extra: Record<string, string>;
};

export type WebsiteMapResult =
  | { ok: true; record: WebsiteRecord }
  | { ok: false; code: "INVALID_DATE" | "PAST_DATE"; message: string };

/**
 * Each existing form uses its own labels. Keys are compared with case, spaces and punctuation
 * removed, so "Full name", "full_name" and "FULL NAME" are the same field.
 *   Homepage / Plan form: Name, email, Phone number, Event date, Guest count, Event location, Details, Occasion
 *   Contact form: Full name, email, Phone number, Event type, Preferred event date, Estimated guest count, Subject, Message
 */
const ALIASES = {
  name: ["name", "fullname", "yourname"],
  email: ["email"],
  date: ["eventdate", "preferredeventdate"],
  occasion: ["occasion", "eventtype"],
  guests: ["guestcount", "estimatedguestcount"],
  description: ["details", "message"],
  phone: ["phonenumber", "phone"],
  location: ["eventlocation"],
} as const;

const norm = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

export function mapWebsiteFields(fields: Record<string, string>, today: string = todayISO()): WebsiteMapResult {
  const byNorm = new Map<string, { key: string; value: string }>();
  for (const [key, value] of Object.entries(fields)) byNorm.set(norm(key), { key, value });

  const used = new Set<string>();
  const take = (names: readonly string[]): string => {
    for (const name of names) {
      const hit = byNorm.get(name);
      if (hit) {
        used.add(hit.key);
        return hit.value.trim();
      }
    }
    return "";
  };

  const full_name = take(ALIASES.name).replace(/\s+/g, " ").slice(0, 200);
  const email = take(ALIASES.email).slice(0, 254);
  const dateRaw = take(ALIASES.date);
  const occasionRaw = take(ALIASES.occasion);
  const guestsRaw = take(ALIASES.guests);
  const event_description = take(ALIASES.description).slice(0, 5000);
  const phone = take(ALIASES.phone).slice(0, 40) || null;
  const event_location = take(ALIASES.location).slice(0, 200) || null;

  const extra: Record<string, string> = {};

  let event_date: string | null = null;
  if (dateRaw) {
    if (!isValidISODate(dateRaw)) {
      return { ok: false, code: "INVALID_DATE", message: "Please enter a valid event date and try again." };
    }
    if (isPastDate(dateRaw, today)) {
      return { ok: false, code: "PAST_DATE", message: "Please choose an event date that is today or later." };
    }
    event_date = dateRaw;
  }

  let occasion_type: string | null = null;
  if (occasionRaw) {
    if (OCCASION_TITLES.includes(occasionRaw)) occasion_type = occasionRaw;
    else extra["Occasion (as entered)"] = occasionRaw.slice(0, 120);
  }

  let guest_count: number | null = null;
  if (guestsRaw) {
    const n = /^\d+$/.test(guestsRaw) ? Number(guestsRaw) : NaN;
    if (Number.isInteger(n) && n >= 1 && n <= MAX_GUESTS) guest_count = n;
    else extra["Guest count (as entered)"] = guestsRaw.slice(0, 40);
  }

  // Keep every other meaningful answer (Subject, Contact consent, Cart design, ...).
  for (const [key, value] of Object.entries(fields)) {
    if (used.has(key)) continue;
    if (Object.keys(extra).length >= 20) break;
    extra[key.slice(0, 100)] = value.slice(0, 1000);
  }

  return {
    ok: true,
    record: {
      // The forms require a name; this fallback only protects the NOT NULL column and invents nothing.
      full_name: full_name || "(No name provided)",
      email,
      event_date,
      occasion_type,
      guest_count,
      event_description,
      phone,
      event_location,
      extra,
    },
  };
}
