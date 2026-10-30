import http from "node:http";
import https from "node:https";

export type TransportResponse = { status: number; text: string };

/**
 * A failed upstream call, with the phase it failed in:
 * - "unsent": the request was never fully handed to the network (DNS/connect/TLS failure or a
 *   connect timeout). The upstream cannot have processed it, so a retry cannot duplicate it.
 * - "sent": the request was fully written. The upstream MAY have processed it, so it must not
 *   be retried automatically.
 */
export class TransportError extends Error {
  constructor(
    readonly reason: "timeout" | "network",
    readonly phase: "unsent" | "sent",
    readonly code?: string,
  ) {
    super(`${reason} (${phase}${code ? `, ${code}` : ""})`);
    this.name = "TransportError";
  }
  get retrySafe(): boolean {
    return this.phase === "unsent";
  }
}

export type TransportOptions = {
  /** Give up if the request has not been fully sent within this time. */
  unsentTimeoutMs?: number;
  /** Give up on the whole exchange after this time. */
  totalTimeoutMs?: number;
};

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error && "code" in error && typeof (error as { code: unknown }).code === "string"
    ? (error as { code: string }).code
    : undefined;
}

/** POSTs JSON using node:http(s) so each phase of the exchange can be observed. */
export function postJson(
  url: string,
  body: string,
  headers: Record<string, string>,
  { unsentTimeoutMs = 8000, totalTimeoutMs = 18000 }: TransportOptions = {},
): Promise<TransportResponse> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === "http:" ? http : https;
    let flushed = false;
    let settled = false;
    let unsentTimer: ReturnType<typeof setTimeout> | undefined;
    let totalTimer: ReturnType<typeof setTimeout> | undefined;

    const settle = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(unsentTimer);
      clearTimeout(totalTimer);
      action();
    };

    const request = client.request(
      target,
      { method: "POST", headers: { ...headers, "Content-Length": String(Buffer.byteLength(body)) } },
      (response: http.IncomingMessage) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () =>
          settle(() => resolve({ status: response.statusCode ?? 0, text: Buffer.concat(chunks).toString("utf8") })),
        );
        response.on("error", (error: Error) => settle(() => reject(new TransportError("network", "sent", errorCode(error)))));
      },
    );

    request.on("finish", () => {
      flushed = true;
    });
    request.on("error", (error: Error) =>
      settle(() => reject(new TransportError("network", flushed ? "sent" : "unsent", errorCode(error)))),
    );

    unsentTimer = setTimeout(() => {
      if (flushed) return;
      settle(() => reject(new TransportError("timeout", "unsent")));
      request.destroy();
    }, unsentTimeoutMs);
    totalTimer = setTimeout(() => {
      settle(() => reject(new TransportError("timeout", flushed ? "sent" : "unsent")));
      request.destroy();
    }, totalTimeoutMs);

    request.end(body);
  });
}
