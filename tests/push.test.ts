/**
 * Run with:  npm run test:push
 * Covers config, validation, delivery/retry/expiry, idempotency, the handler integration, admin
 * authorization logic and the service worker. Nothing real is contacted: Supabase and the push
 * services are replaced by in-memory fakes. Row Level Security itself needs a live database
 * (see "Manual checks" in the README); here the SQL is only checked for the expected statements.
 */
import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import vm from "node:vm";
import { getVapidConfig, isValidVapidPrivateKey, isValidVapidPublicKey } from "../src/lib/push/config";
import { enqueueAndDeliver, processDueOutbox, type DeviceSub, type OutboxJob, type PushSender, type PushStore } from "../src/lib/push/deliver";
import { registerPushSubscription, sendTestPush, unregisterPushSubscription, type AdminLike } from "../src/lib/push/admin-core";
import { sendInquiryPush } from "../src/lib/push/inquiry-push";
import { buildInquiryPayload, classifyPushError, nextAttemptDelayMs } from "../src/lib/push/payload";
import { isAllowedPushEndpoint, validatePushSubscription } from "../src/lib/push/validate";
import { createInquiryHandler } from "../src/lib/inquiry/handler";

const b64u = (b: Buffer) => b.toString("base64url");
function vapidPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pub = publicKey.export({ format: "jwk" });
  const priv = privateKey.export({ format: "jwk" });
  return {
    publicKey: b64u(Buffer.concat([Buffer.from([4]), Buffer.from(pub.x!, "base64url"), Buffer.from(pub.y!, "base64url")])),
    privateKey: priv.d!,
  };
}
function browserSubscription(host = "fcm.googleapis.com") {
  const { publicKey } = vapidPair(); // same shape as a browser's p256dh key
  return { endpoint: `https://${host}/fcm/send/${b64u(randomBytes(24))}`, expirationTime: null, keys: { p256dh: publicKey, auth: b64u(randomBytes(16)) } };
}
const pushError = (statusCode?: number) => Object.assign(new Error("push failed: secret-endpoint-details"), statusCode ? { statusCode } : {});

