import type { SupabaseClient } from "@supabase/supabase-js";
import { getVapidConfig } from "./config";
import type { DeviceSub, PushSender } from "./deliver";
import { buildTestPayload, classifyPushError, statusCodeOf } from "./payload";
import { isAllowedPushEndpoint, validatePushSubscription } from "./validate";

/** What the admin server actions receive after getAdminContext() says "ok"; null means "not an admin". */
export type AdminLike = { supabase: SupabaseClient } | null;

export type PushActionResult = { ok: true; message?: string } | { ok: false; message: string };

const NOT_AUTHORIZED: PushActionResult = { ok: false, message: "You are not signed in as an administrator. Please sign in again." };

/**
 * Registers the CALLING admin's device. The owner is decided inside the database function from the
 * caller's own session (auth.uid()), never from anything the browser sends.
 */
export async function registerPushSubscription(admin: AdminLike, raw: unknown): Promise<PushActionResult> {
  if (!admin) return NOT_AUTHORIZED;
  const checked = validatePushSubscription(raw);
  if (!checked.ok) return { ok: false, message: checked.message };
  const { error } = await admin.supabase.rpc("register_admin_push_subscription", {
    p_endpoint: checked.value.endpoint,
    p_p256dh: checked.value.p256dh,
    p_auth: checked.value.auth,
  });
  if (error) {
    console.error("[push] register failed", { code: error.code });
    if (error.code === "42883" || error.code === "PGRST202") {
      return { ok: false, message: "Push notifications aren’t set up in the database yet. Run the push notifications SQL migration." };
    }
    return { ok: false, message: "Couldn’t save this device. Please try again." };
  }
  return { ok: true };
}

/** Removes the calling admin's own row for this endpoint (row-level security blocks anyone else's). */
export async function unregisterPushSubscription(admin: AdminLike, endpoint: unknown): Promise<PushActionResult> {
  if (!admin) return NOT_AUTHORIZED;
  if (typeof endpoint !== "string" || !isAllowedPushEndpoint(endpoint)) return { ok: false, message: "That device could not be found." };
  const { error } = await admin.supabase.from("admin_push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) {
    console.error("[push] unregister failed", { code: error.code });
    return { ok: false, message: "Couldn’t remove this device from the server." };
  }
  return { ok: true };
}

type TestDeps = { sender?: PushSender; env?: Record<string, string | undefined> };

/** Sends a test notification to the calling admin's OWN devices only. */
export async function sendTestPush(admin: AdminLike, deps: TestDeps = {}): Promise<PushActionResult> {
  if (!admin) return NOT_AUTHORIZED;
  let sender = deps.sender;
  if (!sender) {
    const config = getVapidConfig(deps.env);
    if (!config.ok) return { ok: false, message: config.message };
    const { createWebPushSender } = await import("./sender");
    sender = await createWebPushSender(config);
  }
  const { data, error } = await admin.supabase.from("admin_push_subscriptions").select("id, endpoint, p256dh_key, auth_key").eq("is_active", true);
  if (error) return { ok: false, message: "Couldn’t load your devices. Please try again." };
  const devices: DeviceSub[] = (data ?? []).map((s: { id: string; endpoint: string; p256dh_key: string; auth_key: string }): DeviceSub => ({ id: s.id, endpoint: s.endpoint, p256dh: s.p256dh_key, auth: s.auth_key }));
  if (devices.length === 0) return { ok: false, message: "No devices are subscribed yet. Turn notifications on first." };

  const payload = JSON.stringify(buildTestPayload());
  let sent = 0;
  let failed = 0;
  await Promise.all(
    devices.map(async (device) => {
      try {
        await sender(device, payload);
        sent++;
      } catch (e) {
        failed++;
        // A subscription the push service has dropped is removed (the admin may delete their own rows).
        if (classifyPushError(statusCodeOf(e)) === "expired") await admin.supabase.from("admin_push_subscriptions").delete().eq("id", device.id);
      }
    }),
  );
  if (sent === 0) return { ok: false, message: "The test notification couldn’t be delivered. Try turning notifications off and on again on this device." };
  return { ok: true, message: failed ? `Sent to ${sent} device(s); ${failed} could not be reached.` : `Test notification sent to ${sent} device(s).` };
}
