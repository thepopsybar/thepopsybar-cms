import { buildInquiryPayload, classifyPushError, MAX_ATTEMPTS, nextAttemptDelayMs, statusCodeOf, type PushPayload } from "./payload";

export type DeviceSub = { id: string; endpoint: string; p256dh: string; auth: string };
export type OutboxJob = { id: string; inquiryId: string; attempts: number; device: DeviceSub };

/** Sends one encrypted push. Must reject with an error carrying `statusCode` when the push service answers with an HTTP error. */
export type PushSender = (device: DeviceSub, payload: string) => Promise<void>;

/** Everything delivery needs from the database. Supabase implementation: store-supabase.ts. */
export interface PushStore {
  /** Active devices that belong to users who are CURRENTLY in public.admins. */
  listActiveDevices(): Promise<DeviceSub[]>;
  /** Creates one outbox row per (inquiry, device). Rows that already exist are skipped. Returns only the NEW row ids. */
  enqueue(inquiryId: string, deviceIds: string[]): Promise<string[]>;
  /** Atomically takes rows that are due and moves them to "sending" (attempts + 1). Returns only rows this call won. */
  claim(ids: string[], now: Date): Promise<OutboxJob[]>;
  listDueIds(now: Date, limit: number): Promise<string[]>;
  markSent(job: OutboxJob, now: Date): Promise<void>;
  markFailed(job: OutboxJob, info: { status: "failed" | "dead"; statusCode?: number; error: string; nextAttemptAt: Date | null }): Promise<void>;
  /** The push service reported the subscription gone: close the row and deactivate the device. */
  markExpired(job: OutboxJob, now: Date): Promise<void>;
}

export type DeliverySummary = { devices: number; queued: number; sent: number; retry: number; expired: number; dead: number };
const empty = (): DeliverySummary => ({ devices: 0, queued: 0, sent: 0, retry: 0, expired: 0, dead: 0 });

async function runJobs(store: PushStore, send: PushSender, jobs: OutboxJob[], now: () => Date, summary: DeliverySummary) {
  await Promise.all(
    jobs.map(async (job) => {
      const payload: PushPayload = buildInquiryPayload(job.inquiryId);
      try {
        await send(job.device, JSON.stringify(payload));
        await store.markSent(job, now());
        summary.sent++;
      } catch (error) {
        const statusCode = statusCodeOf(error);
        const kind = classifyPushError(statusCode);
        // Only a status code or a generic label is stored: never the endpoint, keys or error body.
        const label = statusCode ? `HTTP ${statusCode}` : "network-error";
        if (kind === "expired") {
          await store.markExpired(job, now());
          summary.expired++;
        } else if (kind === "retry" && job.attempts < MAX_ATTEMPTS) {
          await store.markFailed(job, { status: "failed", statusCode, error: label, nextAttemptAt: new Date(now().getTime() + nextAttemptDelayMs(job.attempts)) });
          summary.retry++;
        } else {
          await store.markFailed(job, { status: "dead", statusCode, error: kind === "retry" ? `${label} (gave up)` : label, nextAttemptAt: null });
          summary.dead++;
        }
      }
    }),
  );
}

/**
 * New website inquiry: create exactly one outbox row per active admin device, then deliver them.
 * Calling this again for the same inquiry creates no new rows, so no device is notified twice.
 * Failures stay in the outbox for processDueOutbox() to retry.
 */
export async function enqueueAndDeliver(store: PushStore, send: PushSender, inquiryId: string, now: () => Date = () => new Date()): Promise<DeliverySummary> {
  const summary = empty();
  const devices = await store.listActiveDevices();
  summary.devices = devices.length;
  if (devices.length === 0) return summary;
  const created = await store.enqueue(inquiryId, devices.map((d) => d.id));
  summary.queued = created.length;
  if (created.length === 0) return summary;
  const jobs = await store.claim(created, now());
  await runJobs(store, send, jobs, now, summary);
  return summary;
}

/** Retry pass (cron / manual): delivers rows that are due or whose worker crashed mid-send. */
export async function processDueOutbox(store: PushStore, send: PushSender, now: () => Date = () => new Date(), limit = 25): Promise<DeliverySummary> {
  const summary = empty();
  const ids = await store.listDueIds(now(), limit);
  if (ids.length === 0) return summary;
  const jobs = await store.claim(ids, now());
  summary.queued = jobs.length;
  await runJobs(store, send, jobs, now, summary);
  return summary;
}
