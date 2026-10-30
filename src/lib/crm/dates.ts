import { BUSINESS_TIME_ZONE } from "@/lib/site-config";

/** Today's calendar date ("YYYY-MM-DD") in the business time zone, not the server's or browser's. */
export function todayISO(now: Date = new Date(), timeZone: string = BUSINESS_TIME_ZONE): string {
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** True for a real calendar date written exactly as YYYY-MM-DD. */
export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** ISO dates compare correctly as plain strings. */
export function isPastDate(value: string, today: string = todayISO()): boolean {
  return value < today;
}

/** "Dec 15, 2026" from "2026-12-15", with no time zone shifting. */
export function formatEventDate(value: string | null): string {
  if (!value || !isValidISODate(value)) return "";
  const [y, m, d] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/** "Oct 29, 2026, 5:07 PM" in the business time zone. */
export function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
