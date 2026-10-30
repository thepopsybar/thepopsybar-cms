import { EMAIL_PATTERN } from "@/lib/inquiry/validate";
import { occasions } from "@/lib/occasions";
import { isPastDate, isValidISODate, todayISO } from "./dates";
import type { CrmFieldErrors } from "./types";

/** The single source of truth for occasion choices is src/lib/occasions.ts. */
export const OCCASION_TITLES: readonly string[] = occasions.map((occasion) => occasion.title);

export const MAX_GUESTS = 100000;

export type CleanCrmInput = {
  full_name: string;
  email: string;
  event_date: string;
  occasion_type: string;
  guest_count: number;
  event_description: string;
};

type Options = {
  today?: string;
  /** Edit mode: the record's current date, which stays acceptable even if it has since passed. */
  currentEventDate?: string | null;
};

/**
 * Validates a manual add/edit. Shared by the modal (instant feedback) and the server actions
 * (the real check), so the two can never disagree.
 */
export function validateCrmInput(raw: unknown, { today = todayISO(), currentEventDate = null }: Options = {}):
  | { ok: true; value: CleanCrmInput }
  | { ok: false; errors: CrmFieldErrors } {
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const text = (key: string) => (typeof input[key] === "string" ? (input[key] as string).trim() : "");
  const errors: CrmFieldErrors = {};

  const full_name = text("full_name").replace(/\s+/g, " ");
  if (!full_name) errors.full_name = "Enter the customer’s full name.";
  else if (full_name.length > 200) errors.full_name = "Keep the name under 200 characters.";

  const email = text("email");
  if (!email) errors.email = "Enter an email address.";
  else if (email.length > 254 || !EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address, like name@example.com.";

  const event_date = text("event_date");
  if (!event_date) errors.event_date = "Choose the event date.";
  else if (!isValidISODate(event_date)) errors.event_date = "Enter a valid date.";
  else if (isPastDate(event_date, today) && event_date !== currentEventDate) errors.event_date = "Choose today or a future date.";

  const occasion_type = text("occasion_type");
  if (!occasion_type) errors.occasion_type = "Choose an occasion type.";
  else if (!OCCASION_TITLES.includes(occasion_type)) errors.occasion_type = "Choose one of the listed occasion types.";

  const rawGuests = input.guest_count;
  const guestText = typeof rawGuests === "number" ? String(rawGuests) : typeof rawGuests === "string" ? rawGuests.trim() : "";
  const guest_count = /^\d+$/.test(guestText) ? Number(guestText) : NaN;
  if (!guestText) errors.guest_count = "Enter the number of guests.";
  else if (!Number.isInteger(guest_count) || guest_count < 1) errors.guest_count = "Guest count must be a whole number of 1 or more.";
  else if (guest_count > MAX_GUESTS) errors.guest_count = `Guest count can’t be more than ${MAX_GUESTS.toLocaleString("en-US")}.`;

  const event_description = text("event_description");
  if (event_description.length > 5000) errors.event_description = "Keep the description under 5,000 characters.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { full_name, email, event_date, occasion_type, guest_count, event_description } };
}
