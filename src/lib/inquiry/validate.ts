export const MAX_FIELDS = 40;
export const MAX_KEY_LENGTH = 100;
export const MAX_VALUE_LENGTH = 5000;
export const MAX_BODY_BYTES = 64 * 1024;
export const DEFAULT_SUBJECT = "New inquiry — The Popsy Bar";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ParsedInquiry =
  | { ok: true; honeypot: false; fields: Record<string, string>; subject: string }
  | { ok: true; honeypot: true }
  | { ok: false; code: "INVALID_BODY" | "INVALID_EMAIL"; message: string };

/** Validates and sanitises the JSON a form posts to /api/inquiries. */
export function parseInquiry(body: unknown): ParsedInquiry {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, code: "INVALID_BODY", message: "Please check your details and try again." };
  }
  const input = body as Record<string, unknown>;

  // Honeypot: real visitors never see or fill this field.
  if (typeof input.website === "string" && input.website.trim()) return { ok: true, honeypot: true };

  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(input).slice(0, MAX_FIELDS)) {
    if (key.startsWith("_") || key === "website" || typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    fields[key.slice(0, MAX_KEY_LENGTH)] = trimmed.slice(0, MAX_VALUE_LENGTH);
  }

  const email = fields.email;
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, code: "INVALID_EMAIL", message: "Please enter a valid email address and try again." };
  }

  const rawSubject = typeof input._subject === "string" ? input._subject : "";
  const subject = rawSubject.replace(/[\r\n]+/g, " ").trim().slice(0, 180) || DEFAULT_SUBJECT;
  return { ok: true, honeypot: false, fields, subject };
}
