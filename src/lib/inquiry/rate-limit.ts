/**
 * Best-effort, in-memory limiter: at most `limit` submissions per `windowMs` per client IP.
 * On serverless hosts each instance keeps its own counter, so this slows bursts and casual abuse;
 * the honeypot, minimum fill time and strict validation are the other layers.
 */
const hits = new Map<string, number[]>();

export function isRateLimited(ip: string, now = Date.now(), limit = 6, windowMs = 10 * 60 * 1000): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, times] of hits) if (times.every((t) => now - t >= windowMs)) hits.delete(key);
  }
  return false;
}

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || null;
}
