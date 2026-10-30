"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ToastKind = "success" | "error";
type Toast = { id: number; kind: ToastKind; message: string; leaving: boolean };

const LIFETIME_MS = 5000;
const EXIT_MS = 220;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), EXIT_MS);
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, kind, message, leaving: false }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), LIFETIME_MS));
    },
    [dismiss],
  );

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return { toasts, push, dismiss };
}

export function ToastViewport({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className="crm-toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`crm-toast crm-toast--${toast.kind}${toast.leaving ? " is-leaving" : ""}`}
          role={toast.kind === "error" ? "alert" : "status"}
        >
          <span className="crm-toast__msg">{toast.message}</span>
          <button type="button" className="crm-iconbtn" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>
            <span aria-hidden="true">×</span>
          </button>
        </div>
      ))}
    </div>
  );
}
