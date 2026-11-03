/**
 * Run with:  npm run test:inquiry
 * (uses `npx tsx --test`; nothing is added to the project's dependencies.)
 * No real email is ever sent: Brevo is replaced by stubs or a throwaway local HTTP server.
 */
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import type { WebsiteRecord } from "../src/lib/crm/map-website";
import {
  BREVO_ENDPOINT,
  buildBrevoPayload,
  classifyBrevoResponse,
  getBrevoConfig,
  sendBrevoEmail,
  type BrevoConfig,
  type EmailOutcome,
} from "../src/lib/email/brevo";
import { INQUIRY_EMAIL_SUBJECT, buildInquiryEmail } from "../src/lib/email/inquiry-email";
import { createInquiryHandler, type InquiryResponse } from "../src/lib/inquiry/handler";
import { parseInquiry } from "../src/lib/inquiry/validate";

const CONFIG: BrevoConfig = {
  apiKey: "test-brevo-key-not-real",
  senderEmail: "notifications@thepopsybar.com",
  senderName: "The Popsy Bar",
  recipientEmail: "owner@example.com",
};

describe("parseInquiry", () => {
  it("rejects non-objects", () => {
    for (const body of [null, "x", 5, [], undefined]) assert.equal(parseInquiry(body).ok, false);
  });
  it("requires a valid email", () => {
    assert.equal(parseInquiry({ name: "A" }).ok, false);
    assert.equal(parseInquiry({ email: "not-an-email" }).ok, false);
    assert.equal(parseInquiry({ email: "a b@c.com" }).ok, false);
    assert.equal(parseInquiry({ email: "   " }).ok, false);
  });
  it("accepts a normal inquiry and strips private/underscore fields", () => {
    const result = parseInquiry({ email: " a@b.co ", name: " Ann ", _next: "https://evil", _cc: "x@y.z", empty: "  ", num: 4 });
    assert.ok(result.ok && !result.honeypot);
    if (result.ok && !result.honeypot) {
      assert.deepEqual(result.fields, { email: "a@b.co", name: "Ann" });
    }
  });
  it("detects the honeypot", () => {
    const result = parseInquiry({ email: "a@b.co", website: "http://spam" });
    assert.ok(result.ok && result.honeypot);
  });
  it("sanitises the subject and caps lengths", () => {
    const result = parseInquiry({ email: "a@b.co", _subject: "Hi\r\nBcc: x@y.z" + "x".repeat(500), message: "m".repeat(9000) });
    assert.ok(result.ok && !result.honeypot);
    if (result.ok && !result.honeypot) {
      assert.ok(!/[\r\n]/.test(result.subject));
      assert.ok(result.subject.length <= 180);
      assert.equal(result.fields.message.length, 5000);
    }
  });
});

describe("getBrevoConfig", () => {
  const env = { BREVO_API_KEY: "k-123", BREVO_SENDER_EMAIL: "notifications@thepopsybar.com", BREVO_SENDER_NAME: "The Popsy Bar", INQUIRY_NOTIFICATION_EMAIL: "owner@example.com" };
  it("accepts a complete configuration", () => {
    const r = getBrevoConfig(env);
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(r.config, { apiKey: "k-123", senderEmail: "notifications@thepopsybar.com", senderName: "The Popsy Bar", recipientEmail: "owner@example.com" });
  });
  it("falls back to the verified sender when the sender variables are unset", () => {
    const r = getBrevoConfig({ BREVO_API_KEY: "k", INQUIRY_NOTIFICATION_EMAIL: "owner@example.com" });
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.config.senderEmail, "notifications@thepopsybar.com");
  });
  it("reports the NAMES of missing settings, never their values", () => {
    const r = getBrevoConfig({ BREVO_API_KEY: "  ", INQUIRY_NOTIFICATION_EMAIL: "not-an-email" });
    assert.ok(!r.ok);
    if (!r.ok) assert.deepEqual(r.missing, ["BREVO_API_KEY", "INQUIRY_NOTIFICATION_EMAIL"]);
  });
  it("refuses a recipient that could carry extra addresses or header text", () => {
    for (const bad of ["a@b.co, c@d.co", "a@b.co\r\nBcc: x@y.z", "Name <a@b.co>", "a@b.co;c@d.co"]) {
      assert.ok(!getBrevoConfig({ ...env, INQUIRY_NOTIFICATION_EMAIL: bad }).ok, bad);
    }
  });
});

