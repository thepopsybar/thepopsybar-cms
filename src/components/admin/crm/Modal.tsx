"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  /** While true (e.g. a save is running) Esc, the backdrop and the X do nothing. */
  busy?: boolean;
  size?: "md" | "lg";
  children: ReactNode;
};

/**
 * Accessible modal built on the native <dialog>: the browser traps focus, handles Esc,
 * makes the page behind inert and returns focus to the button that opened it.
 */
export default function Modal({ open, title, onClose, busy = false, size = "md", children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return <dialog ref={ref} className="crm-dialog" aria-hidden="true" />;

  return (
    <dialog
      ref={ref}
      className={`crm-dialog crm-dialog--${size}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !busy) onClose();
      }}
    >
      <div className="crm-dialog__panel">
        <header className="crm-dialog__head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="crm-iconbtn" aria-label="Close" onClick={onClose} disabled={busy}>
            <span aria-hidden="true">×</span>
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
