export const INQUIRY_PUSH_TITLE = "New Event Inquiry — The Popsy Bar";
/** Deliberately generic: nothing about the customer or the event appears on a lock screen. */
export const INQUIRY_PUSH_BODY = "A new website inquiry has been received. Open the CRM to review it.";
export const CRM_PATH = "/admin/dashboard";

export type PushPayload = { title: string; body: string; url: string; tag: string };

export function buildInquiryPayload(inquiryId: string): PushPayload {
  return { title: INQUIRY_PUSH_TITLE, body: INQUIRY_PUSH_BODY, url: CRM_PATH, tag: `inquiry-${inquiryId}` };
}

export function buildTestPayload(): PushPayload {
  return {
    title: "Test notification — The Popsy Bar",
    body: "Push notifications are working on this device.",
    url: CRM_PATH,
    tag: "popsy-test",
  };
}

export const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

/** Delay before the next try after `attempt` failed attempts (1-based). */
export function nextAttemptDelayMs(attempt: number): number {
  return BACKOFF_MS[Math.min(Math.max(attempt, 1), BACKOFF_MS.length) - 1];
}

export type FailureClass = "expired" | "retry" | "dead";

/**
 * 404/410: the browser says the subscription no longer exists -> deactivate it.
 * Network errors, 429 and 5xx: temporary -> retry later with backoff.
 * Anything else (400/401/403/413...): retrying cannot help (bad payload or VAPID mismatch) -> give up.
 */
export function classifyPushError(statusCode: number | undefined): FailureClass {
  if (statusCode === 404 || statusCode === 410) return "expired";
  if (statusCode === undefined || statusCode === 429 || statusCode >= 500) return "retry";
  return "dead";
}

export function statusCodeOf(error: unknown): number | undefined {
  const code = (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof code === "number" ? code : undefined;
}
