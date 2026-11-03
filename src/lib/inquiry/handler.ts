import { todayISO } from "@/lib/crm/dates";
import { mapWebsiteFields, type WebsiteRecord } from "@/lib/crm/map-website";
import { saveWebsiteInquiry, type SaveOutcome } from "@/lib/crm/save-website";
import { getBrevoConfig, sendBrevoEmail, type EmailOutcome } from "@/lib/email/brevo";
import { buildInquiryEmail } from "@/lib/email/inquiry-email";
import { sendInquiryPush, type PushOutcome } from "@/lib/push/inquiry-push";
import { clientIp, isRateLimited } from "./rate-limit";
import { MAX_BODY_BYTES, parseInquiry } from "./validate";

export type InquiryResponse = {
  ok: boolean;
  message: string;
  code?: string;
  /** True when the inquiry is safely stored in the CRM. */
  saved?: boolean;
  /** False when it is stored but the owner notification email was not confirmed. */
  emailSent?: boolean;
};

/** What the notification step needs. Replaceable in tests. */
export type NotifyEmailInput = { record: WebsiteRecord; formLabel: string };

type HandlerConfig = {
  /** Sends the owner notification email through Brevo. Replaceable in tests. */
  sendEmail?: (input: NotifyEmailInput) => Promise<EmailOutcome>;
  log?: (entry: Record<string, unknown>) => void;
  /** Writes the inquiry to the CRM (Supabase). Replaceable in tests. */
  saveToCrm?: (record: WebsiteRecord, token: string | null) => Promise<SaveOutcome>;
  /** Queues + delivers the Web Push for a freshly inserted inquiry. Replaceable in tests. */
  notify?: (recordId: string) => Promise<PushOutcome>;
  today?: () => string;
  /** Returns true when this client should be told to slow down. Replaceable in tests. */
  rateLimited?: (ip: string) => boolean;
};

const TOKEN_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
const THANKS = "Thank you! Your inquiry has been sent. We’ll be in touch soon.";
const SAVED_NOTE =
  "Thank you! Your inquiry has been received and saved. We couldn’t confirm our email notification, but our team will see it. If it’s urgent, please contact us directly.";
const NOT_SAVED =
  "We couldn’t save your inquiry right now. Please try again shortly or contact us directly.";

