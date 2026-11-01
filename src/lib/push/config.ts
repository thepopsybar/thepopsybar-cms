/**
 * VAPID configuration for Web Push. Read lazily (never at import time) so a missing value
 * produces a clear, non-sensitive message instead of crashing the build or the inquiry form.
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY  public, also used by the browser to subscribe
 *   VAPID_PRIVATE_KEY             SERVER-ONLY secret
 *   VAPID_SUBJECT                 optional, "mailto:you@example.com" or an https URL
 */
export type VapidConfig =
  | { ok: true; publicKey: string; privateKey: string; subject: string }
  | { ok: false; missing: string[]; message: string };

const B64URL = /^[A-Za-z0-9_-]+$/;

export function decodeBase64Url(value: string): Buffer | null {
  if (!value || !B64URL.test(value)) return null;
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** An uncompressed P-256 point: 65 bytes starting with 0x04. */
export function isValidVapidPublicKey(value: string): boolean {
  const bytes = decodeBase64Url(value);
  return Boolean(bytes && bytes.length === 65 && bytes[0] === 4);
}

export function isValidVapidPrivateKey(value: string): boolean {
  return decodeBase64Url(value)?.length === 32;
}

export function getVapidConfig(env: Record<string, string | undefined> = process.env): VapidConfig {
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = env.VAPID_SUBJECT?.trim() || (env.NEXT_PUBLIC_SITE_URL?.trim() || "https://thepopsybar.com");

  const missing: string[] = [];
  if (!publicKey) missing.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  if (!privateKey) missing.push("VAPID_PRIVATE_KEY");
  if (missing.length) {
    return { ok: false, missing, message: `Push notifications are not configured. Missing: ${missing.join(", ")}.` };
  }

  const invalid: string[] = [];
  if (!isValidVapidPublicKey(publicKey)) invalid.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  if (!isValidVapidPrivateKey(privateKey)) invalid.push("VAPID_PRIVATE_KEY");
  if (!/^(mailto:[^\s@]+@[^\s@]+|https:\/\/\S+)$/.test(subject)) invalid.push("VAPID_SUBJECT");
  if (invalid.length) {
    return { ok: false, missing: invalid, message: `Push notification settings are invalid: ${invalid.join(", ")}.` };
  }
  return { ok: true, publicKey, privateKey, subject };
}
