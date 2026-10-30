"use server";

import { getAdminContext } from "@/lib/admin";
import { todayISO } from "@/lib/crm/dates";
import { PAGE_SIZE, type CrmCounts, type CrmListParams, type CrmListResult, type CrmMutationResult, type CrmRecord } from "@/lib/crm/types";
import { validateCrmInput } from "@/lib/crm/validate";

const NOT_AUTHORIZED = "You are not signed in as an administrator. Please sign in again.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  const ctx = await getAdminContext();
  return ctx.state === "ok" ? ctx : null;
}

function dbMessage(code: string | undefined, fallback: string): string {
  if (code === "42P01" || code === "PGRST205") {
    return "The CRM table doesn’t exist yet. Run supabase/migrations/20261029000000_create_crm_inquiries.sql in the Supabase SQL Editor.";
  }
  return fallback;
}

/** Quotes the search text for a PostgREST filter and removes characters that could change its meaning. */
function searchPattern(q: string): string {
  const safe = q.trim().slice(0, 100).replace(/[\\"*%,()]/g, " ").replace(/_/g, "%").replace(/\s+/g, " ").trim();
  return safe ? `"%${safe}%"` : "";
}

export async function listCrmRecords(params: CrmListParams): Promise<CrmListResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED };

  const page = Number.isInteger(params.page) && params.page > 0 ? params.page : 1;
  const sort = params.sort === "event_date" ? "event_date" : "created_at";
  const ascending = params.dir === "asc";
  const source = params.source === "website" || params.source === "manual" ? params.source : "all";

  let query = ctx.supabase.from("crm_inquiries").select("*", { count: "exact" });
  if (source !== "all") query = query.eq("source", source);
  const pattern = searchPattern(typeof params.q === "string" ? params.q : "");
  if (pattern) query = query.or(`full_name.ilike.${pattern},email.ilike.${pattern}`);
  query = query
    .order(sort, { ascending, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const count = (src?: "website" | "manual") => {
    const q = ctx.supabase.from("crm_inquiries").select("id", { count: "exact", head: true });
    return src ? q.eq("source", src) : q;
  };
  const [list, total, website, manual] = await Promise.all([query, count(), count("website"), count("manual")]);

  if (list.error) return { ok: false, message: dbMessage(list.error.code, "Couldn’t load the records. Please try again.") };
  const counts: CrmCounts = { total: total.count ?? 0, website: website.count ?? 0, manual: manual.count ?? 0 };
  return { ok: true, rows: (list.data ?? []) as CrmRecord[], total: list.count ?? 0, counts, page };
}

/** Adds an admin-entered record. `source` is forced to "manual" here and again by the database policy. */
export async function createManualRecord(input: unknown): Promise<CrmMutationResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED };

  const checked = validateCrmInput(input, { today: todayISO() });
  if (!checked.ok) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: checked.errors };

  const { data, error } = await ctx.supabase
    .from("crm_inquiries")
    .insert({ ...checked.value, source: "manual" })
    .select("*")
    .single();
  if (error) {
    console.error("[crm] manual insert failed", { code: error.code });
    return { ok: false, message: dbMessage(error.code, "Couldn’t save the record. Your entries are still here, so you can try again.") };
  }
  return { ok: true, record: data as CrmRecord };
}

/** Edits the six CRM fields only. source, created_at and id can't be changed (trigger + this allow-list). */
export async function updateCrmRecord(id: string, input: unknown): Promise<CrmMutationResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED };
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, message: "That record could not be found." };

  const existing = await ctx.supabase.from("crm_inquiries").select("event_date").eq("id", id).maybeSingle();
  if (existing.error) return { ok: false, message: dbMessage(existing.error.code, "Couldn’t load the record.") };
  if (!existing.data) return { ok: false, message: "That record no longer exists. Refresh the list." };

  const checked = validateCrmInput(input, {
    today: todayISO(),
    currentEventDate: (existing.data as { event_date: string | null }).event_date,
  });
  if (!checked.ok) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: checked.errors };

  const { data, error } = await ctx.supabase.from("crm_inquiries").update(checked.value).eq("id", id).select("*").single();
  if (error) {
    console.error("[crm] update failed", { code: error.code });
    return { ok: false, message: dbMessage(error.code, "Couldn’t save your changes. Please try again.") };
  }
  return { ok: true, record: data as CrmRecord };
}

export async function deleteCrmRecord(id: string): Promise<CrmMutationResult> {
  const ctx = await requireAdmin();
  if (!ctx) return { ok: false, message: NOT_AUTHORIZED };
  if (typeof id !== "string" || !UUID.test(id)) return { ok: false, message: "That record could not be found." };
  const { error } = await ctx.supabase.from("crm_inquiries").delete().eq("id", id);
  if (error) {
    console.error("[crm] delete failed", { code: error.code });
    return { ok: false, message: "Couldn’t delete the record. Please try again." };
  }
  return { ok: true };
}
