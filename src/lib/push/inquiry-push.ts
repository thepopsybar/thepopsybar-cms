import { createServiceClient } from "@/lib/supabase/service";
import { getVapidConfig } from "./config";
import { enqueueAndDeliver, type PushSender, type PushStore } from "./deliver";
import { createWebPushSender } from "./sender";
import { createSupabasePushStore } from "./store-supabase";

export type PushOutcome = { kind: "sent" } | { kind: "partial"; reason: string } | { kind: "skipped"; reason: string } | { kind: "failed"; reason: string };

type Deps = { store?: PushStore; sender?: PushSender; env?: Record<string, string | undefined> };

/**
 * Called by /api/inquiries ONLY after a brand-new website inquiry row was inserted.
 * Writes an outbox row per admin device first (so nothing is lost if delivery is interrupted),
 * then delivers. Safe to call twice for the same inquiry: the second call creates no rows and sends nothing.
 */
export async function sendInquiryPush(inquiryId: string, deps: Deps = {}): Promise<PushOutcome> {
  let store = deps.store;
  let sender = deps.sender;
  if (!sender) {
    const config = getVapidConfig(deps.env);
    if (!config.ok) return { kind: "skipped", reason: config.message };
    sender = await createWebPushSender(config);
  }
  if (!store) {
    const db = createServiceClient();
    if (!db) return { kind: "skipped", reason: "SUPABASE_SERVICE_ROLE_KEY is not set." };
    store = createSupabasePushStore(db);
  }
  const summary = await enqueueAndDeliver(store, sender, inquiryId);
  if (summary.devices === 0) return { kind: "skipped", reason: "No admin devices are subscribed." };
  if (summary.queued === 0) return { kind: "skipped", reason: "Already queued for this inquiry." };
  if (summary.retry + summary.dead > 0) {
    return { kind: summary.sent > 0 ? "partial" : "failed", reason: `sent=${summary.sent} retry=${summary.retry} expired=${summary.expired} dead=${summary.dead}` };
  }
  return summary.sent > 0 ? { kind: "sent" } : { kind: "skipped", reason: "All subscriptions had expired." };
}
