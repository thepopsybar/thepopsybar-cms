import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeviceSub, OutboxJob, PushStore } from "./deliver";
import { MAX_ATTEMPTS } from "./payload";

const STALE_SENDING_MS = 5 * 60_000;

type ClaimRow = { id: string; inquiry_id: string; attempts: number; subscription_id: string; endpoint: string; p256dh_key: string; auth_key: string };

/** PushStore backed by Supabase. Must be given the SERVICE-ROLE client (server-only). */
export function createSupabasePushStore(db: SupabaseClient): PushStore {
  return {
    async listActiveDevices() {
      const admins = await db.from("admins").select("user_id");
      if (admins.error) throw new Error("admins-query-failed");
      const ids = (admins.data ?? []).map((row: { user_id: string }) => row.user_id);
      if (ids.length === 0) return [];
      const subs = await db
        .from("admin_push_subscriptions")
        .select("id, endpoint, p256dh_key, auth_key")
        .eq("is_active", true)
        .in("user_id", ids);
      if (subs.error) throw new Error("subscriptions-query-failed");
      return (subs.data ?? []).map((s: { id: string; endpoint: string; p256dh_key: string; auth_key: string }): DeviceSub => ({
        id: s.id,
        endpoint: s.endpoint,
        p256dh: s.p256dh_key,
        auth: s.auth_key,
      }));
    },

    async enqueue(inquiryId, deviceIds) {
      // ON CONFLICT DO NOTHING on (inquiry_id, subscription_id): only genuinely new rows come back.
      const { data, error } = await db
        .from("admin_push_outbox")
        .upsert(
          deviceIds.map((subscription_id) => ({ inquiry_id: inquiryId, subscription_id })),
          { onConflict: "inquiry_id,subscription_id", ignoreDuplicates: true },
        )
        .select("id");
      if (error) throw new Error("enqueue-failed");
      return (data ?? []).map((row: { id: string }) => row.id);
    },

    async claim(ids, now) {
      if (ids.length === 0) return [];
      const { data, error } = await db.rpc("claim_push_outbox", { p_ids: ids, p_now: now.toISOString() });
      if (error) throw new Error("claim-failed");
      return ((data ?? []) as ClaimRow[]).map(
        (row): OutboxJob => ({
          id: row.id,
          inquiryId: row.inquiry_id,
          attempts: row.attempts,
          device: { id: row.subscription_id, endpoint: row.endpoint, p256dh: row.p256dh_key, auth: row.auth_key },
        }),
      );
    },

    async listDueIds(now, limit) {
      const iso = now.toISOString();
      const staleBefore = new Date(now.getTime() - STALE_SENDING_MS).toISOString();
      const [due, stale] = await Promise.all([
        db.from("admin_push_outbox").select("id").in("status", ["pending", "failed"]).lte("next_attempt_at", iso).lt("attempts", MAX_ATTEMPTS).order("next_attempt_at").limit(limit),
        db.from("admin_push_outbox").select("id").eq("status", "sending").lt("locked_at", staleBefore).lt("attempts", MAX_ATTEMPTS).limit(limit),
      ]);
      if (due.error || stale.error) throw new Error("due-query-failed");
      return [...new Set([...(due.data ?? []), ...(stale.data ?? [])].map((r: { id: string }) => r.id))].slice(0, limit);
    },

    async markSent(job, now) {
      await db.from("admin_push_outbox").update({ status: "sent", sent_at: now.toISOString(), locked_at: null, last_error: null, last_status_code: null }).eq("id", job.id);
      await db.from("admin_push_subscriptions").update({ last_success_at: now.toISOString() }).eq("id", job.device.id);
    },

    async markFailed(job, info) {
      await db
        .from("admin_push_outbox")
        .update({
          status: info.status,
          locked_at: null,
          last_status_code: info.statusCode ?? null,
          last_error: info.error,
          ...(info.nextAttemptAt ? { next_attempt_at: info.nextAttemptAt.toISOString() } : {}),
        })
        .eq("id", job.id);
    },

    async markExpired(job, now) {
      await db.from("admin_push_outbox").update({ status: "expired", locked_at: null, last_status_code: 410, last_error: "subscription-expired" }).eq("id", job.id);
      await db.from("admin_push_subscriptions").update({ is_active: false, expired_at: now.toISOString() }).eq("id", job.device.id);
    },
  };
}
