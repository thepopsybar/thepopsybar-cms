/**
 * Interprets FormSubmit's AJAX response. Pure and dependency-free, so it is shared by the
 * server route and the browser fallback and can be unit tested.
 * FormSubmit's documented AJAX reply is JSON such as {"success":"true","message":"..."}.
 */
export type UpstreamVerdict =
  | { kind: "accepted" }
  | { kind: "activation" }
  | { kind: "rejected"; status: number; detail: string }
  | { kind: "malformed"; status: number };

export function classifyFormSubmitResponse(status: number, bodyText: string): UpstreamVerdict {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return { kind: "malformed", status }; // e.g. an HTML challenge or error page
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { kind: "malformed", status };

  const { success, message } = parsed as { success?: unknown; message?: unknown };
  const text = typeof message === "string" ? message.slice(0, 200) : "";
  const succeeded = success === true || success === "true";

  // An address FormSubmit has not activated yet does not receive mail, whatever else the reply says.
  if (/activat/i.test(text)) return { kind: "activation" };
  if (status >= 200 && status < 300 && succeeded) return { kind: "accepted" };
  return { kind: "rejected", status, detail: text || "no message" };
}