describe("VAPID configuration", () => {
  const pair = vapidPair();
  it("reports exactly which variables are missing, without leaking values", () => {
    const r = getVapidConfig({});
    assert.ok(!r.ok);
    if (!r.ok) {
      assert.deepEqual(r.missing, ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"]);
      assert.match(r.message, /not configured/i);
    }
  });
  it("rejects malformed keys and a bad subject", () => {
    const r = getVapidConfig({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: "abc", VAPID_PRIVATE_KEY: pair.privateKey, VAPID_SUBJECT: "nope" });
    assert.ok(!r.ok);
    if (!r.ok) assert.deepEqual(r.missing, ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_SUBJECT"]);
  });
  it("accepts a generated pair and defaults the subject to the site URL", () => {
    assert.ok(isValidVapidPublicKey(pair.publicKey));
    assert.ok(isValidVapidPrivateKey(pair.privateKey));
    const r = getVapidConfig({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: pair.publicKey, VAPID_PRIVATE_KEY: pair.privateKey });
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.subject, "https://thepopsybar.com");
  });
});

describe("subscription validation", () => {
  it("accepts a well-formed subscription from each major push service", () => {
    for (const host of ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com", "wns2-par02p.notify.windows.com"]) {
      assert.ok(validatePushSubscription(browserSubscription(host)).ok, host);
    }
  });
  it("rejects unknown hosts, http, credentials, ports and lookalikes (the server posts to this URL)", () => {
    for (const endpoint of ["https://evil.example/x", "http://fcm.googleapis.com/x", "https://user:pw@fcm.googleapis.com/x", "https://fcm.googleapis.com:8443/x", "https://fcm.googleapis.com.evil.io/x", "https://169.254.169.254/latest", "not a url", ""]) {
      assert.equal(isAllowedPushEndpoint(endpoint), false, endpoint);
    }
  });
  it("rejects bad keys and shapes", () => {
    const good = browserSubscription();
    for (const bad of [null, "x", [], {}, { endpoint: good.endpoint }, { ...good, keys: { p256dh: "short", auth: good.keys.auth } }, { ...good, keys: { p256dh: good.keys.p256dh, auth: "short" } }, { ...good, keys: { p256dh: 5, auth: 5 } }]) {
      assert.ok(!validatePushSubscription(bad).ok);
    }
  });
  it("returns only endpoint and keys, dropping any extra client-supplied fields", () => {
    const r = validatePushSubscription({ ...browserSubscription(), user_id: "attacker", is_active: false });
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(Object.keys(r.value).sort(), ["auth", "endpoint", "p256dh"]);
  });
});

describe("payload and failure policy", () => {
  it("never puts customer details in the notification", () => {
    const p = buildInquiryPayload("11111111-1111-1111-1111-111111111111");
    assert.equal(p.title, "New Event Inquiry — The Popsy Bar");
    assert.equal(p.body, "A new website inquiry has been received. Open the CRM to review it.");
    assert.equal(p.url, "/admin/dashboard");
    assert.deepEqual(Object.keys(p).sort(), ["body", "tag", "title", "url"]);
  });
  it("classifies push-service answers", () => {
    assert.equal(classifyPushError(404), "expired");
    assert.equal(classifyPushError(410), "expired");
    for (const c of [undefined, 429, 500, 503]) assert.equal(classifyPushError(c), "retry");
    for (const c of [400, 401, 403, 413]) assert.equal(classifyPushError(c), "dead");
  });
  it("backs off progressively", () => {
    assert.ok(nextAttemptDelayMs(1) < nextAttemptDelayMs(2) && nextAttemptDelayMs(2) < nextAttemptDelayMs(3));
  });
});

/** In-memory PushStore that mirrors the SQL (unique key, atomic claim, stale-lock recovery). */
type Row = { id: string; inquiryId: string; deviceId: string; status: "pending" | "sending" | "sent" | "failed" | "expired" | "dead"; attempts: number; nextAt: Date; lockedAt: Date | null; lastError: string | null; lastCode: number | null };
function memoryStore(devices: DeviceSub[]) {
  const rows: Row[] = [];
  const active = new Set(devices.map((d) => d.id));
  let n = 0;
  const store: PushStore = {
    async listActiveDevices() {
      return devices.filter((d) => active.has(d.id));
    },
    async enqueue(inquiryId, deviceIds) {
      const created: string[] = [];
      for (const deviceId of deviceIds) {
        if (rows.some((r) => r.inquiryId === inquiryId && r.deviceId === deviceId)) continue;
        const row: Row = { id: `row-${++n}`, inquiryId, deviceId, status: "pending", attempts: 0, nextAt: new Date(0), lockedAt: null, lastError: null, lastCode: null };
        rows.push(row);
        created.push(row.id);
      }
      return created;
    },
    async claim(ids, now) {
      const jobs: OutboxJob[] = [];
      for (const row of rows) {
        const due = (["pending", "failed"].includes(row.status) && row.nextAt <= now) || (row.status === "sending" && row.lockedAt! < new Date(now.getTime() - 5 * 60_000));
        if (!ids.includes(row.id) || !due || row.attempts >= 5 || !active.has(row.deviceId)) continue;
        row.status = "sending";
        row.attempts++;
        row.lockedAt = now;
        jobs.push({ id: row.id, inquiryId: row.inquiryId, attempts: row.attempts, device: devices.find((d) => d.id === row.deviceId)! });
      }
      return jobs;
    },
    async listDueIds(now, limit) {
      return rows
        .filter((r) => r.attempts < 5 && ((["pending", "failed"].includes(r.status) && r.nextAt <= now) || (r.status === "sending" && r.lockedAt! < new Date(now.getTime() - 5 * 60_000))))
        .slice(0, limit)
        .map((r) => r.id);
    },
    async markSent(job) {
      Object.assign(rows.find((r) => r.id === job.id)!, { status: "sent", lockedAt: null });
    },
    async markFailed(job, info) {
      const row = rows.find((r) => r.id === job.id)!;
      Object.assign(row, { status: info.status, lockedAt: null, lastError: info.error, lastCode: info.statusCode ?? null });
      if (info.nextAttemptAt) row.nextAt = info.nextAttemptAt;
    },
    async markExpired(job) {
      Object.assign(rows.find((r) => r.id === job.id)!, { status: "expired", lockedAt: null });
      active.delete(job.device.id);
    },
  };
  return { store, rows, active };
}
const devs = (n: number): DeviceSub[] => Array.from({ length: n }, (_, i) => ({ id: `dev-${i + 1}`, endpoint: `https://fcm.googleapis.com/fcm/send/${i + 1}`, p256dh: "p", auth: "a" }));
const INQ = "11111111-1111-1111-1111-111111111111";

describe("outbox delivery", () => {
  it("sends one notification per device, once", async () => {
    const { store } = memoryStore(devs(2));
    const sent: string[] = [];
    const sender: PushSender = async (d, payload) => {
      sent.push(d.id);
      assert.equal(JSON.parse(payload).url, "/admin/dashboard");
    };
    const first = await enqueueAndDeliver(store, sender, INQ);
    assert.deepEqual({ devices: first.devices, queued: first.queued, sent: first.sent }, { devices: 2, queued: 2, sent: 2 });
    const again = await enqueueAndDeliver(store, sender, INQ); // the same inquiry retried
    assert.equal(again.queued, 0);
    assert.deepEqual(sent.sort(), ["dev-1", "dev-2"]);
  });
  it("does nothing when no admin device is subscribed", async () => {
    const { store } = memoryStore([]);
    let calls = 0;
    const r = await enqueueAndDeliver(store, async () => void calls++, INQ);
    assert.equal(r.devices, 0);
    assert.equal(calls, 0);
  });
  it("404/410 deactivates the device and is never retried", async () => {
    for (const code of [404, 410]) {
      const { store, rows, active } = memoryStore(devs(1));
      let calls = 0;
      const sender: PushSender = async () => {
        calls++;
        throw pushError(code);
      };
      const r = await enqueueAndDeliver(store, sender, INQ);
      assert.equal(r.expired, 1);
      assert.equal(rows[0].status, "expired");
      assert.equal(active.has("dev-1"), false);
      await processDueOutbox(store, sender, () => new Date(Date.now() + 10 * 3600_000));
      assert.equal(calls, 1);
    }
  });
  it("temporary failures are retried after the backoff and then stop once sent", async () => {
    const { store, rows } = memoryStore(devs(1));
    let calls = 0;
    let failing = true;
    const sender: PushSender = async () => {
      calls++;
      if (failing) throw pushError(503);
    };
    const t0 = new Date("2026-10-30T12:00:00Z");
    const r1 = await enqueueAndDeliver(store, sender, INQ, () => t0);
    assert.equal(r1.retry, 1);
    assert.equal(rows[0].status, "failed");
    assert.equal(rows[0].lastError, "HTTP 503"); // generic label only, never the error body or endpoint
    await processDueOutbox(store, sender, () => new Date(t0.getTime() + 10_000)); // too early
    assert.equal(calls, 1);
    failing = false;
    const r2 = await processDueOutbox(store, sender, () => new Date(t0.getTime() + 61_000));
    assert.equal(r2.sent, 1);
    assert.equal(rows[0].status, "sent");
    await processDueOutbox(store, sender, () => new Date(t0.getTime() + 24 * 3600_000));
    assert.equal(calls, 2);
  });
  it("retries only the device that failed, never one that already received it", async () => {
    const { store } = memoryStore(devs(2));
    const hits: string[] = [];
    let dev2Down = true;
    const sender: PushSender = async (d) => {
      hits.push(d.id);
      if (d.id === "dev-2" && dev2Down) throw pushError(500);
    };
    const t0 = new Date("2026-10-30T12:00:00Z");
    await enqueueAndDeliver(store, sender, INQ, () => t0);
    dev2Down = false;
    await processDueOutbox(store, sender, () => new Date(t0.getTime() + 61_000));
    assert.deepEqual(hits.sort(), ["dev-1", "dev-2", "dev-2"]);
  });
  it("gives up after 5 attempts, and immediately for non-retryable errors", async () => {
    const { store, rows } = memoryStore(devs(1));
    const sender: PushSender = async () => {
      throw new Error("network down");
    };
    let t = new Date("2026-10-30T12:00:00Z");
    await enqueueAndDeliver(store, sender, INQ, () => t);
    for (let i = 0; i < 6; i++) {
      t = new Date(t.getTime() + 3 * 3600_000);
      await processDueOutbox(store, sender, () => t);
    }
    assert.equal(rows[0].status, "dead");
    assert.equal(rows[0].attempts, 5);

    const second = memoryStore(devs(1));
    const r = await enqueueAndDeliver(second.store, async () => { throw pushError(403); }, INQ);
    assert.equal(r.dead, 1);
    assert.equal(second.rows[0].status, "dead");
    assert.equal(second.rows[0].attempts, 1);
  });
  it("recovers a row whose worker died mid-send, but not one that is still fresh", async () => {
    const { store, rows } = memoryStore(devs(1));
    await store.enqueue(INQ, ["dev-1"]);
    const t0 = new Date("2026-10-30T12:00:00Z");
    await store.claim([rows[0].id], t0); // worker "crashes" here, row stays 'sending'
    let calls = 0;
    const sender: PushSender = async () => void calls++;
    await processDueOutbox(store, sender, () => new Date(t0.getTime() + 60_000));
    assert.equal(calls, 0);
    await processDueOutbox(store, sender, () => new Date(t0.getTime() + 6 * 60_000));
    assert.equal(calls, 1);
    assert.equal(rows[0].status, "sent");
  });
});

describe("sendInquiryPush", () => {
  it("skips with a clear, non-sensitive reason when VAPID is not configured", async () => {
    const r = await sendInquiryPush(INQ, { env: {}, store: memoryStore(devs(1)).store });
    assert.equal(r.kind, "skipped");
    if (r.kind === "skipped") assert.match(r.reason, /NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY/);
  });
  it("reports sent / skipped / failed", async () => {
    const ok = await sendInquiryPush(INQ, { store: memoryStore(devs(1)).store, sender: async () => {} });
    assert.equal(ok.kind, "sent");
    const none = await sendInquiryPush(INQ, { store: memoryStore([]).store, sender: async () => {} });
    assert.equal(none.kind, "skipped");
    const bad = await sendInquiryPush(INQ, { store: memoryStore(devs(1)).store, sender: async () => { throw pushError(500); } });
    assert.equal(bad.kind, "failed");
  });
});

describe("integration with /api/inquiries", () => {
  const form = { Name: "Sarah Johnson", email: "sarah@x.co", Occasion: "Wedding", "Event date": "2099-12-15", "Guest count": "80", Details: "Hi", _token: "abcd-1234-efgh" };
  function build(sender: PushSender, saveSeq: ("saved" | "duplicate" | "failed")[]) {
    const mem = memoryStore(devs(2));
    const counts = { email: 0, sends: 0, logs: [] as Record<string, unknown>[] };
    let call = 0;
    const handler = createInquiryHandler({
      today: () => "2026-10-30",
      rateLimited: () => false,
      log: (e) => counts.logs.push(e),
      saveToCrm: async (record) => {
        const k = saveSeq[Math.min(call++, saveSeq.length - 1)];
        return k === "saved" ? { kind: "saved", id: INQ, record } : k === "duplicate" ? { kind: "duplicate" } : { kind: "failed", code: "X" };
      },
      notify: (id) => sendInquiryPush(id, { store: mem.store, sender: async (d, p) => { counts.sends++; return sender(d, p); } }),
      sendEmail: async () => { counts.email++; return { kind: "sent", messageId: "<m@test>" }; },
    });
    const post = async () => (await handler(new Request("https://thepopsybar.com/api/inquiries", { method: "POST", body: JSON.stringify(form) }))).json() as Promise<Record<string, unknown>>;
    return { post, counts };
  }
  it("a new inquiry produces exactly one push per device and still sends the email", async () => {
    const { post, counts } = build(async () => {}, ["saved"]);
    const r = await post();
    assert.equal(r.ok, true);
    assert.equal(counts.sends, 2);
    assert.equal(counts.email, 1);
  });
  it("a retried request (duplicate token) sends no second push", async () => {
    const { post, counts } = build(async () => {}, ["saved", "duplicate"]);
    await post();
    await post();
    assert.equal(counts.sends, 2);
    assert.equal(counts.email, 1); // a repeated request must not send a second notification email
  });
  it("no push when the inquiry was not saved", async () => {
    const { post, counts } = build(async () => {}, ["failed"]);
    await post();
    assert.equal(counts.sends, 0);
    assert.equal(counts.email, 0); // the notification email only follows a successful database insert
  });
  it("a push-service outage never loses the inquiry or blocks / repeats the email", async () => {
    const { post, counts } = build(async () => { throw pushError(503); }, ["saved"]);
    const r = await post();
    assert.equal(r.ok, true);
    assert.equal(counts.email, 1);
    assert.ok(counts.logs.some((l) => l.kind === "push-failed"));
  });
});

describe("admin authorization logic", () => {
  type Call = { fn: string; args: unknown };
  function fakeAdmin(over: { rpcError?: { code: string } | null; devices?: unknown[]; deleteError?: boolean } = {}) {
    const calls: Call[] = [];
    const admin = {
      supabase: {
        rpc: async (fn: string, args: unknown) => {
          calls.push({ fn, args });
          return { data: "id", error: over.rpcError ?? null };
        },
        from: (table: string) => ({
          delete: () => ({
            eq: async (col: string, value: unknown) => {
              calls.push({ fn: `delete:${table}`, args: { col, value } });
              return { error: over.deleteError ? { code: "X" } : null };
            },
          }),
          select: () => ({ eq: async () => ({ data: over.devices ?? [], error: null }) }),
        }),
      },
    } as unknown as AdminLike;
    return { admin, calls };
  }
  it("registration: signed-out / non-admin callers can't register and nothing reaches the database", async () => {
    const r = await registerPushSubscription(null, browserSubscription());
    assert.equal(r.ok, false);
  });
  it("registration: invalid payloads are rejected before any database call", async () => {
    const { admin, calls } = fakeAdmin();
    for (const bad of [null, {}, { endpoint: "https://evil.example/x", keys: {} }]) assert.equal((await registerPushSubscription(admin, bad)).ok, false);
    assert.equal(calls.length, 0);
  });
  it("registration: valid payloads call the DB function with ONLY endpoint + keys (no user id from the client)", async () => {
    const { admin, calls } = fakeAdmin();
    const sub = browserSubscription();
    const r = await registerPushSubscription(admin, { ...sub, user_id: "attacker" });
    assert.equal(r.ok, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].fn, "register_admin_push_subscription");
    assert.deepEqual(Object.keys(calls[0].args as object).sort(), ["p_auth", "p_endpoint", "p_p256dh"]);
  });
  it("registration: a database refusal is reported without internal detail", async () => {
    const { admin } = fakeAdmin({ rpcError: { code: "42501" } });
    const r = await registerPushSubscription(admin, browserSubscription());
    assert.equal(r.ok, false);
    if (!r.ok) assert.doesNotMatch(r.message, /42501|rpc|policy/i);
  });
  it("unregister: unauthorized or malformed requests do nothing", async () => {
    assert.equal((await unregisterPushSubscription(null, browserSubscription().endpoint)).ok, false);
    const { admin, calls } = fakeAdmin();
    assert.equal((await unregisterPushSubscription(admin, "https://evil.example/x")).ok, false);
    assert.equal(calls.length, 0);
  });
  it("unregister: deletes by endpoint through the caller's own session (RLS limits it to their rows)", async () => {
    const { admin, calls } = fakeAdmin();
    const endpoint = browserSubscription().endpoint;
    assert.equal((await unregisterPushSubscription(admin, endpoint)).ok, true);
    assert.deepEqual(calls[0], { fn: "delete:admin_push_subscriptions", args: { col: "endpoint", value: endpoint } });
  });
  it("test notification: unauthorized callers can't trigger any send", async () => {
    let sends = 0;
    const r = await sendTestPush(null, { sender: async () => void sends++ });
    assert.equal(r.ok, false);
    assert.equal(sends, 0);
  });
  it("test notification: missing VAPID config gives a useful message and sends nothing", async () => {
    const { admin } = fakeAdmin();
    const r = await sendTestPush(admin, { env: {} });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /VAPID_PRIVATE_KEY/);
  });
  it("test notification: sends to the caller's devices and drops an expired one", async () => {
    const devices = [
      { id: "a", endpoint: "https://fcm.googleapis.com/1", p256dh_key: "p", auth_key: "a" },
      { id: "b", endpoint: "https://fcm.googleapis.com/2", p256dh_key: "p", auth_key: "a" },
    ];
    const { admin, calls } = fakeAdmin({ devices });
    const r = await sendTestPush(admin, { sender: async (d) => { if (d.id === "b") throw pushError(410); } });
    assert.equal(r.ok, true);
    assert.ok(calls.some((c) => c.fn === "delete:admin_push_subscriptions" && (c.args as { value: string }).value === "b"));
  });
});

