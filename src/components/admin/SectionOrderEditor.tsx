"use client";

import { useState, useTransition } from "react";
import { saveSectionSettings } from "@/app/admin/actions";

export type OrderItem = { id: string; label: string; enabled: boolean };

type SectionOrderEditorProps = {
  settingKey: string;
  title: string;
  items: OrderItem[];
};

export default function SectionOrderEditor({ settingKey, title, items: initial }: SectionOrderEditorProps) {
  const [items, setItems] = useState(initial);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setStatus(null);
  }

  function toggle(index: number) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, enabled: !item.enabled } : item)));
    setStatus(null);
  }

  function save() {
    startTransition(async () => {
      setStatus(await saveSectionSettings(settingKey, items.map((item) => ({ section: item.id, enabled: item.enabled }))));
    });
  }

  return (
    <section className="admin-card" aria-labelledby={`order-${settingKey}`}>
      <h3 id={`order-${settingKey}`}>{title}</h3>
      <p className="admin-hint">Use the arrows to change the order. Untick “Visible” to hide a section from the site without deleting it.</p>
      <ol className="admin-order">
        {items.map((item, index) => (
          <li key={item.id} className={item.enabled ? "" : "is-hidden"}>
            <span className="admin-order__label">{item.label}</span>
            <label className="admin-check">
              <input type="checkbox" checked={item.enabled} onChange={() => toggle(index)} /> Visible
            </label>
            <span className="admin-order__buttons">
              <button type="button" className="admin-icon-btn" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${item.label} up`}>↑</button>
              <button type="button" className="admin-icon-btn" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label={`Move ${item.label} down`}>↓</button>
            </span>
          </li>
        ))}
      </ol>
      <div className="admin-actions">
        <button type="button" className="btn btn--blush btn--sm" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save order"}
        </button>
        {status ? <span className={status.ok ? "admin-success" : "admin-error"} role={status.ok ? "status" : "alert"}>{status.message}</span> : null}
      </div>
    </section>
  );
}
