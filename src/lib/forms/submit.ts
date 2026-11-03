export type SubmitResult = { ok: boolean; message: string };

type ApiReply = { ok?: unknown; message?: unknown; code?: unknown; saved?: unknown };

const API_TIMEOUT_MS = 30000;
const GENERIC_ERROR = "We couldn’t send your inquiry. Please try again shortly or contact us directly.";

function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => window.clearTimeout(timer));
}

/**
 * Sends an inquiry through our same-origin API route (/api/inquiries). The server validates it,
 * saves it, and sends the notification email. Reports success when the server confirms the inquiry
 * was received (saved), which is also the case when the notification email could not be confirmed.
 * Nothing is ever resubmitted automatically.
 */
export async function submitInquiry(fields: Record<string, string>, subject: string, token?: string): Promise<SubmitResult> {
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
    return { ok: res.ok && data.ok === true, message };
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
