import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * SERVER-ONLY Supabase client using the service-role key, which bypasses Row Level Security.
 * Used for exactly one thing: saving a validated public-form inquiry into public.crm_inquiries.
 * Never import this from a client component, and never prefix the key with NEXT_PUBLIC_.
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
  });
}
