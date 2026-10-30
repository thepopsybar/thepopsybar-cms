import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/** Cookie-free anonymous client for public reads, so public pages can be statically rendered. */
export function createPublicClient() {
  if (!isSupabaseConfigured()) return null;
  return createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
