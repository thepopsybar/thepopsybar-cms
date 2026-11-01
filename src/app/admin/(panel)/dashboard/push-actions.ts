"use server";

import { getAdminContext } from "@/lib/admin";
import * as core from "@/lib/push/admin-core";
import type { PushActionResult } from "@/lib/push/admin-core";

async function admin(): Promise<core.AdminLike> {
  const ctx = await getAdminContext();
  return ctx.state === "ok" ? { supabase: ctx.supabase } : null;
}

export async function registerPushDevice(subscription: unknown): Promise<PushActionResult> {
  return core.registerPushSubscription(await admin(), subscription);
}

export async function unregisterPushDevice(endpoint: string): Promise<PushActionResult> {
  return core.unregisterPushSubscription(await admin(), endpoint);
}

export async function sendTestNotification(): Promise<PushActionResult> {
  return core.sendTestPush(await admin());
}
