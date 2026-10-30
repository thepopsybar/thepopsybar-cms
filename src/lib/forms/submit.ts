import { classifyFormSubmitResponse } from "@/lib/inquiry/classify";

export type SubmitResult = { ok: boolean; message: string };

type ApiReply = { ok?: unknown; message?: unknown; code?: unknown; retrySafe?: unknown; fallbackEndpoint?: unknown; saved?: unknown };

const API_TIMEOUT_MS = 30000;
const DIRECT_TIMEOUT_MS = 20000;
const GENERIC_ERROR = "We couldn’t send your inquiry. Please try again shortly or contact us directly.";

function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => window.clearTimeout(timer));
}

/**
 * One direct browser call to FormSubmit's documented AJAX endpoint. Used at most once, and only
 * when the server told us the request provably never left it (so nothing can be sent twice).
 */
async function sendDirect(endpoint: string, fields: Record<string, string>, subject: string): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...fields, _subject: subject, _template: "table", _captcha: "false" }),
      },
      DIRECT_TIMEOUT_MS,
    );
    return classifyFormSubmitResponse(res.status, await res.text()).kind === "accepted";
  } catch {
    return false;
  }
}

/**
 * Sends an inquiry through our same-origin API route (/api/inquiries). Reports success only when
 * the API (or, in the one safe fallback case, FormSubmit itself) confirms acceptance.
 * Nothing is ever resubmitted automatically after a request may have been delivered.
 */
export async function submitToFormSubmit(fields: Record<string, string>, subject: string, token?: string): Promise<SubmitResult> {
  try {
    const res = await fetchWithTimeout(
      "/api/inquiries",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...fields, _subject: subject, ...(token ? { _token: token } : {}) }),
      },
      API_TIMEOUT_MS,
    );

    let data: ApiReply = {};
    try {
      data = (await res.json()) as ApiReply;
    } catch {
      /* non-JSON reply: treated as a failure below */
    }
    const message = typeof data.message === "string" ? data.message : GENERIC_ERROR;

    if (res.ok && data.ok === true) return { ok: true, message };

    if (data.retrySafe === true && typeof data.fallbackEndpoint === "string" && data.fallbackEndpoint.startsWith("https://")) {
      if (await sendDirect(data.fallbackEndpoint, fields, subject)) {
        return { ok: true, message: "Thank you! Your inquiry has been sent. We’ll be in touch soon." };
      }
      // The inquiry is stored even though neither email route confirmed, so don't ask them to resend.
      if (data.saved === true) {
        return {
          ok: true,
          message:
            "Thank you! Your inquiry has been received and saved. We couldn’t confirm our email notification, but our team will see it.",
        };
      }
    }
    return { ok: false, message };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    return {
      ok: false,
      message: aborted
        ? "This is taking longer than expected, so we can’t confirm your message was delivered. Please don’t resubmit; contact us directly to be sure."
        : "We couldn’t reach the website’s form endpoint. Check your connection and try again.",
    };
  }
}

/** Collects a <form>'s text fields, skipping the honeypot and empty values. */
export function formToFields(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  new FormData(form).forEach((value, key) => {
    if (typeof value !== "string" || key.startsWith("_") || key === "website") return;
    const trimmed = value.trim();
    if (trimmed) out[key] = trimmed;
  });
  return out;
}
