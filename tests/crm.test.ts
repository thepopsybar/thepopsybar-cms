/**
 * Run with:  npm run test:crm   (uses `npx tsx --test`; adds no dependencies)
 * Nothing real is contacted: Supabase, Web Push and Brevo are all replaced by fakes.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { formatEventDate, isPastDate, isValidISODate, todayISO } from "../src/lib/crm/dates";
import { mapWebsiteFields, type WebsiteRecord } from "../src/lib/crm/map-website";
import { OCCASION_TITLES, validateCrmInput } from "../src/lib/crm/validate";
import { createInquiryHandler } from "../src/lib/inquiry/handler";
import { isRateLimited } from "../src/lib/inquiry/rate-limit";
import type { EmailOutcome } from "../src/lib/email/brevo";

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

describe("rate limiter", () => {
  it("blocks the 7th request in the window and recovers after it", () => {
    const t = 1_000_000;
    for (let i = 0; i < 6; i++) assert.equal(isRateLimited("1.1.1.1", t + i), false);
    assert.equal(isRateLimited("1.1.1.1", t + 10), true);
    assert.equal(isRateLimited("1.1.1.1", t + 11 * 60 * 1000), false);
  });
});

describe("POST /api/inquiries with CRM + push + email", () => {
  const sent: EmailOutcome = { kind: "sent", messageId: "<m@test>" };
  function build(over: Partial<Parameters<typeof createInquiryHandler>[0]> & { email?: EmailOutcome } = {}) {
    const calls = { saved: [] as { record: WebsiteRecord; token: string | null }[], push: 0, email: 0, order: [] as string[], logs: [] as Record<string, unknown>[] };
    const handler = createInquiryHandler({
      today: () => TODAY,
      rateLimited: () => false,
      log: (e) => calls.logs.push(e),
      saveToCrm: async (record, token) => { calls.order.push("save"); calls.saved.push({ record, token }); return { kind: "saved", id: "11111111-1111-1111-1111-111111111111", record }; },
      notify: async () => { calls.push++; return { kind: "sent" }; },
      sendEmail: async () => { calls.order.push("email"); calls.email++; return over.email ?? sent; },
      ...over,
    });
    const post = async (body: unknown) => {
      const res = await handler(new Request("https://thepopsybar.com/api/inquiries", { method: "POST", body: JSON.stringify(body) }));
      return { status: res.status, json: (await res.json()) as Record<string, unknown> };
    };
    return { post, calls };
  }
  const form = { Name: "Sarah Johnson", email: "sarah@x.co", Occasion: "Wedding", "Event date": "2026-12-15", "Guest count": "80", Details: "Hi", _token: "abcd-1234-efgh" };

  it("saves first, then notifies once and emails once on the happy path", async () => {
    const { post, calls } = build();
    const r = await post(form);
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.saved, true);
    assert.equal(r.json.emailSent, true);
    assert.equal(calls.saved.length, 1);
    assert.equal(calls.saved[0].token, "abcd-1234-efgh");
    assert.equal(calls.push, 1);
    assert.equal(calls.email, 1);
    assert.deepEqual(calls.order, ["save", "email"], "the email is only sent after the database insert");
  });
  it("passes the saved inquiry (not raw browser input) to the email step", async () => {
    let seen: { record: WebsiteRecord; formLabel: string } | undefined;
    const { post } = build({ sendEmail: async (input) => { seen = input; return sent; } });
    await post({ ...form, _subject: "New contact inquiry — The Popsy Bar" });
    assert.equal(seen?.record.full_name, "Sarah Johnson");
    assert.equal(seen?.record.event_date, "2026-12-15");
    assert.equal(seen?.formLabel, "New contact inquiry — The Popsy Bar");
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
  it("email failure after a successful save: record kept, visitor told it was saved, no repeat insert/push/email", async () => {
    const { post, calls } = build({ email: { kind: "rejected", status: 401, code: "unauthorized", detail: "Key not found" } });
    const r = await post(form);
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.saved, true);
    assert.equal(r.json.emailSent, false);
    assert.equal(calls.saved.length, 1);
    assert.equal(calls.push, 1);
    assert.equal(calls.email, 1);
    const log = calls.logs.find((l) => l.kind === "email-rejected");
    assert.ok(log, "the Brevo failure is logged server-side");
    assert.equal(log?.status, 401);
    assert.equal(log?.code, "unauthorized");
  });
  it("a network failure to Brevo is a saved inquiry, not an error, and offers no browser retry", async () => {
    const { post } = build({ email: { kind: "network", code: "ENOTFOUND" } });
    const r = await post(form);
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.saved, true);
    assert.equal(r.json.retrySafe, undefined);
    assert.equal(r.json.fallbackEndpoint, undefined);
  });
  it("database failure: returns an error, sends no email and no push, never claims it was saved", async () => {
    const { post, calls } = build({ saveToCrm: async () => ({ kind: "failed", code: "42P01" }) });
    const r = await post(form);
    assert.equal(r.status, 503);
    assert.equal(r.json.ok, false);
    assert.equal(r.json.code, "SAVE_FAILED");
    assert.equal(r.json.saved, undefined);
    assert.equal(calls.email, 0);
    assert.equal(calls.push, 0);
    assert.ok(calls.logs.some((l) => l.kind === "crm-save-failed" && l.code === "42P01"));
    assert.ok(!JSON.stringify(r.json).includes("42P01"), "database codes stay server-side");
  });
  it("CRM not configured: returns an error and sends nothing", async () => {
    const { post, calls } = build({ saveToCrm: async () => ({ kind: "unconfigured" }) });
    const r = await post(form);
    assert.equal(r.status, 503);
    assert.equal(r.json.ok, false);
    assert.equal(calls.email + calls.push, 0);
    assert.ok(calls.logs.some((l) => l.kind === "crm-not-configured"));
  });
  it("duplicate token: success for the visitor, but no second push and no second email", async () => {
    const { post, calls } = build({ saveToCrm: async () => ({ kind: "duplicate" }) });
    const r = await post(form);
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.saved, true);
    assert.equal(calls.push, 0);
    assert.equal(calls.email, 0);
  });
  it("two identical submissions with the same token produce one insert and one email", async () => {
    const seenTokens = new Set<string>();
    const { post, calls } = build({
      saveToCrm: async (record, token) => {
        if (token && seenTokens.has(token)) return { kind: "duplicate" };
        if (token) seenTokens.add(token);
        return { kind: "saved", id: "11111111-1111-1111-1111-111111111111", record };
      },
    });
    const [a, b] = [await post(form), await post(form)];
    assert.equal(a.json.ok, true);
    assert.equal(b.json.ok, true);
    assert.equal(calls.email, 1);
    assert.equal(calls.push, 1);
  });
  it("a push failure never affects the response or the email", async () => {
    const { post, calls } = build({ notify: async () => { throw new Error("boom"); } });
    const r = await post(form);
    assert.equal(r.json.ok, true);
    assert.equal(r.json.emailSent, true);
    assert.equal(calls.email, 1);
    assert.ok(calls.logs.some((l) => l.kind === "push-failed"));
  });
  it("rate limits repeat clients", async () => {
    const handler = createInquiryHandler({ rateLimited: () => true });
    const res = await handler(new Request("https://thepopsybar.com/api/inquiries", { method: "POST", headers: { "x-forwarded-for": "9.9.9.9" }, body: "{}" }));
    assert.equal(res.status, 429);
  });
});

describe("static safety checks", () => {
  const read = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  it("manual-entry actions never import the push code", () => {
    assert.ok(!/push/i.test(read("src/app/admin/(panel)/dashboard/actions.ts")));
  });
  it("client code never imports the service-role client or reads secrets", () => {
    for (const f of ["CrmDashboard", "RecordForm", "RecordDetail", "PushSetup", "Modal", "Toasts"]) {
      const src = read(`src/components/admin/crm/${f}.tsx`);
      assert.ok(!/supabase\/service|SERVICE_ROLE|VAPID_PRIVATE/.test(src), f);
    }
  });
  it("every admin action checks for an admin", () => {
    const src = read("src/app/admin/(panel)/dashboard/actions.ts");
    const exported = src.match(/export async function \w+/g) ?? [];
    assert.equal(exported.length, 4);
    assert.equal((src.match(/await requireAdmin\(\)/g) ?? []).length, 4);
  });
  it("the old form service is gone from the project, and the Brevo key is server-only", () => {
    const OLD_SERVICE = new RegExp("form" + "[-_ ]?submit", "i");
    const walk = (dir: string): string[] =>
      fs.readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true }).flatMap((entry) => {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) return walk(rel);
        return /\.(ts|tsx|mjs|js|json|md|sql|css|txt|webmanifest)$/.test(entry.name) ? [rel] : [];
      });
    const files = [...walk("src"), ...walk("scripts"), ...walk("supabase"), "package.json", "README.md", "vercel.json", ".env.example", "next.config.ts"];
    for (const f of files) assert.ok(!OLD_SERVICE.test(read(f)), `${f} still mentions the old form service`);
    // The key is never NEXT_PUBLIC_, and no client-side code touches Brevo.
    for (const f of [...walk("src"), ".env.example"]) assert.ok(!/NEXT_PUBLIC_BREVO/.test(read(f)), `${f} exposes a Brevo variable`);
    for (const f of [...walk("src/components"), ...walk("src/lib/forms")]) {
      assert.ok(!/BREVO|api\.brevo\.com|lib\/email/.test(read(f)), `${f} is client code and must not reference Brevo`);
    }
    for (const f of walk("src")) {
      if (f.startsWith("src/lib/email/") || f === "src/lib/inquiry/handler.ts") continue;
      assert.ok(!/BREVO_API_KEY/.test(read(f)), `${f} reads the Brevo key outside the server email code`);
    }
  });
  it("the migration enables RLS and has no anon/public policy", () => {
    const sql = read("supabase/migrations/20261029000000_create_crm_inquiries.sql");
    assert.match(sql, /enable row level security/);
    assert.ok(!/to anon|to public/i.test(sql.replace(/revoke all on public\.crm_inquiries from (anon|public);/g, "")));
  });
});
