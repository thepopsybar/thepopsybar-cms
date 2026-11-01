import type { PushSender } from "./deliver";
import type { VapidConfig } from "./config";

/**
 * Real sender backed by the `web-push` library (Node runtime only: it uses Node's crypto/https).
 * The library is imported lazily so unit tests and routes that never send don't load it.
 */
export async function createWebPushSender(config: Extract<VapidConfig, { ok: true }>): Promise<PushSender> {
  const mod = await import("web-push");
  const webpush = (mod as unknown as { default?: typeof mod }).default ?? mod;
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return async (device, payload) => {
    await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, payload, {
      TTL: 24 * 60 * 60, // drop it if the phone is unreachable for a day
      urgency: "high",
      timeout: 8000,
    });
  };
}
