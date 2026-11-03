/**
 * Builds the owner notification (HTML + plain text) for one website inquiry.
 * Pure: no network, no environment access, so it is easy to test. Every visitor-supplied value is
 * HTML-escaped, and only fields that actually exist on the inquiry are shown.
 */
import { formatEventDate } from "@/lib/crm/dates";
import { NO_NAME_PLACEHOLDER, type WebsiteRecord } from "@/lib/crm/map-website";
import { BUSINESS, BUSINESS_TIME_ZONE, SITE_URL } from "@/lib/site-config";
import { isStrictEmail, stripControlChars } from "./brevo";

export const INQUIRY_EMAIL_SUBJECT = "New Website Inquiry – The Popsy Bar";

// Brand colours taken from globals.css so the email matches the site.
const C = {
  page: "#fdfaf7",
  card: "#ffffff",
  cream: "#f9efe7",
  blush: "#f4d6dd",
  accent: "#a64f75",
  accentDeep: "#8f3d62",
  ink: "#2f2327",
  muted: "#6b5a5e",
  line: "#ead9d0",
};
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type InquiryEmailInput = {
  record: WebsiteRecord;
  /** Which form it came from, e.g. "New contact inquiry". Optional. */
  formLabel?: string;
  receivedAt?: Date;
  timeZone?: string;
};

export type InquiryEmail = {
  subject: string;
  htmlContent: string;
  textContent: string;
  replyTo?: { email: string; name?: string };
};

type Row = { label: string; value: string; kind?: "email" | "phone" };

