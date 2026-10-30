/**
 * Run with:  npm run test:crm   (uses `npx tsx --test`; adds no dependencies)
 * Nothing real is contacted: Supabase, OneSignal and FormSubmit are all replaced by fakes.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { formatEventDate, isPastDate, isValidISODate, todayISO } from "../src/lib/crm/dates";
import { mapWebsiteFields, type WebsiteRecord } from "../src/lib/crm/map-website";
import { buildPushText, sendInquiryPush } from "../src/lib/crm/onesignal";
import { OCCASION_TITLES, validateCrmInput } from "../src/lib/crm/validate";
import { createInquiryHandler } from "../src/lib/inquiry/handler";
import { isRateLimited } from "../src/lib/inquiry/rate-limit";
import type { SendOutcome } from "../src/lib/inquiry/send";

const TODAY = "2026-10-30";

describe("dates", () => {
  it("computes today in the business time zone, not UTC", () => {
    // 03:30 UTC on Oct 31 is still Oct 30 evening in Texas.
    assert.equal(todayISO(new Date("2026-10-31T03:30:00Z"), "America/Chicago"), "2026-10-30");
    assert.equal(todayISO(new Date("2026-10-31T03:30:00Z"), "UTC"), "2026-10-31");
  });
  it("validates real calendar dates only", () => {
    assert.ok(isValidISODate("2026-12-15"));
    assert.ok(!isValidISODate("2026-02-30"));
    assert.ok(!isValidISODate("12/15/2026"));
    assert.ok(!isValidISODate("2026-13-01"));
  });
  it("treats today as allowed and yesterday as past", () => {
    assert.ok(!isPastDate("2026-10-30", TODAY));
    assert.ok(isPastDate("2026-10-29", TODAY));
  });
  it("formats event dates without time zone drift", () => {
    assert.equal(formatEventDate("2026-12-15"), "Dec 15, 2026");
  });
});

describe("manual record validation", () => {
  const good = { full_name: "  Sarah  Johnson ", email: "sarah@example.com", event_date: "2026-12-15", occasion_type: "Wedding", guest_count: "120", event_description: "" };
  it("accepts a valid record and normalises it", () => {
    const r = validateCrmInput(good, { today: TODAY });
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.value.full_name, "Sarah Johnson");
      assert.equal(r.value.guest_count, 120);
    }
  });
  it("requires every field except the description", () => {
    const r = validateCrmInput({}, { today: TODAY });
    assert.ok(!r.ok);
    if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["email", "event_date", "full_name", "guest_count", "occasion_type"]);
  });
  it("rejects bad emails", () => {
    for (const email of ["nope", "a@b", "a b@c.com"]) assert.ok(!validateCrmInput({ ...good, email }, { today: TODAY }).ok);
  });
  it("rejects past dates, accepts today", () => {
    assert.ok(!validateCrmInput({ ...good, event_date: "2026-10-29" }, { today: TODAY }).ok);
    assert.ok(validateCrmInput({ ...good, event_date: TODAY }, { today: TODAY }).ok);
  });
  it("lets an edit keep an already-past date but not pick a different past one", () => {
    assert.ok(validateCrmInput({ ...good, event_date: "2026-01-01" }, { today: TODAY, currentEventDate: "2026-01-01" }).ok);
    assert.ok(!validateCrmInput({ ...good, event_date: "2026-01-02" }, { today: TODAY, currentEventDate: "2026-01-01" }).ok);
  });
  it("rejects non-positive / fractional / huge guest counts", () => {
    for (const guest_count of ["0", "-3", "2.5", "abc", "100001"]) assert.ok(!validateCrmInput({ ...good, guest_count }, { today: TODAY }).ok);
  });
  it("only accepts occasions from src/lib/occasions.ts", () => {
    assert.ok(OCCASION_TITLES.includes("Wedding"));
    assert.ok(!validateCrmInput({ ...good, occasion_type: "Made Up Party" }, { today: TODAY }).ok);
  });
});

describe("mapWebsiteFields", () => {
  it("maps the homepage / plan form labels", () => {
    const r = mapWebsiteFields(
      { Name: "Ann Lee", email: "ann@x.co", Occasion: "Birthday", "Event date": "2026-11-20", "Guest count": "40", Details: "Cake pops please", "Phone number": "832", "Event location": "Katy", "Cart design": "Latte · Rose" },
      TODAY,
    );
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.record.full_name, "Ann Lee");
      assert.equal(r.record.occasion_type, "Birthday");
      assert.equal(r.record.event_date, "2026-11-20");
      assert.equal(r.record.guest_count, 40);
      assert.equal(r.record.event_description, "Cake pops please");
      assert.equal(r.record.phone, "832");
      assert.equal(r.record.event_location, "Katy");
      assert.equal(r.record.extra["Cart design"], "Latte · Rose");
    }
  });
  it("maps the contact form labels and keeps the subject", () => {
    const r = mapWebsiteFields(
      { "Full name": "Bo Diaz", email: "bo@x.co", "Event type": "Wedding", "Preferred event date": "2026-12-01", "Estimated guest count": "150", Subject: "Quote", Message: "Hello there" },
      TODAY,
    );
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.record.full_name, "Bo Diaz");
      assert.equal(r.record.event_description, "Hello there");
      assert.equal(r.record.extra.Subject, "Quote");
    }
  });
  it("leaves missing fields null instead of inventing data", () => {
    const r = mapWebsiteFields({ Name: "Cy", email: "cy@x.co" }, TODAY);
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.record.event_date, null);
      assert.equal(r.record.occasion_type, null);
      assert.equal(r.record.guest_count, null);
    }
  });
  it("rejects past and malformed dates", () => {
    const past = mapWebsiteFields({ Name: "D", email: "d@x.co", "Event date": "2026-01-01" }, TODAY);
    assert.ok(!past.ok && past.code === "PAST_DATE");
    const bad = mapWebsiteFields({ Name: "D", email: "d@x.co", "Event date": "soon" }, TODAY);
    assert.ok(!bad.ok && bad.code === "INVALID_DATE");
  });
  it("keeps unusable values in extra rather than dropping them", () => {
    const r = mapWebsiteFields({ Name: "E", email: "e@x.co", Occasion: "Rave", "Guest count": "lots" }, TODAY);
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.record.occasion_type, null);
      assert.equal(r.record.guest_count, null);
      assert.equal(r.record.extra["Occasion (as entered)"], "Rave");
      assert.equal(r.record.extra["Guest count (as entered)"], "lots");
    }
  });
});

describe("push text and OneSignal request", () => {
  it("builds the documented message", () => {
    const year = new Date().getUTCFullYear();
    const m = buildPushText({ full_name: "Sarah Johnson", occasion_type: "Wedding", event_date: `${year}-12-15` });
    assert.equal(m.title, "New Website Inquiry — The Popsy Bar");
    assert.equal(m.message, "Sarah Johnson submitted an inquiry for a Wedding on December 15.");
  });
  it("falls back gracefully when fields are missing", () => {
    assert.match(buildPushText({ full_name: "(No name provided)", occasion_type: null, event_date: null }).message, /new inquiry/i);
    assert.equal(buildPushText({ full_name: "Al", occasion_type: null, event_date: null }).message, "Al submitted an inquiry.");
    assert.match(buildPushText({ full_name: "Al", occasion_type: "Event", event_date: null }).message, /for an Event/);
  });
  it("skips when OneSignal is not configured and never calls fetch", async () => {
    delete process.env.ONESIGNAL_REST_API_KEY;
    delete process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    let called = false;
    const out = await sendInquiryPush(rec(), "id-1", (async () => { called = true; return new Response("{}"); }) as typeof fetch);
    assert.equal(out.kind, "skipped");
    assert.equal(called, false);
  });
  it("sends one correctly shaped, authenticated request and reports failures safely", async () => {
    process.env.ONESIGNAL_REST_API_KEY = "secret-key";
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID = "app-123";
    const seen: { url: string; init: RequestInit }[] = [];
    const ok = await sendInquiryPush(rec(), "rec-1", (async (url: string, init: RequestInit) => { seen.push({ url, init }); return new Response('{"id":"n1"}'); }) as unknown as typeof fetch);
    assert.equal(ok.kind, "sent");
    assert.equal(seen.length, 1);
    assert.equal(seen[0].url, "https://api.onesignal.com/notifications");
    assert.equal((seen[0].init.headers as Record<string, string>).Authorization, "Key secret-key");
    const body = JSON.parse(seen[0].init.body as string);
    assert.equal(body.app_id, "app-123");
    assert.equal(body.target_channel, "push");
    assert.equal(body.url, "https://thepopsybar.com/admin/dashboard");
    assert.equal(body.idempotency_key, "rec-1");
    const fail = await sendInquiryPush(rec(), "rec-2", (async () => new Response("{}", { status: 401 })) as typeof fetch);
    assert.deepEqual(fail, { kind: "failed", reason: "HTTP 401" });
    const noRecipients = await sendInquiryPush(rec(), "rec-3", (async () => new Response('{"errors":["All included players are not subscribed"]}')) as typeof fetch);
    assert.equal(noRecipients.kind, "failed");
    delete process.env.ONESIGNAL_REST_API_KEY;
    delete process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  });
});

describe("rate limiter", () => {
  it("blocks the 7th request in the window and recovers after it", () => {
    const t = 1_000_000;
    for (let i = 0; i < 6; i++) assert.equal(isRateLimited("1.1.1.1", t + i), false);
    assert.equal(isRateLimited("1.1.1.1", t + 10), true);
    assert.equal(isRateLimited("1.1.1.1", t + 11 * 60 * 1000), false);
  });
});

function rec(): WebsiteRecord {
  return { full_name: "Sarah Johnson", email: "s@x.co", event_date: null, occasion_type: "Wedding", guest_count: null, event_description: "", phone: null, event_location: null, extra: {} };
}

describe("POST /api/inquiries with CRM + push + email", () => {
  const accepted: SendOutcome = { kind: "accepted" };
  function build(over: Partial<Parameters<typeof createInquiryHandler>[0]> & { email?: SendOutcome } = {}) {
    const calls = { saved: [] as { record: WebsiteRecord; token: string | null }[], push: 0, email: 0, logs: [] as Record<string, unknown>[] };
    const handler = createInquiryHandler({
      endpoint: "https://upstream.example/ajax/x",
      today: () => TODAY,
      rateLimited: () => false,
      log: (e) => calls.logs.push(e),
      saveToCrm: async (record, token) => { calls.saved.push({ record, token }); return { kind: "saved", id: "11111111-1111-1111-1111-111111111111", record }; },
      notify: async () => { calls.push++; return { kind: "sent" }; },
      send: async () => { calls.email++; return over.email ?? accepted; },
      ...over,
    });
    const post = async (body: unknown) => {
      const res = await handler(new Request("https://thepopsybar.com/api/inquiries", { method: "POST", body: JSON.stringify(body) }));
      return { status: res.status, json: (await res.json()) as Record<string, unknown> };
    };
    return { post, calls };
  }
  const form = { Name: "Sarah Johnson", email: "sarah@x.co", Occasion: "Wedding", "Event date": "2026-12-15", "Guest count": "80", Details: "Hi", _token: "abcd-1234-efgh" };

  it("saves, notifies once and emails once on the happy path", async () => {
    const { post, calls } = build();
    const r = await post(form);
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, true);
    assert.equal(calls.saved.length, 1);
    assert.equal(calls.saved[0].token, "abcd-1234-efgh");
    assert.equal(calls.push, 1);
    assert.equal(calls.email, 1);
  });
  it("never lets the browser choose the source", async () => {
    const { post, calls } = build();
    await post({ ...form, source: "manual", Source: "manual" });
    assert.ok(!("source" in calls.saved[0].record), "record passed to the saver carries no source; the saver sets 'website'");
  });
  it("rejects a past event date before saving or emailing anything", async () => {
    const { post, calls } = build();
    const r = await post({ ...form, "Event date": "2026-01-01" });
    assert.equal(r.status, 400);
    assert.equal(r.json.code, "PAST_DATE");
    assert.equal(calls.saved.length + calls.email + calls.push, 0);
  });
  it("ignores honeypot bots without saving", async () => {
    const { post, calls } = build();
    await post({ ...form, website: "http://spam" });
    assert.equal(calls.saved.length + calls.email + calls.push, 0);
  });
  it("email failure after a successful save: record kept, customer told, no push repeat, no second insert", async () => {
    const { post, calls } = build({ email: { kind: "rejected", status: 500, detail: "x" } });
    const r = await post(form);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.saved, true);
    assert.equal(calls.saved.length, 1);
    assert.equal(calls.push, 1);
    assert.ok(calls.logs.some((l) => l.kind === "email-unconfirmed-but-saved"));
  });
  it("email unreachable after save: lets the browser try FormSubmit once and flags saved", async () => {
    const { post } = build({ email: { kind: "unreachable", code: "ENOTFOUND" } });
    const r = await post(form);
    assert.equal(r.json.ok, false);
    assert.equal(r.json.retrySafe, true);
    assert.equal(r.json.saved, true);
  });
  it("database failure: still emails, no push, nothing claims it was saved", async () => {
    const { post, calls } = build({ saveToCrm: async () => ({ kind: "failed", code: "42P01" }) });
    const r = await post(form);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.saved, undefined);
    assert.equal(calls.email, 1);
    assert.equal(calls.push, 0);
    assert.ok(calls.logs.some((l) => l.kind === "crm-save-failed" && l.code === "42P01"));
  });
  it("database failure AND email failure surfaces the original error", async () => {
    const { post } = build({ saveToCrm: async () => ({ kind: "failed", code: "X" }), email: { kind: "rejected", status: 500, detail: "x" } });
    const r = await post(form);
    assert.equal(r.status, 502);
    assert.equal(r.json.ok, false);
  });
  it("duplicate token: no second push, email still attempted", async () => {
    const { post, calls } = build({ saveToCrm: async () => ({ kind: "duplicate" }) });
    const r = await post(form);
    assert.equal(r.json.ok, true);
    assert.equal(calls.push, 0);
    assert.equal(calls.email, 1);
  });
  it("a push failure never affects the response", async () => {
    const { post, calls } = build({ notify: async () => { throw new Error("boom"); } });
    const r = await post(form);
    assert.equal(r.json.ok, true);
    assert.ok(calls.logs.some((l) => l.kind === "push-failed"));
  });
  it("rate limits repeat clients", async () => {
    const handler = createInquiryHandler({ endpoint: "https://u.example/x", rateLimited: () => true });
    const res = await handler(new Request("https://thepopsybar.com/api/inquiries", { method: "POST", headers: { "x-forwarded-for": "9.9.9.9" }, body: "{}" }));
    assert.equal(res.status, 429);
  });
});

describe("static safety checks", () => {
  const read = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  it("manual-entry actions never import OneSignal", () => {
    assert.ok(!/onesignal/i.test(read("src/app/admin/(panel)/dashboard/actions.ts")));
  });
  it("client code never imports the service-role client or reads secrets", () => {
    for (const f of ["CrmDashboard", "RecordForm", "RecordDetail", "PushSetup", "Modal", "Toasts"]) {
      const src = read(`src/components/admin/crm/${f}.tsx`);
      assert.ok(!/supabase\/service|SERVICE_ROLE|ONESIGNAL_REST/.test(src), f);
    }
  });
  it("every admin action checks for an admin", () => {
    const src = read("src/app/admin/(panel)/dashboard/actions.ts");
    const exported = src.match(/export async function \w+/g) ?? [];
    assert.equal(exported.length, 4);
    assert.equal((src.match(/await requireAdmin\(\)/g) ?? []).length, 4);
  });
  it("the migration enables RLS and has no anon/public policy", () => {
    const sql = read("supabase/migrations/20261029000000_create_crm_inquiries.sql");
    assert.match(sql, /enable row level security/);
    assert.ok(!/to anon|to public/i.test(sql.replace(/revoke all on public\.crm_inquiries from (anon|public);/g, "")));
  });
});
