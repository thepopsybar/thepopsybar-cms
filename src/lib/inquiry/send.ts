import { classifyFormSubmitResponse } from "./classify";
import { TransportError, postJson, type TransportOptions, type TransportResponse } from "./transport";

export type SendOutcome =
  | { kind: "accepted" }
  | { kind: "activation" }
  | { kind: "rejected"; status: number; detail: string }
  | { kind: "malformed"; status: number }
  /** Never left this server (DNS/connect/TLS failure or connect timeout): safe to retry. */
  | { kind: "unreachable"; code: string }
  /** Request was sent but no complete answer arrived: it may or may not have been delivered. */
  | { kind: "timeout" }
  | { kind: "network"; code: string };

type Transport = (url: string, body: string, headers: Record<string, string>, options?: TransportOptions) => Promise<TransportResponse>;

export type SendOptions = { transport?: Transport; timeouts?: TransportOptions };

/** Sends one inquiry to FormSubmit exactly once and classifies what happened. Never retries. */
export async function sendToFormSubmit(
  endpoint: string,
  payload: Record<string, string>,
  siteOrigin: string,
  { transport = postJson, timeouts }: SendOptions = {},
): Promise<SendOutcome> {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    // FormSubmit's AJAX endpoint is built for browser calls, so identify the site the way a browser would.
    Origin: siteOrigin,
    Referer: `${siteOrigin}/`,
    "User-Agent": "Mozilla/5.0 (compatible; ThePopsyBar-Website/1.0)",
  };

  try {
    const response = await transport(endpoint, JSON.stringify(payload), headers, timeouts);
    return classifyFormSubmitResponse(response.status, response.text);
  } catch (error) {
    if (error instanceof TransportError) {
      if (error.phase === "unsent") {
        return { kind: "unreachable", code: error.code ?? (error.reason === "timeout" ? "CONNECT_TIMEOUT" : "UNKNOWN") };
      }
      return error.reason === "timeout" ? { kind: "timeout" } : { kind: "network", code: error.code ?? "UNKNOWN" };
    }
    return { kind: "network", code: "UNEXPECTED" };
  }
}
