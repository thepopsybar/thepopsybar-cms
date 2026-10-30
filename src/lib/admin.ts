import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AdminContext =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "forbidden"; user: User }
  | { state: "ok"; user: User; supabase: SupabaseClient };

/** Resolves who is calling. "ok" only when the signed-in user has a row in public.admins. */
export async function getAdminContext(): Promise<AdminContext> {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "signed-out" };
  const { data } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!data) return { state: "forbidden", user };
  return { state: "ok", user, supabase };
}
