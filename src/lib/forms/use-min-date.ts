"use client";

import { useEffect, useState } from "react";
import { todayISO } from "@/lib/crm/dates";

/** Today's date in the business time zone, for <input type="date" min>. Empty during SSR to avoid a hydration mismatch. */
export function useMinEventDate(): string | undefined {
  const [min, setMin] = useState<string | undefined>(undefined);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMin(todayISO());
  }, []);
  return min;
}