describe("classifyBrevoResponse", () => {
  it("accepts 201 with a messageId", () => {
    assert.deepEqual(classifyBrevoResponse(201, '{"messageId":"<abc@smtp-relay.mailin.fr>"}'), { kind: "sent", messageId: "<abc@smtp-relay.mailin.fr>" });
  });
  it("accepts a messageIds array", () => {
    assert.equal(classifyBrevoResponse(201, '{"messageIds":["<a@b>"]}').kind, "sent");
  });
  it("does not call a 2xx without a message id a success", () => {
    assert.equal(classifyBrevoResponse(200, "{}").kind, "unconfirmed");
    assert.equal(classifyBrevoResponse(201, "<html>proxy page</html>").kind, "unconfirmed");
  });
  it("parses Brevo error bodies", () => {
    assert.deepEqual(classifyBrevoResponse(401, '{"code":"unauthorized","message":"Key not found"}'), { kind: "rejected", status: 401, code: "unauthorized", detail: "Key not found" });
    assert.deepEqual(classifyBrevoResponse(400, '{"code":"invalid_parameter","message":"sender is not valid"}'), { kind: "rejected", status: 400, code: "invalid_parameter", detail: "sender is not valid" });
  });
  it("treats rate limits, 5xx and non-JSON error pages as rejected", () => {
    assert.equal(classifyBrevoResponse(429, '{"code":"too_many_requests","message":"slow down"}').kind, "rejected");
    assert.equal(classifyBrevoResponse(503, "<html>down</html>").kind, "rejected");
    assert.equal(classifyBrevoResponse(500, "").kind, "rejected");
  });
  it("does not treat a success-looking body on an error status as success", () => {
    assert.equal(classifyBrevoResponse(500, '{"messageId":"<x>"}').kind, "rejected");
  });
});

