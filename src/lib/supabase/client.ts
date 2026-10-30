import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/** Browser client (used only for sign-in/sign-out). Uses the publishable key, never a secret. */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
