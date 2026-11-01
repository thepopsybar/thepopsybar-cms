import { decodeBase64Url } from "./config";

/**
 * The server will POST to whatever endpoint is registered, so only genuine browser push services
 * are accepted (Chrome/Edge/Android, Firefox, Safari/iOS, legacy Edge/Windows).
 */
const ALLOWED_PUSH_HOSTS = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "push.services.mozilla.com",
  "push.apple.com",
  "notify.windows.com",
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  if (typeof endpoint !== "string" || endpoint.length === 0 || endpoint.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return ALLOWED_PUSH_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export type CleanSubscription = { endpoint: string; p256dh: string; auth: string };

/** Validates the browser's PushSubscription.toJSON() output. Never trusts any other field. */
export function validatePushSubscription(raw: unknown): { ok: true; value: CleanSubscription } | { ok: false; message: string } {
  const bad = { ok: false as const, message: "That device’s notification subscription looks invalid. Try turning notifications off and on again." };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return bad;
  const input = raw as { endpoint?: unknown; keys?: unknown };
  if (typeof input.endpoint !== "string" || !isAllowedPushEndpoint(input.endpoint)) return bad;
  const keys = input.keys && typeof input.keys === "object" ? (input.keys as { p256dh?: unknown; auth?: unknown }) : null;
  if (!keys || typeof keys.p256dh !== "string" || typeof keys.auth !== "string") return bad;
  const p256dh = decodeBase64Url(keys.p256dh);
  const auth = decodeBase64Url(keys.auth);
  if (!p256dh || p256dh.length !== 65 || p256dh[0] !== 4) return bad;
  if (!auth || auth.length !== 16) return bad;
  return { ok: true, value: { endpoint: input.endpoint, p256dh: keys.p256dh, auth: keys.auth } };
}