function formatReceivedAt(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/** "New contact inquiry — The Popsy Bar" -> "New contact inquiry". */
export function cleanFormLabel(raw: string | undefined): string {
  if (!raw) return "";
  return stripControlChars(raw).replace(/\s*[—–-]\s*The Popsy Bar\s*$/i, "").slice(0, 80);
}

function clean(value: string | null | undefined): string {
  return (value ?? "").replace(/\r\n?/g, "\n").trim();
}

export function buildInquiryEmail({ record, formLabel, receivedAt = new Date(), timeZone = BUSINESS_TIME_ZONE }: InquiryEmailInput): InquiryEmail {
  const extra = record.extra ?? {};
  const name = record.full_name && record.full_name !== NO_NAME_PLACEHOLDER ? clean(record.full_name) : "";
  const email = clean(record.email);

  const contact: Row[] = [];
  if (name) contact.push({ label: "Name", value: name });
  if (email) contact.push({ label: "Email", value: email, kind: "email" });
  if (clean(record.phone)) contact.push({ label: "Phone", value: clean(record.phone), kind: "phone" });

  const occasion = clean(record.occasion_type) || clean(extra["Occasion (as entered)"]);
  const guests = record.guest_count != null ? String(record.guest_count) : clean(extra["Guest count (as entered)"]);
  const eventDate = formatEventDate(record.event_date);

  const event: Row[] = [];
  if (occasion) event.push({ label: "Event / occasion", value: occasion });
  if (eventDate) event.push({ label: "Event date", value: eventDate });
  if (guests) event.push({ label: "Guest count", value: guests });
  if (clean(record.event_location)) event.push({ label: "Event location", value: clean(record.event_location) });

  const skipped = new Set(["Occasion (as entered)", "Guest count (as entered)"]);
  const more: Row[] = Object.entries(extra)
    .filter(([key, value]) => !skipped.has(key) && clean(value))
    .map(([key, value]) => ({ label: stripControlChars(key).slice(0, 100), value: clean(value) }));

  const message = clean(record.event_description);
  const form = cleanFormLabel(formLabel);
  const received = formatReceivedAt(receivedAt, timeZone);

  const replyTo = email && isStrictEmail(email) ? { email, ...(name ? { name } : {}) } : undefined;

  return {
    subject: INQUIRY_EMAIL_SUBJECT,
    htmlContent: renderHtml({ name, email, contact, event, more, message, form, received, canReply: !!replyTo }),
    textContent: renderText({ contact, event, more, message, form, received }),
    replyTo,
  };
}

/* ------------------------------- plain text ------------------------------- */

function renderText({ contact, event, more, message, form, received }: { contact: Row[]; event: Row[]; more: Row[]; message: string; form: string; received: string }): string {
  const section = (title: string, rows: Row[]) =>
    rows.length ? [`${title.toUpperCase()}`, ...rows.map((r) => `${r.label}: ${r.value.replace(/\n+/g, " ")}`), ""] : [];
  const lines: string[] = [
    "THE POPSY BAR",
    "New website inquiry",
    "======================================",
    "",
    ...section("Contact", contact),
    ...section("Event details", event),
  ];
  if (message) lines.push("MESSAGE", message, "");
  lines.push(...section("Additional details", more));
  lines.push("SUBMISSION", `Received: ${received}`);
  if (form) lines.push(`Form: ${form}`);
  lines.push("", "--------------------------------------", "Reply to this email to respond directly to the visitor.", `Sent automatically by ${BUSINESS.name} · ${SITE_URL.replace(/^https?:\/\//, "")}`);
  return lines.join("\n");
}

/* ---------------------------------- HTML ---------------------------------- */

function valueHtml(row: Row): string {
  const safe = escapeHtml(row.value).replace(/\n/g, "<br>");
  if (row.kind === "email" && isStrictEmail(row.value)) {
    return `<a href="mailto:${escapeHtml(row.value)}" style="color:${C.accentDeep};text-decoration:underline;">${safe}</a>`;
  }
  if (row.kind === "phone" && /^[+\d][\d\s().-]{4,38}$/.test(row.value)) {
    return `<a href="tel:${escapeHtml(row.value.replace(/[^\d+]/g, ""))}" style="color:${C.accentDeep};text-decoration:underline;">${safe}</a>`;
  }
  return safe;
}

function sectionHtml(title: string, rows: Row[]): string {
  if (!rows.length) return "";
  const body = rows
    .map(
      (row) => `<tr>
<td valign="top" style="padding:8px 10px 8px 0;width:112px;font-family:${SANS};font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${C.muted};">${escapeHtml(row.label)}</td>
<td valign="top" style="padding:8px 0;font-family:${SANS};font-size:15px;line-height:1.5;color:${C.ink};word-break:break-word;">${valueHtml(row)}</td>
</tr>`,
    )
    .join("\n");
  return `<tr><td style="padding:22px 32px 4px 32px;">
<p style="margin:0 0 6px 0;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.accent};">${escapeHtml(title)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.line};">${body}</table>
</td></tr>`;
}

function renderHtml(p: { name: string; email: string; contact: Row[]; event: Row[]; more: Row[]; message: string; form: string; received: string; canReply: boolean }): string {
  const siteHost = escapeHtml(SITE_URL.replace(/^https?:\/\//, ""));
  const intro = p.name ? `${escapeHtml(p.name)} just sent an inquiry through your website.` : "Someone just sent an inquiry through your website.";

  const messageBlock = p.message
    ? `<tr><td style="padding:22px 32px 4px 32px;">
<p style="margin:0 0 10px 0;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.accent};">Message</p>
<div style="background:${C.cream};border-left:4px solid ${C.blush};border-radius:6px;padding:16px 18px;font-family:${SANS};font-size:15px;line-height:1.65;color:${C.ink};word-break:break-word;">${escapeHtml(p.message).replace(/\n/g, "<br>")}</div>
</td></tr>`
    : "";

  const submission: Row[] = [{ label: "Received", value: p.received }];
  if (p.form) submission.push({ label: "Form", value: p.form });

  const replyButton = p.canReply
    ? `<tr><td align="left" style="padding:26px 32px 8px 32px;">
<a href="mailto:${escapeHtml(p.email)}" style="display:inline-block;background:${C.accent};color:#ffffff;font-family:${SANS};font-size:14px;font-weight:600;text-decoration:none;padding:12px 26px;border-radius:999px;">Reply to ${p.name ? escapeHtml(p.name.split(" ")[0]) : "visitor"}</a>
<p style="margin:10px 0 0 0;font-family:${SANS};font-size:12px;color:${C.muted};">Or simply reply to this email. Your response goes straight to the visitor.</p>
</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(INQUIRY_EMAIL_SUBJECT)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${intro}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.card};border:1px solid ${C.line};border-radius:14px;overflow:hidden;">
<tr><td align="center" style="background:${C.blush};padding:30px 24px 26px 24px;">
<p style="margin:0;font-family:${SERIF};font-size:26px;letter-spacing:0.22em;text-transform:uppercase;color:${C.ink};">The Popsy Bar</p>
<p style="margin:10px 0 0 0;font-family:${SANS};font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:${C.accentDeep};">New website inquiry</p>
</td></tr>
<tr><td style="padding:28px 32px 0 32px;">
<h1 style="margin:0;font-family:${SERIF};font-size:24px;line-height:1.3;font-weight:normal;color:${C.ink};">You have a new inquiry</h1>
<p style="margin:10px 0 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.muted};">${intro}</p>
</td></tr>
${sectionHtml("Contact", p.contact)}
${sectionHtml("Event details", p.event)}
${messageBlock}
${sectionHtml("Additional details", p.more)}
${sectionHtml("Submission", submission)}
${replyButton}
<tr><td style="padding:26px 32px 28px 32px;">
<p style="margin:0;padding-top:18px;border-top:1px solid ${C.line};font-family:${SANS};font-size:12px;line-height:1.6;color:${C.muted};text-align:center;">Sent automatically by The Popsy Bar website · ${siteHost}<br>${escapeHtml(BUSINESS.fullAddress)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
