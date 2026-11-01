"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Calls `onNew` once for each new WEBSITE inquiry while the dashboard is open.
 * This is an in-page convenience only; it cannot wake a closed browser (that is Web Push's job).
 * Realtime delivers rows through Row Level Security, so only a signed-in admin receives them.
 */
export function useWebsiteInquiryRealtime(onNew: (id: string) => void) {
  const callback = useRef(onNew);
  useEffect(() => {
    callback.current = onNew;
  });

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const seen = new Set<string>();
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      // Give Realtime the admin's session so row-level security applies to the stream.
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      supabase.realtime.setAuth(data.session.access_token);
      const channel = supabase
        .channel("crm-website-inquiries")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "crm_inquiries", filter: "source=eq.website" }, (payload) => {
          const id = (payload.new as { id?: string }).id;
          if (!id || seen.has(id)) return; // the same row can be delivered more than once
          seen.add(id);
          callback.current(id);
        })
        .subscribe();
      cleanup = () => {
        void supabase.removeChannel(channel);
      };
      if (cancelled) cleanup();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
}
