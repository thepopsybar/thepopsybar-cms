"use client";

import { useMemo, useState, useTransition } from "react";
import { saveContent, type SaveEntry } from "@/app/admin/actions";
import ImageUploader from "./ImageUploader";
import type { FieldType } from "@/lib/cms/fields";

export type FieldView = {
  key: string;
  group: string;
  label: string;
  type: FieldType;
  defaultValue: string;
  value: string;
  publicId: string | null;
};

type Draft = Record<string, { value: string; publicId: string | null }>;

export default function ContentEditor({ fields }: { fields: FieldView[] }) {
  const initial = useMemo<Draft>(
    () => Object.fromEntries(fields.map((field) => [field.key, { value: field.value, publicId: field.publicId }])),
    [fields],
  );
  const [saved, setSaved] = useState<Draft>(initial);
  const [draft, setDraft] = useState<Draft>(initial);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirtyKeys = fields
    .map((field) => field.key)
    .filter((key) => draft[key].value !== saved[key].value || draft[key].publicId !== saved[key].publicId);

  const groups = useMemo(() => {
    const map = new Map<string, FieldView[]>();
    for (const field of fields) map.set(field.group, [...(map.get(field.group) ?? []), field]);
    return [...map.entries()];
  }, [fields]);

  function setField(key: string, value: string, publicId: string | null) {
    setDraft((current) => ({ ...current, [key]: { value, publicId } }));
    setStatus(null);
  }

  function save() {
    const entries: SaveEntry[] = dirtyKeys.map((key) => ({ key, value: draft[key].value, publicId: draft[key].publicId }));
    startTransition(async () => {
      const result = await saveContent(entries);
      setStatus(result);
      if (result.ok) setSaved(draft);
    });
  }

  return (
    <div className="admin-editor">
      {groups.map(([group, groupFields]) => (
        <fieldset className="admin-card admin-group" key={group}>
          <legend>{group}</legend>
          {groupFields.map((field) => {
            const current = draft[field.key];
            const id = `field-${field.key}`;
            const changedFromDefault = current.value !== field.defaultValue || Boolean(current.publicId);
            return (
              <div className="admin-field" key={field.key}>
                <label htmlFor={id}>{field.label}</label>
                {field.type === "textarea" ? (
                  <textarea id={id} rows={4} value={current.value} onChange={(e) => setField(field.key, e.target.value, null)} />
                ) : (
                  <input
                    id={id}
                    type="text"
                    value={current.value}
                    onChange={(e) => setField(field.key, e.target.value, null)}
                    placeholder={field.type === "image" ? "/images/file.jpeg or upload below" : field.type === "link" ? "/page, #section or https://…" : undefined}
                  />
                )}
                {field.type === "image" ? (
                  <div className="admin-image-row">
                    {current.value ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="admin-thumb" src={current.value} alt="" />
                    ) : (
                      <span className="admin-thumb admin-thumb--empty">No image</span>
                    )}
                    <ImageUploader label={current.value ? "Replace image" : "Upload image"} onUploaded={(img) => setField(field.key, img.url, img.publicId)} />
                    {current.value ? (
                      <button type="button" className="admin-link-btn" onClick={() => setField(field.key, "", null)}>Remove image</button>
                    ) : null}
                  </div>
                ) : null}
                {changedFromDefault ? (
                  <button type="button" className="admin-link-btn" onClick={() => setField(field.key, field.defaultValue, null)}>
                    Reset to original
                  </button>
                ) : null}
              </div>
            );
          })}
        </fieldset>
      ))}

      <div className="admin-savebar" role="region" aria-label="Save changes">
        <span>{dirtyKeys.length === 0 ? "No unsaved changes" : `${dirtyKeys.length} unsaved change${dirtyKeys.length === 1 ? "" : "s"}`}</span>
        {status ? <span className={status.ok ? "admin-success" : "admin-error"} role={status.ok ? "status" : "alert"}>{status.message}</span> : null}
        <button type="button" className="btn btn--blush btn--sm" onClick={save} disabled={pending || dirtyKeys.length === 0}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
