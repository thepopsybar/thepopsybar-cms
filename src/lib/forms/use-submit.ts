"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { submitInquiry } from "./submit";

export type FormStatus = { state: "idle" | "pending" | "success" | "error"; message: string };

const MIN_FILL_MS = 2500;

function newToken(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** Pending/success/error state plus basic bot protection (honeypot + minimum fill time). */
export function useInquirySubmit(subject: string) {
  const [status, setStatus] = useState<FormStatus>({ state: "idle", message: "" });
  const mountedAt = useRef<number | null>(null);
  // One token per submission attempt: if a request is repeated, the server can tell it is the same
  // inquiry and will not create a second CRM record. A fresh token is issued after each success.
  const token = useRef<string | null>(null);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const submit = useCallback(
    async (fields: Record<string, string>, honeypot: string): Promise<boolean> => {
      const tooFast = mountedAt.current !== null && Date.now() - mountedAt.current < MIN_FILL_MS;
      if (honeypot || tooFast) {
        setStatus({ state: "error", message: "Please take a moment to review your details, then submit again." });
        return false;
      }
      setStatus({ state: "pending", message: "Sending your inquiry…" });
      if (!token.current) token.current = newToken();
      const result = await submitInquiry(fields, subject, token.current);
      if (result.ok) token.current = null;
      setStatus({ state: result.ok ? "success" : "error", message: result.message });
      return result.ok;
    },
    [subject],
  );

  return { status, submit };
}
