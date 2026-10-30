import { SITE_URL } from "@/lib/site-config";
import { formatEventDate } from "./dates";
import type { WebsiteRecord } from "./map-website";

export type PushOutcome =
  | { kind: "sent" }
  | { kind: "skipped"; reason: "not-configured" }
  | { kind: "failed"; reason: string };

const ENDPOINT = "https://api.onesignal.com/notifications";

const clean = (value: string, max: number) =>
  // eslint-disable-next-line no-control-regex
  value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** "December 15" (adds the year only when the event is not in the current year). */
function shortDate(iso: string): string {
  const full = formatEventDate(iso);
  if (!full) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const monthDay = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric" }).format(new Date(Date.UTC(y, m - 1, d)));
  return y === new Date().getUTCFullYear() ? monthDay : `${monthDay}, ${y}`;
}

export function buildPushText(record: Pick<WebsiteRecord, "full_name" | "occasion_type" | "event_date">): { title: string; message: string } {
  const title = "New Website Inquiry — The Popsy Bar";
  const hasName = record.full_name && record.full_name !== "(No name provided)";
  const who = hasName ? clean(record.full_name, 60) : "";
  const occasion = record.occasion_type ? clean(record.occasion_type, 60) : "";
  const when = record.event_date ? shortDate(record.event_date) : "";

  if (!who) return { title, message: "A new inquiry came in through the website. Tap to open the CRM." };
  const article = occasion ? (/^[aeiou]/i.test(occasion) ? "an" : "a") : "";
  let message = `${who} submitted an inquiry`;
  if (occasion) message += ` for ${article} ${occasion}`;
  if (when) message += ` on ${when}`;
  return { title, message: `${message}.` };
}

/**
 * Sends ONE push notification for a saved website inquiry. Called only from the public-form
 * handler after a successful database insert; the manual-entry action never imports this file.
 * `recordId` doubles as OneSignal's idempotency key, so a retry cannot notify twice.
 */
export async function sendInquiryPush(
  record: WebsiteRecord,
  recordId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PushOutcome> {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID?.trim();
  const apiKey = process.env.ONESIGNAL_REST_API_KEY?.trim();
  if (!appId || !apiKey) return { kind: "skipped", reason: "not-configured" };

  const { title, message } = buildPushText(record);
  const segment = process.env.ONESIGNAL_SEGMENT?.trim() || "Subscribed Users";
  try {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Key ${apiKey}` },
      body: JSON.stringify({
        app_id: appId,
        target_channel: "push",
        included_segments: [segment],
        headings: { en: title },
        contents: { en: message },
        url: `${SITE_URL}/admin/dashboard`,
        idempotency_key: recordId,
      }),
      signal: AbortSignal.timeout(6000),
    });
    const text = await response.text();
    let parsed: { id?: unknown; errors?: unknown } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      /* non-JSON reply: judged by status below */
    }
    if (!response.ok) return { kind: "failed", reason: `HTTP ${response.status}` };
    // OneSignal answers 200 with an "errors" entry when nobody is subscribed to the segment.
    if (parsed.errors) return { kind: "failed", reason: "no-recipients-or-api-error" };
    return { kind: "sent" };
  } catch (error) {
    return { kind: "failed", reason: error instanceof Error ? error.name : "unknown" };
  }
}
