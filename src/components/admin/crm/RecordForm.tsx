"use client";

import { useRef, useState, type FormEvent } from "react";
import { createManualRecord, updateCrmRecord } from "@/app/admin/(panel)/dashboard/actions";
import { todayISO } from "@/lib/crm/dates";
import type { CrmFieldErrors, CrmRecord } from "@/lib/crm/types";
import { OCCASION_TITLES, validateCrmInput } from "@/lib/crm/validate";
import Modal from "./Modal";

type Props = {
  /** null = add a new manual record; a record = edit it. */
  record: CrmRecord | null;
  open: boolean;
  onClose: () => void;
  onSaved: (record: CrmRecord, mode: "created" | "updated") => void;
};

type Values = { full_name: string; email: string; event_date: string; occasion_type: string; guest_count: string; event_description: string };

const EMPTY: Values = { full_name: "", email: "", event_date: "", occasion_type: "", guest_count: "", event_description: "" };

function valuesFor(record: CrmRecord | null): Values {
  if (!record) return EMPTY;
  return {
    full_name: record.full_name,
    email: record.email,
    event_date: record.event_date ?? "",
    occasion_type: record.occasion_type ?? "",
    guest_count: record.guest_count ? String(record.guest_count) : "",
    event_description: record.event_description,
  };
}

export default function RecordForm({ record, open, onClose, onSaved }: Props) {
  // Remount the form body each time the modal opens so it always starts fresh.
  return (
    <Modal open={open} title={record ? "Edit record" : "Add manually"} onClose={onClose}>
      {open ? <FormBody key={record?.id ?? "new"} record={record} onClose={onClose} onSaved={onSaved} /> : null}
    </Modal>
  );
}

function FormBody({ record, onClose, onSaved }: Omit<Props, "open">) {
  const [values, setValues] = useState<Values>(() => valuesFor(record));
  const [errors, setErrors] = useState<CrmFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false); // blocks double submits even before React re-renders

  const today = todayISO();
  const currentDate = record?.event_date ?? null;
  const minDate = currentDate && currentDate < today ? currentDate : today;

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    const checked = validateCrmInput(values, { currentEventDate: currentDate });
    if (!checked.ok) {
      setErrors(checked.errors);
      setFormError("Please fix the highlighted fields.");
      return;
    }
    inFlight.current = true;
    setPending(true);
    setFormError("");
    try {
      const result = record ? await updateCrmRecord(record.id, values) : await createManualRecord(values);
      if (result.ok && result.record) {
        onSaved(result.record, record ? "updated" : "created");
        return;
      }
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.message);
      }
    } catch {
      setFormError("Couldn’t reach the server. Your entries are still here, so you can try again.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  const err = (key: keyof Values) => (errors[key] ? <p className="crm-field__error" id={`crm-${key}-err`}>{errors[key]}</p> : null);
  const aria = (key: keyof Values) => ({ "aria-invalid": errors[key] ? true : undefined, "aria-describedby": errors[key] ? `crm-${key}-err` : undefined });

  return (
    <form className="crm-form" onSubmit={handleSubmit} noValidate aria-busy={pending}>
      <label className="crm-field">
        <span>Full Name <b aria-hidden="true">*</b></span>
        <input type="text" value={values.full_name} onChange={(e) => set("full_name", e.target.value)} maxLength={200} autoComplete="off" autoFocus required {...aria("full_name")} />
        {err("full_name")}
      </label>
      <label className="crm-field">
        <span>Email <b aria-hidden="true">*</b></span>
        <input type="email" value={values.email} onChange={(e) => set("email", e.target.value)} maxLength={254} autoComplete="off" required {...aria("email")} />
        {err("email")}
      </label>
      <div className="crm-form__row">
        <label className="crm-field">
          <span>Date <b aria-hidden="true">*</b></span>
          <input type="date" value={values.event_date} min={minDate} onChange={(e) => set("event_date", e.target.value)} required {...aria("event_date")} />
          {err("event_date")}
        </label>
        <label className="crm-field">
          <span>Guest Count <b aria-hidden="true">*</b></span>
          <input type="number" value={values.guest_count} min={1} max={100000} step={1} inputMode="numeric" onChange={(e) => set("guest_count", e.target.value)} required {...aria("guest_count")} />
          {err("guest_count")}
        </label>
      </div>
      <label className="crm-field">
        <span>Occasion Type <b aria-hidden="true">*</b></span>
        <select value={values.occasion_type} onChange={(e) => set("occasion_type", e.target.value)} required {...aria("occasion_type")}>
          <option value="">Select an occasion</option>
          {OCCASION_TITLES.map((title) => (
            <option key={title} value={title}>{title}</option>
          ))}
        </select>
        {err("occasion_type")}
      </label>
      <label className="crm-field">
        <span>Tell Us About Your Event</span>
        <textarea rows={4} value={values.event_description} onChange={(e) => set("event_description", e.target.value)} maxLength={5000} {...aria("event_description")} />
        {err("event_description")}
      </label>
      {formError ? <p className="crm-form__error" role="alert">{formError}</p> : null}
      <div className="crm-form__actions">
        <button type="button" className="btn btn--outline" onClick={onClose} disabled={pending}>Cancel</button>
        <button type="submit" className="btn btn--blush" disabled={pending}>
          {pending ? "Saving…" : record ? "Save changes" : "Add Record"}
        </button>
      </div>
    </form>
  );
}
