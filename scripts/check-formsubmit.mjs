#!/usr/bin/env node
/**
 * Connectivity check for the inquiry form. Run:  npm run check:formsubmit
 *
 * It separates DNS, TCP, TLS and HTTP so you can see WHERE a timeout happens from this machine's
 * Node.js (which is what the /api/inquiries route uses). Nothing is emailed unless you add --send,
 * which submits one clearly-labelled test inquiry to the configured recipient.
 */
import dns from "node:dns/promises";
import fs from "node:fs";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";

const HOST = "formsubmit.co";
const SEND = process.argv.includes("--send");
const ms = (start) => `${Date.now() - start} ms`;
const line = (label, value) => console.log(`${label.padEnd(34)} ${value}`);

function step(label, work) {
  const started = Date.now();
  return work().then(
    (result) => { line(label, `OK   (${ms(started)})${result ? " " + result : ""}`); return true; },
    (error) => { line(label, `FAIL (${ms(started)}) ${error?.code ?? error?.name ?? "error"}: ${error?.message ?? error}`); return false; },
  );
}

function tcp(address, port, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: address, port });
    socket.setTimeout(timeout, () => { socket.destroy(); reject(Object.assign(new Error(`no connection within ${timeout} ms`), { code: "CONNECT_TIMEOUT" })); });
    socket.once("connect", () => { socket.destroy(); resolve(); });
    socket.once("error", reject);
  });
}

function tlsHandshake(address, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: address, port: 443, servername: HOST });
    socket.setTimeout(timeout, () => { socket.destroy(); reject(Object.assign(new Error(`no TLS handshake within ${timeout} ms`), { code: "TLS_TIMEOUT" })); });
    socket.once("secureConnect", () => { const protocol = socket.getProtocol(); socket.destroy(); resolve(protocol); });
    socket.once("error", reject);
  });
}

function httpsRequest(path, { method = "GET", body, headers = {}, timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request({ host: HOST, path, method, headers: { ...headers, ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}) } }, (response) => {
      const chunks = [];
      response.on("data", (c) => chunks.push(c));
      response.on("end", () => resolve({ status: response.statusCode, text: Buffer.concat(chunks).toString("utf8") }));
    });
    request.setTimeout(timeout, () => request.destroy(Object.assign(new Error(`no response within ${timeout} ms`), { code: "RESPONSE_TIMEOUT" })));
    request.on("error", reject);
    request.end(body);
  });
}

console.log(`Node ${process.version} on ${process.platform}\n`);
for (const key of ["HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy", "NO_PROXY", "NODE_USE_ENV_PROXY", "NODE_EXTRA_CA_CERTS"]) {
  if (process.env[key]) line(`env ${key}`, "set");
}
console.log("(Node does not automatically use your Windows/browser proxy or VPN settings.)\n");

let addresses = [];
const dnsOk = await step(`DNS lookup ${HOST}`, async () => {
  addresses = await dns.lookup(HOST, { all: true });
  return addresses.map((a) => `${a.address}${a.family === 6 ? " (IPv6)" : ""}`).join(", ");
});

if (dnsOk) {
  for (const { address, family } of addresses) {
    const tag = `${family === 6 ? "IPv6" : "IPv4"} ${address}`;
    if (await step(`TCP 443  ${tag}`, () => tcp(address, 443))) {
      await step(`TLS      ${tag}`, () => tlsHandshake(address));
    }
  }
}

await step("HTTPS GET /ajax-documentation", async () => {
  const res = await httpsRequest("/ajax-documentation");
  return `HTTP ${res.status}`;
});

await step("fetch() GET (undici)", async () => {
  const res = await fetch(`https://${HOST}/ajax-documentation`, { signal: AbortSignal.timeout(15000) });
  return `HTTP ${res.status}`;
});

if (SEND) {
  const source = fs.readFileSync(new URL("../src/lib/site-config.ts", import.meta.url), "utf8");
  const recipient = process.env.FORMSUBMIT_ENDPOINT?.trim() || `https://formsubmit.co/ajax/${/FORM_SUBMIT_EMAIL\s*=\s*"([^"]+)"/.exec(source)?.[1] ?? ""}`;
  const path = new URL(recipient).pathname;
  const body = JSON.stringify({
    name: "Connectivity test",
    email: "connectivity-test@example.com",
    message: "Automated test from scripts/check-formsubmit.mjs. Safe to ignore.",
    _subject: "[TEST] Popsy Bar form connectivity",
    _template: "table",
    _captcha: "false",
  });
  await step("POST test inquiry (--send)", async () => {
    const res = await httpsRequest(path, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json", Accept: "application/json", Origin: "http://localhost:3000", Referer: "http://localhost:3000/", "User-Agent": "Mozilla/5.0 (compatible; ThePopsyBar-Website/1.0)" },
    });
    let summary = "";
    try { const json = JSON.parse(res.text); summary = `success=${json.success} message=${String(json.message).slice(0, 140)}`; } catch { summary = "non-JSON reply (first 80 chars): " + res.text.slice(0, 80).replace(/\s+/g, " "); }
    return `HTTP ${res.status} ${summary}`;
  });
} else {
  console.log("\nSkipped the POST test. Add --send to submit one labelled test inquiry.");
}

console.log(`
How to read this:
  DNS fails                  -> network/DNS/VPN problem for Node on this machine.
  TCP fails or times out     -> a firewall/VPN/proxy is blocking node.exe (PowerShell can differ).
  TCP ok, TLS fails          -> antivirus/HTTPS inspection or a missing corporate root certificate.
  TLS ok, GET times out      -> formsubmit.co is accepting connections but not answering this client.
  everything ok, POST times out -> FormSubmit is not answering server-style requests (try on Vercel).
`);
