import { timingSafeEqual } from "node:crypto";
import { getVapidConfig } from "@/lib/push/config";
import { processDueOutbox } from "@/lib/push/deliver";
import { createWebPushSender } from "@/lib/push/sender";
import { createSupabasePushStore } from "@/lib/push/store-supabase";
import { createServiceClient } from "@/lib/supabase/service";

// web-push needs Node's crypto/https, so this must not run on the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Retries push deliveries that failed temporarily. Vercel Cron calls this with
 * "Authorization: Bearer $CRON_SECRET"; you can also call it by hand with the same header.
 */
async function run(request: Request): Promise<Response> {
  if (!process.env.CRON_SECRET?.trim()) return Response.json({ ok: false, message: "CRON_SECRET is not configured." }, { status: 503 });
  if (!authorized(request)) return Response.json({ ok: false, message: "Unauthorized." }, { status: 401 });

  const config = getVapidConfig();
  if (!config.ok) return Response.json({ ok: false, message: config.message }, { status: 503 });
  const db = createServiceClient();
  if (!db) return Response.json({ ok: false, message: "SUPABASE_SERVICE_ROLE_KEY is not set." }, { status: 503 });

  try {
    const summary = await processDueOutbox(createSupabasePushStore(db), await createWebPushSender(config));
    return Response.json({ ok: true, ...summary }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("[push] retry run failed");
    return Response.json({ ok: false, message: "Retry run failed. Check the server logs." }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
