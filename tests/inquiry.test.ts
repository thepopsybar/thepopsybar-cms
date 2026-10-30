/**
 * Run with:  npm run test:inquiry
 * (uses `npx tsx --test`; nothing is added to the project's dependencies.)
 * No real email is ever sent: the upstream is mocked or a throwaway local server.
 */
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import { classifyFormSubmitResponse } from "../src/lib/inquiry/classify";
import { createInquiryHandler, type InquiryResponse } from "../src/lib/inquiry/handler";
import { sendToFormSubmit, type SendOutcome } from "../src/lib/inquiry/send";
import { parseInquiry } from "../src/lib/inquiry/validate";

const ENDPOINT = "https://upstream.example/ajax/recipient-address";

describe("classifyFormSubmitResponse", () => {
  it("accepts FormSubmit's documented string success", () => {
    assert.deepEqual(classifyFormSubmitResponse(200, '{"success":"true","message":"Thanks"}'), { kind: "accepted" });
  });
  it("accepts boolean success", () => {
    assert.deepEqual(classifyFormSubmitResponse(200, '{"success":true}'), { kind: "accepted" });
  });
  it("treats an activation message as activation even when success is true", () => {
    assert.equal(classifyFormSubmitResponse(200, '{"success":"true","message":"This form needs Activation. Check your inbox."}').kind, "activation");
  });
  it("treats an activation message as activation when success is false", () => {
    assert.equal(classifyFormSubmitResponse(200, '{"success":"false","message":"Form needs activation"}').kind, "activation");
  });
  it("rejects success:false", () => {
    assert.equal(classifyFormSubmitResponse(200, '{"success":"false","message":"nope"}').kind, "rejected");
  });
  it("rejects a non-2xx status even if the body says success", () => {
    assert.equal(classifyFormSubmitResponse(500, '{"success":"true"}').kind, "rejected");
  });
  it("flags HTML or non-JSON bodies as malformed", () => {
    assert.equal(classifyFormSubmitResponse(403, "<html>Just a moment...</html>").kind, "malformed");
    assert.equal(classifyFormSubmitResponse(200, "").kind, "malformed");
    assert.equal(classifyFormSubmitResponse(200, "null").kind, "malformed");
    assert.equal(classifyFormSubmitResponse(200, "[1]").kind, "malformed");
  });
});

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

type Call = { endpoint: string; payload: Record<string, string>; origin: string };

function makeHandler(outcome: SendOutcome, options: { fallback?: boolean } = {}) {
  const calls: Call[] = [];
  const logs: Record<string, unknown>[] = [];
  const handler = createInquiryHandler({
    endpoint: ENDPOINT,
    allowBrowserFallback: options.fallback ?? true,
    send: async (endpoint, payload, origin) => {
      calls.push({ endpoint, payload, origin });
      return outcome;
    },
    log: (entry) => logs.push(entry),
  });
  return { handler, calls, logs };
}