describe("buildBrevoPayload", () => {
  const message = { subject: INQUIRY_EMAIL_SUBJECT, htmlContent: "<p>hi</p>", textContent: "hi", replyTo: { email: "visitor@example.com", name: "Ann Visitor" }, tags: ["website-inquiry"] };
  it("builds the documented Brevo request body", () => {
    assert.deepEqual(buildBrevoPayload(message, CONFIG), {
      sender: { name: "The Popsy Bar", email: "notifications@thepopsybar.com" },
      to: [{ email: "owner@example.com" }],
      replyTo: { email: "visitor@example.com", name: "Ann Visitor" },
      subject: "New Website Inquiry – The Popsy Bar",
      htmlContent: "<p>hi</p>",
      textContent: "hi",
      tags: ["website-inquiry"],
    });
  });
  it("omits Reply-To rather than sending an address Brevo might refuse", () => {
    for (const email of ["a@b.co\r\nBcc: x@y.z", "x y@z.co", "<a>@b.co", 'a"b@c.co']) {
      assert.equal("replyTo" in buildBrevoPayload({ ...message, replyTo: { email } }, CONFIG), false, email);
    }
  });
  it("strips line breaks and angle brackets from the subject and Reply-To name", () => {
    const p = buildBrevoPayload({ ...message, subject: "Hi\r\nBcc: x@y.z", replyTo: { email: "v@example.com", name: 'Ann\r\n<b>"x"' } }, CONFIG);
    assert.ok(!/[\r\n]/.test(p.subject));
    assert.ok(!/[\r\n<>"]/.test(p.replyTo?.name ?? ""));
  });
  it("always addresses the configured recipient only", () => {
    const p = buildBrevoPayload(message, CONFIG);
    assert.deepEqual(p.to, [{ email: CONFIG.recipientEmail }]);
    assert.ok(!("cc" in p) && !("bcc" in p));
  });
});

describe("sendBrevoEmail", () => {
  const message = { subject: "S", htmlContent: "<p>h</p>", textContent: "t", replyTo: { email: "visitor@example.com", name: "Ann" } };

  it("POSTs once to the official endpoint with the api-key header and a JSON body", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const outcome = await sendBrevoEmail(message, CONFIG, {
      fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init: init ?? {} });
        return new Response('{"messageId":"<m@x>"}', { status: 201 });
      }) as typeof fetch,
    });
    assert.deepEqual(outcome, { kind: "sent", messageId: "<m@x>" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.brevo.com/v3/smtp/email");
    assert.equal(calls[0].url, BREVO_ENDPOINT);
    assert.equal(calls[0].init.method, "POST");
    const headers = calls[0].init.headers as Record<string, string>;
    assert.equal(headers["api-key"], CONFIG.apiKey);
    assert.equal(headers["content-type"], "application/json");
    assert.ok(!String(calls[0].init.body).includes(CONFIG.apiKey), "key must never be in the body");
  });

  it("works over real HTTP against a local stand-in for Brevo", async () => {
    const received: { headers: http.IncomingHttpHeaders; body: string; method?: string }[] = [];
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c: Buffer) => (body += c));
      req.on("end", () => {
        received.push({ headers: req.headers, body, method: req.method });
        res.statusCode = 201;
        res.setHeader("Content-Type", "application/json");
        res.end('{"messageId":"<local@test>"}');
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const { port } = server.address() as AddressInfo;
    try {
      const outcome = await sendBrevoEmail(message, CONFIG, {
        fetchImpl: ((_url: string, init?: RequestInit) => fetch(`http://127.0.0.1:${port}/v3/smtp/email`, init)) as typeof fetch,
      });
      assert.equal(outcome.kind, "sent");
      assert.equal(received.length, 1);
      assert.equal(received[0].method, "POST");
      assert.equal(received[0].headers["api-key"], CONFIG.apiKey);
      const sent = JSON.parse(received[0].body);
      assert.equal(sent.sender.email, "notifications@thepopsybar.com");
      assert.deepEqual(sent.to, [{ email: "owner@example.com" }]);
      assert.equal(sent.replyTo.email, "visitor@example.com");
      assert.equal(sent.htmlContent, "<p>h</p>");
      assert.equal(sent.textContent, "t");
    } finally {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("reports Brevo errors without throwing and without exposing the key", async () => {
    const outcome = await sendBrevoEmail(message, CONFIG, {
      fetchImpl: (async () => new Response('{"code":"unauthorized","message":"Key not found"}', { status: 401 })) as typeof fetch,
    });
    assert.equal(outcome.kind, "rejected");
    assert.ok(!JSON.stringify(outcome).includes(CONFIG.apiKey));
  });

  it("reports a timeout and does not retry", async () => {
    let calls = 0;
    const outcome = await sendBrevoEmail(message, CONFIG, {
      timeoutMs: 50,
      fetchImpl: ((_url: string, init?: RequestInit) => {
        calls++;
        // AbortSignal.timeout() timers are unref'd; a real socket keeps the process alive, this stands in for it.
        const keepAlive = setTimeout(() => undefined, 2000);
        return new Promise((_resolve, reject) =>
          init?.signal?.addEventListener("abort", () => {
            clearTimeout(keepAlive);
            reject(init.signal?.reason);
          }),
        );
      }) as typeof fetch,
    });
    assert.equal(outcome.kind, "timeout");
    assert.equal(calls, 1);
  });

  it("reports connection failures with a code and does not retry", async () => {
    let calls = 0;
    const outcome = await sendBrevoEmail(message, CONFIG, {
      fetchImpl: (async () => {
        calls++;
        throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
      }) as typeof fetch,
    });
    assert.deepEqual(outcome, { kind: "network", code: "ENOTFOUND" });
    assert.equal(calls, 1);
  });
});

describe("buildInquiryEmail", () => {
  const full: WebsiteRecord = {
    full_name: "Sarah Johnson",
    email: "sarah@example.com",
    event_date: "2026-12-15",
    occasion_type: "Wedding",
    guest_count: 80,
    event_description: "We love the mocktail cart.\nCan you do 3 hours?",
    phone: "(832) 555-0101",
    event_location: "Rosenberg, TX",
    extra: { Subject: "Wedding drinks", "Cart design": "Mocktails · Blush & Gold", "Contact consent": "I agree to be contacted about this inquiry" },
  };
  const at = new Date("2026-11-02T22:05:00Z");

  it("includes every submitted field, the branding and the submission time", () => {
    const e = buildInquiryEmail({ record: full, formLabel: "New contact inquiry — The Popsy Bar", receivedAt: at });
    assert.equal(e.subject, "New Website Inquiry – The Popsy Bar");
    for (const text of ["The Popsy Bar", "Sarah Johnson", "sarah@example.com", "(832) 555-0101", "Wedding", "Dec 15, 2026", "80", "Rosenberg, TX", "We love the mocktail cart.", "Can you do 3 hours?", "Wedding drinks", "Mocktails", "Nov 2, 2026", "New contact inquiry"]) {
      assert.ok(e.htmlContent.includes(text.replace(/&/g, "&amp;")) || e.htmlContent.includes(text), `html missing ${text}`);
    }
    for (const text of ["Sarah Johnson", "sarah@example.com", "(832) 555-0101", "Wedding", "Dec 15, 2026", "Rosenberg, TX", "We love the mocktail cart.", "Wedding drinks", "Nov 2, 2026"]) {
      assert.ok(e.textContent.includes(text), `text missing ${text}`);
    }
    assert.ok(!/<[a-z]/i.test(e.textContent), "plain text must contain no HTML");
    assert.deepEqual(e.replyTo, { email: "sarah@example.com", name: "Sarah Johnson" });
  });

  it("shows the submission time in the business time zone", () => {
    const e = buildInquiryEmail({ record: full, receivedAt: at, timeZone: "America/Chicago" });
    assert.match(e.textContent, /4:05 PM/);
  });

  it("only includes fields that exist", () => {
    const e = buildInquiryEmail({
      record: { full_name: "(No name provided)", email: "a@b.co", event_date: null, occasion_type: null, guest_count: null, event_description: "", phone: null, event_location: null, extra: {} },
      receivedAt: at,
    });
    for (const label of ["Name", "Phone", "Event / occasion", "Event date", "Guest count", "Event location", "Message", "Additional details", "No name provided"]) {
      assert.ok(!e.htmlContent.includes(label) && !e.textContent.includes(label), `should not mention ${label}`);
    }
    assert.ok(e.textContent.includes("a@b.co"));
    assert.deepEqual(e.replyTo, { email: "a@b.co" });
  });

  it("shows values that did not map cleanly (as entered)", () => {
    const e = buildInquiryEmail({ record: { ...full, occasion_type: null, guest_count: null, extra: { "Occasion (as entered)": "Rave", "Guest count (as entered)": "lots" } }, receivedAt: at });
    assert.ok(e.textContent.includes("Rave") && e.textContent.includes("lots"));
    assert.ok(!e.textContent.includes("as entered"));
  });

  it("escapes visitor-supplied HTML in every field", () => {
    const evil = `<script>alert(1)</script><img src=x onerror=alert(2)>`;
    const e = buildInquiryEmail({
      record: { ...full, full_name: evil, event_description: evil, event_location: evil, phone: evil, extra: { [evil]: evil } },
      formLabel: evil,
      receivedAt: at,
    });
    assert.ok(!e.htmlContent.includes("<script>"));
    assert.ok(!e.htmlContent.includes("<img src=x"));
    assert.ok(e.htmlContent.includes("&lt;script&gt;"));
  });

  it("never turns an odd address into a link or a Reply-To", () => {
    const e = buildInquiryEmail({ record: { ...full, email: 'a"b<c>@example.com' }, receivedAt: at });
    assert.equal(e.replyTo, undefined);
    assert.ok(!e.htmlContent.includes("mailto:"));
  });

  it("keeps line breaks out of the subject and Reply-To name", () => {
    const e = buildInquiryEmail({ record: { ...full, full_name: "Ann\r\nBcc: x@y.z" }, receivedAt: at });
    assert.ok(!/[\r\n]/.test(e.subject));
  });
});

type Post = { status: number; data: InquiryResponse };

function makeHandler(outcome: EmailOutcome = { kind: "sent", messageId: "<m>" }) {
  const calls = { email: 0, saved: 0, logs: [] as Record<string, unknown>[] };
  const handler = createInquiryHandler({
    saveToCrm: async (record) => {
      calls.saved++;
      return { kind: "saved", id: "11111111-1111-1111-1111-111111111111", record };
    },
    notify: async () => ({ kind: "skipped", reason: "test" }),
    sendEmail: async () => {
      calls.email++;
      return outcome;
    },
    rateLimited: () => false,
    log: (entry) => calls.logs.push(entry),
  });
  return { handler, calls };
}

function post(body: unknown, raw = false) {
  return new Request("https://popsy.example/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

async function run(handler: (r: Request) => Promise<Response>, body: unknown, raw = false): Promise<Post> {
  const res = await handler(post(body, raw));
  return { status: res.status, data: (await res.json()) as InquiryResponse };
}

const VALID = { email: "visitor@example.com", name: "Visitor Name", message: "Private message text", _subject: "Test" };

describe("inquiry handler (validation layer)", () => {
  it("returns 400 for malformed JSON without saving or emailing", async () => {
    const { handler, calls } = makeHandler();
    const { status, data } = await run(handler, "{not json", true);
    assert.equal(status, 400);
    assert.equal(data.ok, false);
    assert.equal(calls.saved + calls.email, 0);
  });
  it("returns 400 for a missing/invalid email without saving or emailing", async () => {
    const { handler, calls } = makeHandler();
    assert.equal((await run(handler, { name: "x" })).status, 400);
    assert.equal((await run(handler, { email: "bad" })).data.code, "INVALID_EMAIL");
    assert.equal(calls.saved + calls.email, 0);
  });
  it("acknowledges honeypot submissions without saving or emailing", async () => {
    const { handler, calls } = makeHandler();
    const { status, data } = await run(handler, { ...VALID, website: "spam" });
    assert.equal(status, 200);
    assert.equal(data.ok, true);
    assert.equal(calls.saved + calls.email, 0);
  });
  it("rejects oversized bodies", async () => {
    const { handler, calls } = makeHandler();
    const { status } = await run(handler, JSON.stringify({ email: "a@b.co", message: "x".repeat(70000) }), true);
    assert.equal(status, 413);
    assert.equal(calls.saved + calls.email, 0);
  });
  it("saves and emails exactly once on success", async () => {
    const { handler, calls } = makeHandler();
    const { status, data } = await run(handler, VALID);
    assert.equal(status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.saved, true);
    assert.equal(data.emailSent, true);
    assert.equal(calls.saved, 1);
    assert.equal(calls.email, 1);
  });
  it("tells the visitor it was saved, never 'not submitted', for every email failure", async () => {
    const failures: EmailOutcome[] = [
      { kind: "not_configured", missing: ["BREVO_API_KEY"] },
      { kind: "rejected", status: 401, code: "unauthorized", detail: "Key not found" },
      { kind: "rejected", status: 429, code: "too_many_requests", detail: "slow down" },
      { kind: "rejected", status: 503, code: "unknown", detail: "no message" },
      { kind: "unconfirmed", status: 200 },
      { kind: "timeout" },
      { kind: "network", code: "ECONNRESET" },
    ];
    for (const outcome of failures) {
      const { handler, calls } = makeHandler(outcome);
      const { status, data } = await run(handler, VALID);
      assert.equal(status, 200, outcome.kind);
      assert.equal(data.ok, true, outcome.kind);
      assert.equal(data.saved, true, outcome.kind);
      assert.equal(data.emailSent, false, outcome.kind);
      assert.match(data.message, /received and saved/);
      assert.equal(calls.saved, 1);
      assert.equal(calls.email, 1, "no retry");
      assert.ok(calls.logs.some((l) => String(l.kind).startsWith("email-")), `logged ${outcome.kind}`);
    }
  });
  it("a thrown error in the email step still returns the saved response", async () => {
    const handler = createInquiryHandler({
      saveToCrm: async (record) => ({ kind: "saved", id: "11111111-1111-1111-1111-111111111111", record }),
      notify: async () => ({ kind: "skipped", reason: "test" }),
      sendEmail: async () => {
        throw new Error("boom");
      },
      rateLimited: () => false,
      log: () => undefined,
    });
    const { status, data } = await run(handler, VALID);
    assert.equal(status, 200);
    assert.equal(data.saved, true);
    assert.equal(data.emailSent, false);
  });
  it("does not leak inquiry contents, addresses or Brevo details in logs or responses", async () => {
    const outcomes: EmailOutcome[] = [
      { kind: "not_configured", missing: ["BREVO_API_KEY"] },
      { kind: "rejected", status: 401, code: "unauthorized", detail: "Key not found" },
      { kind: "timeout" },
      { kind: "network", code: "ECONNRESET" },
    ];
    for (const outcome of outcomes) {
      const { handler, calls } = makeHandler(outcome);
      const { data } = await run(handler, VALID);
      const text = JSON.stringify([calls.logs, data]);
      for (const secret of [VALID.email, VALID.name, "Private message text"]) {
        assert.ok(!text.includes(secret), `leaked ${secret} for ${outcome.kind}`);
      }
      assert.ok(!JSON.stringify(data).includes("Key not found") && !JSON.stringify(data).includes("unauthorized"), "Brevo details must stay server-side");
    }
  });
});

describe("recipient and credentials come only from the server (real email path, stubbed network)", () => {
  it("ignores any recipient/cc/bcc the visitor sends and sends exactly one Brevo request", async () => {
    const saved = { fetch: globalThis.fetch, env: { ...process.env } };
    process.env.BREVO_API_KEY = "test-server-side-key-not-real";
    process.env.BREVO_SENDER_EMAIL = "notifications@thepopsybar.com";
    process.env.BREVO_SENDER_NAME = "The Popsy Bar";
    process.env.INQUIRY_NOTIFICATION_EMAIL = "owner@example.com";
    const requests: { url: string; headers: Record<string, string>; body: string }[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), headers: init?.headers as Record<string, string>, body: String(init?.body) });
      return new Response('{"messageId":"<real-path@test>"}', { status: 201 });
    }) as typeof fetch;
    try {
      const handler = createInquiryHandler({
        saveToCrm: async (record) => ({ kind: "saved", id: "11111111-1111-1111-1111-111111111111", record }),
        notify: async () => ({ kind: "skipped", reason: "test" }),
        rateLimited: () => false,
        log: () => undefined,
      });
      const { data } = await run(handler, {
        ...VALID,
        Name: "Visitor Name",
        to: "attacker@evil.test",
        recipient: "attacker@evil.test",
        _to: "attacker@evil.test",
        _cc: "attacker@evil.test",
        _bcc: "attacker@evil.test",
        _replyto: "attacker@evil.test",
        bcc: "attacker@evil.test",
        _subject: "Hello\r\nBcc: attacker@evil.test",
      });
      assert.equal(data.emailSent, true);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].url, BREVO_ENDPOINT);
      assert.equal(requests[0].headers["api-key"], "test-server-side-key-not-real");
      const sent = JSON.parse(requests[0].body);
      assert.deepEqual(sent.to, [{ email: "owner@example.com" }]);
      assert.equal(sent.sender.email, "notifications@thepopsybar.com");
      assert.equal(sent.replyTo.email, "visitor@example.com");
      assert.equal(sent.subject, "New Website Inquiry – The Popsy Bar");
      assert.ok(!("cc" in sent) && !("bcc" in sent));
      assert.ok(!JSON.stringify(data).includes("test-server-side-key"), "API key never appears in a response");
    } finally {
      globalThis.fetch = saved.fetch;
      process.env = saved.env;
    }
  });

  it("without Brevo configuration the inquiry is still saved and nothing is sent", async () => {
    const saved = { fetch: globalThis.fetch, env: { ...process.env } };
    delete process.env.BREVO_API_KEY;
    delete process.env.INQUIRY_NOTIFICATION_EMAIL;
    let fetched = 0;
    globalThis.fetch = (async () => {
      fetched++;
      return new Response("{}", { status: 201 });
    }) as typeof fetch;
    const logs: Record<string, unknown>[] = [];
    try {
      const handler = createInquiryHandler({
        saveToCrm: async (record) => ({ kind: "saved", id: "11111111-1111-1111-1111-111111111111", record }),
        notify: async () => ({ kind: "skipped", reason: "test" }),
        rateLimited: () => false,
        log: (e) => logs.push(e),
      });
      const { status, data } = await run(handler, VALID);
      assert.equal(status, 200);
      assert.equal(data.saved, true);
      assert.equal(data.emailSent, false);
      assert.equal(fetched, 0);
      assert.deepEqual(logs.find((l) => l.kind === "email-not-configured")?.missing, ["BREVO_API_KEY", "INQUIRY_NOTIFICATION_EMAIL"]);
    } finally {
      globalThis.fetch = saved.fetch;
      process.env = saved.env;
    }
  });
});