function json(body: InquiryResponse, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Reads the Brevo settings from the server environment and sends one notification. Never throws. */
export async function sendInquiryEmail({ record, formLabel }: NotifyEmailInput): Promise<EmailOutcome> {
  const config = getBrevoConfig();
  if (!config.ok) return { kind: "not_configured", missing: config.missing };
  const email = buildInquiryEmail({ record, formLabel });
  return sendBrevoEmail(
    { subject: email.subject, htmlContent: email.htmlContent, textContent: email.textContent, replyTo: email.replyTo, tags: ["website-inquiry"] },
    config.config,
  );
}

/** Log entry for a failed notification. Contains the outcome and Brevo's error code, never inquiry contents or secrets. */
function emailFailureLog(outcome: Exclude<EmailOutcome, { kind: "sent" }>): Record<string, unknown> {
  switch (outcome.kind) {
    case "not_configured":
      return { kind: "email-not-configured", missing: outcome.missing };
    case "rejected":
      return { kind: "email-rejected", status: outcome.status, code: outcome.code, detail: outcome.detail };
    case "unconfirmed":
      return { kind: "email-unconfirmed", status: outcome.status };
    case "timeout":
      return { kind: "email-timeout" };
    default:
      return { kind: "email-network-error", code: outcome.code };
  }
}

/** Builds the POST handler for /api/inquiries. Kept out of route.ts so it can be tested and reused. */
export function createInquiryHandler({
  sendEmail = sendInquiryEmail,
  log = (entry) => console.error("[inquiries]", entry),
  saveToCrm = saveWebsiteInquiry,
  notify = sendInquiryPush,
  today = () => todayISO(),
  rateLimited = (ip) => isRateLimited(ip),
}: HandlerConfig = {}) {
  return async function POST(request: Request): Promise<Response> {
    const ip = clientIp(request);
    if (ip && rateLimited(ip)) {
      return json({ ok: false, code: "RATE_LIMITED", message: "You’ve sent several inquiries in a short time. Please wait a few minutes or contact us directly." }, 429);
    }

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return json({ ok: false, code: "TOO_LARGE", message: "Your message is too long. Please shorten it and try again." }, 413);
    }

    let body: unknown;
    try {
      const text = await request.text();
      if (text.length > MAX_BODY_BYTES) {
        return json({ ok: false, code: "TOO_LARGE", message: "Your message is too long. Please shorten it and try again." }, 413);
      }
      body = JSON.parse(text);
    } catch {
      return json({ ok: false, code: "INVALID_BODY", message: "Please check your details and try again." }, 400);
    }

    const parsed = parseInquiry(body);
    if (!parsed.ok) return json({ ok: false, code: parsed.code, message: parsed.message }, 400);
    // Bots only: a hidden field was filled in. Acknowledge without storing or emailing.
    if (parsed.honeypot) return json({ ok: true, message: THANKS }, 200);

    // 1) Validate the event details (including "no dates in the past") before anything is stored or emailed.
    const mapped = mapWebsiteFields(parsed.fields, today());
    if (!mapped.ok) return json({ ok: false, code: mapped.code, message: mapped.message }, 400);

    // 2) Save to the CRM. The source is fixed to "website" inside saveToCrm, never taken from the request.
    const rawToken = typeof (body as Record<string, unknown>)._token === "string" ? ((body as Record<string, unknown>)._token as string) : "";
    const token = TOKEN_PATTERN.test(rawToken) ? rawToken : null;
    const crm = await saveToCrm(mapped.record, token);

    if (crm.kind === "unconfigured") {
      log({ kind: "crm-not-configured" });
      return json({ ok: false, code: "SAVE_UNAVAILABLE", message: NOT_SAVED }, 503);
    }
    if (crm.kind === "failed") {
      log({ kind: "crm-save-failed", code: crm.code });
      return json({ ok: false, code: "SAVE_FAILED", message: NOT_SAVED }, 503);
    }

    // The same submission token arrived again: the inquiry is already stored and its notification
    // was handled by the first request. Nothing new is inserted, pushed or emailed, so a repeated
    // request (double click, flaky connection, retry) can never produce a second email.
    if (crm.kind === "duplicate") {
      return json({ ok: true, saved: true, message: THANKS }, 200);
    }

    // 3) From here on the inquiry is safely stored, and nothing below can undo that.
    //    Web Push (admin devices) starts now and runs alongside the email. It is always awaited so the
    //    serverless function is not frozen mid-delivery. A failure never affects the saved record or the email.
    const pushPromise: Promise<void> = notify(crm.id).then(
      (push) => {
        if (push.kind === "failed" || push.kind === "partial") log({ kind: "push-failed", reason: push.reason });
        if (push.kind === "skipped") log({ kind: "push-skipped", reason: push.reason });
      },
      () => log({ kind: "push-failed", reason: "exception" }),
    );

    // 4) The Brevo notification, exactly once, only because a NEW row was just inserted.
    let outcome: EmailOutcome;
    try {
      outcome = await sendEmail({ record: mapped.record, formLabel: parsed.subject });
    } catch {
      outcome = { kind: "network", code: "UNEXPECTED" };
    }
    await pushPromise;

    if (outcome.kind === "sent") {
      return json({ ok: true, saved: true, emailSent: true, message: THANKS }, 200);
    }

    // Email trouble must never make the visitor think the inquiry was lost, or ask them to resubmit.
    log({ ...emailFailureLog(outcome), inquiryId: crm.id });
    return json({ ok: true, saved: true, emailSent: false, message: SAVED_NOTE }, 200);
  };
}