function post(body: unknown, raw = false) {
  return new Request("https://popsy.example/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

async function run(handler: (r: Request) => Promise<Response>, body: unknown, raw = false) {
  const res = await handler(post(body, raw));
  return { status: res.status, data: (await res.json()) as InquiryResponse };
}

const VALID = { email: "visitor@example.com", name: "Visitor Name", message: "Private message text", _subject: "Test" };

describe("inquiry handler", () => {
  it("returns 400 for malformed JSON without calling upstream", async () => {
    const { handler, calls } = makeHandler({ kind: "accepted" });
    const { status, data } = await run(handler, "{not json", true);
    assert.equal(status, 400);
    assert.equal(data.ok, false);
    assert.equal(calls.length, 0);
  });
  it("returns 400 for a missing/invalid email without calling upstream", async () => {
    const { handler, calls } = makeHandler({ kind: "accepted" });
    assert.equal((await run(handler, { name: "x" })).status, 400);
    assert.equal((await run(handler, { email: "bad" })).data.code, "INVALID_EMAIL");
    assert.equal(calls.length, 0);
  });
  it("acknowledges honeypot submissions without forwarding them", async () => {
    const { handler, calls } = makeHandler({ kind: "accepted" });
    const { status, data } = await run(handler, { ...VALID, website: "spam" });
    assert.equal(status, 200);
    assert.equal(data.ok, true);
    assert.equal(calls.length, 0);
  });
  it("rejects oversized bodies", async () => {
    const { handler, calls } = makeHandler({ kind: "accepted" });
    const { status } = await run(handler, JSON.stringify({ email: "a@b.co", message: "x".repeat(70000) }), true);
    assert.equal(status, 413);
    assert.equal(calls.length, 0);
  });
  it("reports success only when upstream accepted, forwarding exactly once", async () => {
    const { handler, calls } = makeHandler({ kind: "accepted" });
    const { status, data } = await run(handler, VALID);
    assert.equal(status, 200);
    assert.equal(data.ok, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].origin, "https://popsy.example");
    assert.equal(calls[0].payload._template, "table");
    assert.equal(calls[0].payload.email, VALID.email);
  });
  it("maps activation to 503, never success", async () => {
    const { status, data } = await run(makeHandler({ kind: "activation" }).handler, VALID);
    assert.equal(status, 503);
    assert.equal(data.ok, false);
    assert.equal(data.code, "ACTIVATION_REQUIRED");
  });
  it("maps rejection and malformed replies to 502", async () => {
    assert.equal((await run(makeHandler({ kind: "rejected", status: 403, detail: "x" }).handler, VALID)).data.code, "UPSTREAM_REJECTED");
    assert.equal((await run(makeHandler({ kind: "malformed", status: 200 }).handler, VALID)).data.code, "UPSTREAM_INVALID_RESPONSE");
  });
  it("marks an unreachable upstream as retry-safe and offers the fallback", async () => {
    const { status, data } = await run(makeHandler({ kind: "unreachable", code: "ETIMEDOUT" }).handler, VALID);
    assert.equal(status, 503);
    assert.equal(data.retrySafe, true);
    assert.equal(data.fallbackEndpoint, ENDPOINT);
  });
  it("withholds the fallback endpoint when disabled", async () => {
    const { data } = await run(makeHandler({ kind: "unreachable", code: "X" }, { fallback: false }).handler, VALID);
    assert.equal(data.retrySafe, true);
    assert.equal(data.fallbackEndpoint, undefined);
  });
  it("never marks a timeout or mid-flight network error as retry-safe", async () => {
    const timeout = await run(makeHandler({ kind: "timeout" }).handler, VALID);
    assert.equal(timeout.status, 504);
    assert.equal(timeout.data.retrySafe, undefined);
    assert.equal(timeout.data.fallbackEndpoint, undefined);
    const network = await run(makeHandler({ kind: "network", code: "ECONNRESET" }).handler, VALID);
    assert.equal(network.data.retrySafe, undefined);
    assert.equal(network.data.fallbackEndpoint, undefined);
  });
  it("does not leak inquiry contents or the recipient in logs or non-fallback responses", async () => {
    for (const outcome of [
      { kind: "activation" },
      { kind: "rejected", status: 500, detail: "oops" },
      { kind: "timeout" },
      { kind: "network", code: "ECONNRESET" },
    ] as SendOutcome[]) {
      const { handler, logs } = makeHandler(outcome);
      const { data } = await run(handler, VALID);
      const text = JSON.stringify([logs, data]);
      for (const secret of [VALID.email, VALID.name, "Private message text", "recipient-address"]) {
        assert.ok(!text.includes(secret), `leaked ${secret} for ${outcome.kind}`);
      }
    }
  });
});

describe("sendToFormSubmit against a real local server", () => {
  function startServer(onRequest: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
    const received: { headers: http.IncomingHttpHeaders; body: string }[] = [];
    const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
      let body = "";
      req.on("data", (chunk: Buffer) => (body += chunk));
      req.on("end", () => {
        received.push({ headers: req.headers, body });
        onRequest(req, res);
      });
    });
    return new Promise<{ url: string; received: typeof received; close: () => Promise<void> }>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const { port } = server.address() as AddressInfo;
        resolve({
          url: `http://127.0.0.1:${port}/ajax/x`,
          received,
          close: () => new Promise<void>((done) => { server.closeAllConnections(); server.close(() => done()); }),
        });
      });
    });
  }

  it("accepts a confirmed reply and sends browser-style Origin/Referer/User-Agent exactly once", async () => {
    const upstream = await startServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end('{"success":"true","message":"ok"}');
    });
    try {
      const outcome = await sendToFormSubmit(upstream.url, { email: "a@b.co" }, "https://popsy.example");
      assert.deepEqual(outcome, { kind: "accepted" });
      assert.equal(upstream.received.length, 1);
      assert.equal(upstream.received[0].headers.origin, "https://popsy.example");
      assert.equal(upstream.received[0].headers.referer, "https://popsy.example/");
      assert.match(String(upstream.received[0].headers["user-agent"]), /Mozilla/);
      assert.equal(upstream.received[0].headers.accept, "application/json");
    } finally {
      await upstream.close();
    }
  });

  it("classifies HTML and non-2xx upstream replies", async () => {
    const html = await startServer((_req, res) => { res.statusCode = 403; res.end("<html>blocked</html>"); });
    try {
      assert.equal((await sendToFormSubmit(html.url, { email: "a@b.co" }, "https://popsy.example")).kind, "malformed");
    } finally { await html.close(); }
    const rejected = await startServer((_req, res) => { res.statusCode = 500; res.end('{"success":"false","message":"bad"}'); });
    try {
      assert.equal((await sendToFormSubmit(rejected.url, { email: "a@b.co" }, "https://popsy.example")).kind, "rejected");
    } finally { await rejected.close(); }
  });

  it("reports a timeout (not retry-safe) when a sent request never gets an answer, without retrying", async () => {
    const upstream = await startServer(() => { /* never respond */ });
    try {
      const outcome = await sendToFormSubmit(upstream.url, { email: "a@b.co" }, "https://popsy.example", {
        timeouts: { unsentTimeoutMs: 1000, totalTimeoutMs: 400 },
      });
      assert.equal(outcome.kind, "timeout");
      assert.equal(upstream.received.length, 1, "must not retry a request that may have been delivered");
    } finally {
      await upstream.close();
    }
  });

  it("reports a connection refusal as unreachable (retry-safe)", async () => {
    const upstream = await startServer(() => undefined);
    const url = upstream.url;
    await upstream.close();
    const outcome = await sendToFormSubmit(url, { email: "a@b.co" }, "https://popsy.example");
    assert.equal(outcome.kind, "unreachable");
  });

  it("reports an unroutable host as unreachable (retry-safe) within the connect timeout", async () => {
    const started = Date.now();
    const outcome = await sendToFormSubmit("http://10.255.255.1:81/ajax/x", { email: "a@b.co" }, "https://popsy.example", {
      timeouts: { unsentTimeoutMs: 400, totalTimeoutMs: 2000 },
    });
    assert.equal(outcome.kind, "unreachable");
    assert.ok(Date.now() - started < 3000);
  });
});
