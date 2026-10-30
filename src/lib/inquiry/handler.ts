import { todayISO } from "@/lib/crm/dates";
import { mapWebsiteFields, type WebsiteRecord } from "@/lib/crm/map-website";
import { sendInquiryPush, type PushOutcome } from "@/lib/crm/onesignal";
import { saveWebsiteInquiry, type SaveOutcome } from "@/lib/crm/save-website";
import { clientIp, isRateLimited } from "./rate-limit";
import { MAX_BODY_BYTES, parseInquiry } from "./validate";
import { sendToFormSubmit, type SendOptions, type SendOutcome } from "./send";

export type InquiryResponse = {
  ok: boolean;
  message: string;
  code?: string;
  /** True only when the request provably never left the server, so one client-side retry is safe. */
  retrySafe?: boolean;
  /** Direct browser endpoint, supplied only together with retrySafe. */
  fallbackEndpoint?: string;
  /** True when the inquiry is safely stored in the CRM even though the email step did not confirm. */
  saved?: boolean;
};

type HandlerConfig = {
  endpoint: string;
  /** Allow the browser to try FormSubmit directly once when the server could not reach it. */
  allowBrowserFallback?: boolean;
  send?: (endpoint: string, payload: Record<string, string>, origin: string, options?: SendOptions) => Promise<SendOutcome>;
  sendOptions?: SendOptions;
  log?: (entry: Record<string, unknown>) => void;
  /** Writes the inquiry to the CRM (Supabase). Replaceable in tests. */
  saveToCrm?: (record: WebsiteRecord, token: string | null) => Promise<SaveOutcome>;
  /** Sends the OneSignal push for a freshly saved inquiry. Replaceable in tests. */
  notify?: (record: WebsiteRecord, recordId: string) => Promise<PushOutcome>;
  today?: () => string;
  /** Returns true when this client should be told to slow down. Replaceable in tests. */
  rateLimited?: (ip: string) => boolean;
};

const TOKEN_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
const SAVED_NOTE =
  "Thank you! Your inquiry has been received and saved. We couldn’t confirm our email notification, but our team will see it. If it’s urgent, please contact us directly.";

const CONTACT_DIRECTLY = "contact us directly";

function json(body: InquiryResponse, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Builds the POST handler for /api/inquiries. Kept out of route.ts so it can be tested and reused. */
export function createInquiryHandler({
  endpoint,
  allowBrowserFallback = true,
  send = sendToFormSubmit,
  sendOptions,
  log = (entry) => console.error("[inquiries]", entry),
  saveToCrm = saveWebsiteInquiry,
  notify = sendInquiryPush,
  today = () => todayISO(),
  rateLimited = (ip) => isRateLimited(ip),
}: HandlerConfig) {
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
    // Bots only: a hidden field was filled in. Acknowledge without forwarding.
    if (parsed.honeypot) return json({ ok: true, message: "Thank you! Your inquiry has been sent." }, 200);

    // 1) Validate the event details (including "no dates in the past") before anything is stored or emailed.
    const mapped = mapWebsiteFields(parsed.fields, today());
    if (!mapped.ok) return json({ ok: false, code: mapped.code, message: mapped.message }, 400);

    // 2) Save to the CRM. The source is fixed to "website" inside saveToCrm, never taken from the request.
    const rawToken = typeof (body as Record<string, unknown>)._token === "string" ? ((body as Record<string, unknown>)._token as string) : "";
    const token = TOKEN_PATTERN.test(rawToken) ? rawToken : null;
    const crm = await saveToCrm(mapped.record, token);
    const stored = crm.kind === "saved" || crm.kind === "duplicate";
    if (crm.kind === "failed") log({ kind: "crm-save-failed", code: crm.code });
    if (crm.kind === "unconfigured") log({ kind: "crm-not-configured" });

    // 3) One push per newly saved inquiry. A failure never affects the saved record or the email.
    if (crm.kind === "saved") {
      try {
        const push = await notify(mapped.record, crm.id);
        if (push.kind === "failed") log({ kind: "push-failed", reason: push.reason });
        if (push.kind === "skipped") log({ kind: "push-skipped", reason: push.reason });
      } catch {
        log({ kind: "push-failed", reason: "exception" });
      }
    }

    // 4) The existing FormSubmit email, unchanged. A duplicate token means the record already exists,
    //    so only the email is attempted again and no second record or push is created.
    const payload = { ...parsed.fields, _subject: parsed.subject, _template: "table", _captcha: "false" };
    const origin = new URL(request.url).origin;
    const outcome = await send(endpoint, payload, origin, sendOptions);

    // When the CRM holds the inquiry, an email problem must not make the customer resubmit.
    if (stored && outcome.kind !== "accepted" && outcome.kind !== "unreachable") {
      log({ kind: "email-unconfirmed-but-saved", email: outcome.kind });
      return json({ ok: true, saved: true, message: SAVED_NOTE }, 200);
    }

    switch (outcome.kind) {
      case "accepted":
        return json({ ok: true, message: "Thank you! Your inquiry has been sent. We’ll be in touch soon." }, 200);

      case "activation":
        log({ kind: outcome.kind });
        return json(
          { ok: false, code: "ACTIVATION_REQUIRED", message: `Our inquiry form isn’t fully set up yet, so your message was not delivered. Please ${CONTACT_DIRECTLY}.` },
          503,
        );

      case "rejected":
        log({ kind: outcome.kind, status: outcome.status, detail: outcome.detail });
        return json(
          { ok: false, code: "UPSTREAM_REJECTED", message: `The email service didn’t accept your inquiry. Please try again shortly or ${CONTACT_DIRECTLY}.` },
          502,
        );

      case "malformed":
        log({ kind: outcome.kind, status: outcome.status });
        return json(
          { ok: false, code: "UPSTREAM_INVALID_RESPONSE", message: `The email service gave an unexpected reply. Please try again shortly or ${CONTACT_DIRECTLY}.` },
          502,
        );

      case "unreachable":
        log({ kind: outcome.kind, code: outcome.code });
        return json(
          {
            ok: false,
            code: "UPSTREAM_UNREACHABLE",
            message: `We couldn’t reach the email service. Please try again shortly or ${CONTACT_DIRECTLY}.`,
            retrySafe: true,
            ...(stored ? { saved: true } : {}),
            ...(allowBrowserFallback ? { fallbackEndpoint: endpoint } : {}),
          },
          503,
        );

      case "timeout":
        log({ kind: outcome.kind });
        return json(
          {
            ok: false,
            code: "UPSTREAM_TIMEOUT",
            message: `The email service is taking too long to answer, so we can’t confirm your message was delivered. Please don’t resubmit; ${CONTACT_DIRECTLY} to be sure.`,
          },
          504,
        );

      default:
        log({ kind: outcome.kind, code: outcome.code });
        return json(
          { ok: false, code: "UPSTREAM_NETWORK_ERROR", message: `The connection to the email service was interrupted, so we can’t confirm delivery. Please don’t resubmit; ${CONTACT_DIRECTLY} to be sure.` },
          502,
        );
    }
  };
}
