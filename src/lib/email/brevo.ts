/**
 * Brevo transactional email (https://developers.brevo.com/reference/sendtransacemail).
 *
 * SERVER-ONLY. The API key is read from the server environment (BREVO_API_KEY, never
 * NEXT_PUBLIC_) and is sent only in the `api-key` header of a request made from the server.
 * Nothing in this file is imported by client components.
 *
 * Each call makes exactly ONE request and never retries: a request that timed out may still have
 * been delivered, and retrying it could send the same notification twice.
 */
import { EMAIL_PATTERN } from "@/lib/inquiry/validate";

export const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

const DEFAULT_SENDER_EMAIL = "notifications@thepopsybar.com";
const DEFAULT_SENDER_NAME = "The Popsy Bar";
const DEFAULT_TIMEOUT_MS = 10_000;

export type BrevoConfig = {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  /** Comes ONLY from server configuration. Visitors can never influence it. */
  recipientEmail: string;
};

export type BrevoConfigResult = { ok: true; config: BrevoConfig } | { ok: false; missing: string[] };

/** Removes line breaks and control characters so a value can never be smuggled into a header. */
export function stripControlChars(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim();
}

function validEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value) && !/[\u0000-\u001f\u007f<>"',;]/.test(value);
}

/**
 * Reads and validates the Brevo settings. Returns the NAMES of missing/invalid variables (never
 * their values) so it is safe to log.
 */
export function getBrevoConfig(env: Record<string, string | undefined> = process.env): BrevoConfigResult {
  const apiKey = env.BREVO_API_KEY?.trim() ?? "";
  const senderEmail = (env.BREVO_SENDER_EMAIL?.trim() || DEFAULT_SENDER_EMAIL).toLowerCase();
  const senderName = stripControlChars(env.BREVO_SENDER_NAME ?? "").slice(0, 100) || DEFAULT_SENDER_NAME;
  const recipientEmail = env.INQUIRY_NOTIFICATION_EMAIL?.trim() ?? "";

  const missing: string[] = [];
  if (!apiKey || /[\s\u0000-\u001f]/.test(apiKey)) missing.push("BREVO_API_KEY");
  if (!validEmail(senderEmail)) missing.push("BREVO_SENDER_EMAIL");
  if (!validEmail(recipientEmail)) missing.push("INQUIRY_NOTIFICATION_EMAIL");
  if (missing.length) return { ok: false, missing };
  return { ok: true, config: { apiKey, senderEmail, senderName, recipientEmail } };
}

export type BrevoMessage = {
  subject: string;
  htmlContent: string;
  textContent: string;
  /** The visitor. Only used as Reply-To, and only when it passes a strict address check. */
  replyTo?: { email: string; name?: string };
  tags?: string[];
};

/** A conservative address check used for Reply-To, so one odd address can never make Brevo refuse the whole email. */
const STRICT_EMAIL = /^[A-Za-z0-9.!#$%&*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

export function isStrictEmail(value: string): boolean {
  return value.length <= 254 && STRICT_EMAIL.test(value);
}

/** The exact JSON body sent to Brevo. Pure, so tests can assert the request structure. */
export function buildBrevoPayload(message: BrevoMessage, config: BrevoConfig) {
  let replyTo: { email: string; name?: string } | undefined;
  if (message.replyTo && isStrictEmail(message.replyTo.email)) {
    const name = stripControlChars(message.replyTo.name ?? "").replace(/[<>"]/g, "").trim().slice(0, 100);
    replyTo = name ? { email: message.replyTo.email, name } : { email: message.replyTo.email };
  }

  return {
    sender: { name: config.senderName, email: config.senderEmail },
    to: [{ email: config.recipientEmail }],
    ...(replyTo ? { replyTo } : {}),
    subject: stripControlChars(message.subject).slice(0, 200),
    htmlContent: message.htmlContent,
    textContent: message.textContent,
    ...(message.tags?.length ? { tags: message.tags } : {}),
  };
}

export type EmailOutcome =
  /** Brevo accepted the message for delivery (HTTP 2xx with a message id). */
  | { kind: "sent"; messageId: string }
  /** Required server configuration is missing: nothing was sent. */
  | { kind: "not_configured"; missing: string[] }
  /** Brevo answered with an error status (bad key, unverified sender, blocked IP, rate limit, 5xx ...). */
  | { kind: "rejected"; status: number; code: string; detail: string }
  /** Brevo answered 2xx but without the confirmation a real send returns. */
  | { kind: "unconfirmed"; status: number }
  /** No complete answer within the time limit. The message may or may not have been accepted. */
  | { kind: "timeout" }
  /** The connection failed before an answer arrived. */
  | { kind: "network"; code: string };

/** Interprets Brevo's reply. Pure and dependency-free so it can be unit tested. */
export function classifyBrevoResponse(status: number, bodyText: string): EmailOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    parsed = undefined;
  }
  const body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};

  if (status >= 200 && status < 300) {
    const messageId =
      typeof body.messageId === "string" && body.messageId
        ? body.messageId
        : Array.isArray(body.messageIds) && typeof body.messageIds[0] === "string"
          ? (body.messageIds[0] as string)
          : "";
    return messageId ? { kind: "sent", messageId } : { kind: "unconfirmed", status };
  }

  // Brevo error bodies look like {"code":"unauthorized","message":"Key not found"}.
  const code = typeof body.code === "string" ? body.code.slice(0, 60) : "unknown";
  const detail = typeof body.message === "string" ? stripControlChars(body.message).slice(0, 200) : "no message";
  return { kind: "rejected", status, code, detail };
}

export type SendEmailOptions = {
  /** Replaceable in tests. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

function causeCode(error: unknown): string {
  const direct = (error as { code?: unknown } | null)?.code;
  if (typeof direct === "string") return direct;
  const nested = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  return typeof nested === "string" ? nested : "UNKNOWN";
}

/**
 * Sends one transactional email. Never throws and never retries. The API key is only ever placed
 * in the request header, and none of the returned values can contain it.
 */
export async function sendBrevoEmail(
  message: BrevoMessage,
  config: BrevoConfig,
  { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }: SendEmailOptions = {},
): Promise<EmailOutcome> {
  try {
    const response = await fetchImpl(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": config.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(buildBrevoPayload(message, config)),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return classifyBrevoResponse(response.status, await response.text());
  } catch (error) {
    const name = (error as { name?: unknown } | null)?.name;
    if (name === "TimeoutError" || name === "AbortError") return { kind: "timeout" };
    return { kind: "network", code: causeCode(error) };
  }
}