describe("service worker (public/popsy-push-sw.js)", () => {
  function load() {
    const listeners: Record<string, (e: unknown) => void> = {};
    const shown: { title: string; options: Record<string, unknown> }[] = [];
    const opened: string[] = [];
    let windows: { url: string; focus: () => Promise<void> }[] = [];
    const self = {
      location: { origin: "https://thepopsybar.com" },
      addEventListener: (type: string, fn: (e: unknown) => void) => (listeners[type] = fn),
      skipWaiting: () => {},
      clients: { claim: async () => {}, matchAll: async () => windows, openWindow: async (u: string) => void opened.push(u) },
      registration: { showNotification: async (title: string, options: Record<string, unknown>) => void shown.push({ title, options }) },
    };
    vm.runInNewContext(fs.readFileSync(path.join(process.cwd(), "public/popsy-push-sw.js"), "utf8"), { self, URL, Promise });
    const run = async (type: string, event: Record<string, unknown>) => {
      let pending: Promise<unknown> = Promise.resolve();
      listeners[type]({ ...event, waitUntil: (p: Promise<unknown>) => (pending = p) });
      await pending;
    };
    return { run, shown, opened, setWindows: (w: typeof windows) => (windows = w) };
  }
  it("shows the notification from a valid payload", async () => {
    const sw = load();
    await sw.run("push", { data: { json: () => ({ title: "New Event Inquiry — The Popsy Bar", body: "A new website inquiry has been received.", url: "/admin/dashboard", tag: "inquiry-1" }) } });
    assert.equal(sw.shown.length, 1);
    assert.equal(sw.shown[0].title, "New Event Inquiry — The Popsy Bar");
    assert.equal(sw.shown[0].options.tag, "inquiry-1");
  });
  it("still shows a safe default for empty, malformed or hostile payloads", async () => {
    const sw = load();
    await sw.run("push", { data: null });
    await sw.run("push", { data: { json: () => { throw new SyntaxError("bad"); } } });
    await sw.run("push", { data: { json: () => ({ title: 5, body: {}, url: "https://evil.example/", tag: 1 }) } });
    assert.equal(sw.shown.length, 3);
    for (const n of sw.shown) {
      assert.equal(typeof n.title, "string");
      assert.equal((n.options.data as { url: string }).url, "/admin/dashboard"); // read as a value: objects from the vm sandbox have another prototype
    }
  });
  it("opens the CRM on click, or focuses an already-open admin tab", async () => {
    const sw = load();
    await sw.run("notificationclick", { notification: { close() {}, data: { url: "/admin/dashboard" } } });
    assert.deepEqual(sw.opened, ["https://thepopsybar.com/admin/dashboard"]);
    let focused = false;
    sw.setWindows([{ url: "https://thepopsybar.com/admin/dashboard", focus: async () => void (focused = true) }]);
    await sw.run("notificationclick", { notification: { close() {}, data: { url: "//evil.example/x" } } });
    assert.equal(focused, true);
    assert.equal(sw.opened.length, 1);
  });
  it("has no fetch handler, so it can't interfere with the website", () => {
    assert.ok(!/addEventListener\(\s*["']fetch["']/.test(fs.readFileSync(path.join(process.cwd(), "public/popsy-push-sw.js"), "utf8")));
  });
});

describe("static security + cleanup checks", () => {
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
  const sql = read("supabase/migrations/20261030000000_admin_push_notifications.sql");
  it("migration enables RLS on both tables, with no anon access and no direct insert/update policy for admins", () => {
    assert.match(sql, /alter table public\.admin_push_subscriptions enable row level security/);
    assert.match(sql, /alter table public\.admin_push_outbox enable row level security/);
    assert.ok(!/disable row level security/i.test(sql));
    assert.ok(!/create policy[^;]*for (insert|update|all)/i.test(sql), "no insert/update/all policies");
    assert.ok(!/grant [^;]*to anon/i.test(sql));
    assert.match(sql, /grant select, delete on public\.admin_push_subscriptions to authenticated/);
    assert.match(sql, /v_uid uuid := auth\.uid\(\)/);
    assert.match(sql, /grant execute on function public\.claim_push_outbox\(uuid\[\], timestamptz\) to service_role/);
    assert.match(sql, /revoke all on function public\.register_admin_push_subscription\(text, text, text\) from public, anon/);
  });
  it("the subscription and outbox tables store no inquiry content or emails", () => {
    const tables = sql.slice(sql.indexOf("create table if not exists public.admin_push_subscriptions"), sql.indexOf("-- Atomic"));
    assert.ok(!/email|full_name|event_description|phone/i.test(tables.replace(/-- .*/g, "")));
  });
  it("no client code touches the private key or service-role client", () => {
    for (const f of fs.readdirSync(path.join(process.cwd(), "src/components/admin/crm"))) {
      assert.ok(!/VAPID_PRIVATE|SERVICE_ROLE|supabase\/service|lib\/push\/(sender|store|deliver)/.test(read(`src/components/admin/crm/${f}`)), f);
    }
  });
  it("the push permission is requested only from the click handler, never on load", () => {
    const src = read("src/components/admin/crm/PushSetup.tsx");
    const effect = src.slice(src.indexOf("useEffect("), src.indexOf("const enable"));
    assert.ok(!/requestPermission|\.subscribe\(/.test(effect));
  });
  it("the realtime hook removes its channel on unmount", () => {
    assert.match(read("src/components/admin/crm/useInquiryRealtime.ts"), /removeChannel/);
  });
  it("the retry route is guarded by CRON_SECRET and the Node runtime", () => {
    const src = read("src/app/api/push/retry/route.ts");
    assert.match(src, /timingSafeEqual/);
    assert.match(src, /runtime = "nodejs"/);
    assert.match(src, /CRON_SECRET/);
  });
  it("every push server action goes through the admin check", () => {
    const src = read("src/app/admin/(panel)/dashboard/push-actions.ts");
    assert.equal((src.match(/export async function/g) ?? []).length, 3);
    assert.equal((src.match(/await admin\(\)/g) ?? []).length, 3);
  });
  it("no OneSignal references remain outside the README's removal note", () => {
    const skip = new Set(["node_modules", ".next", ".git"]);
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skip.has(entry.name) || entry.name === ".env.local" || entry.name === "package-lock.json") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (!/\.(png|jpe?g|webp|ico|gif|zip)$/i.test(entry.name) && /onesignal/i.test(fs.readFileSync(full, "utf8")) && entry.name !== "README.md" && entry.name !== "push.test.ts") hits.push(full);
      }
    };
    walk(process.cwd());
    assert.deepEqual(hits, []);
    assert.ok(!fs.existsSync(path.join(process.cwd(), "public/OneSignalSDKWorker.js")));
  });
  it(".env.example contains placeholders only", () => {
    const env = read(".env.example");
    assert.match(env, /^NEXT_PUBLIC_VAPID_PUBLIC_KEY=$/m);
    assert.match(env, /^VAPID_PRIVATE_KEY=$/m);
    assert.match(env, /^CRON_SECRET=$/m);
  });
});
