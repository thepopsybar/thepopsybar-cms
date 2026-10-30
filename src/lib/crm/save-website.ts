import { createServiceClient } from "@/lib/supabase/service";
import type { WebsiteRecord } from "./map-website";

export type SaveOutcome =
  | { kind: "saved"; id: string; record: WebsiteRecord }
  /** This submission token was already saved, so nothing new was written. */
  | { kind: "duplicate" }
  /** No service-role key configured: the CRM is simply not connected yet. */
  | { kind: "unconfigured" }
  | { kind: "failed"; code: string };

/**
 * Writes one public-form inquiry. `source` is fixed to "website" here, on the server,
 * and is never read from anything the browser sent.
 */
export async function saveWebsiteInquiry(record: WebsiteRecord, token: string | null): Promise<SaveOutcome> {
  const supabase = createServiceClient();
  if (!supabase) return { kind: "unconfigured" };
  try {
    const { data, error } = await supabase
      .from("crm_inquiries")
      .insert({ ...record, source: "website", submission_token: token })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505" && token) return { kind: "duplicate" };
      return { kind: "failed", code: error.code || "DB_ERROR" };
    }
    return { kind: "saved", id: (data as { id: string }).id, record };
  } catch {
    return { kind: "failed", code: "DB_UNREACHABLE" };
  }
}
