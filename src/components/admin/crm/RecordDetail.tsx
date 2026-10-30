"use client";

import { useState } from "react";
import { formatCreatedAt, formatEventDate } from "@/lib/crm/dates";
import type { CrmRecord } from "@/lib/crm/types";
import Modal from "./Modal";
import SourceBadge from "./SourceBadge";

type Props = {
  record: CrmRecord | null;
  onClose: () => void;
  onEdit: (record: CrmRecord) => void;
  onDelete: (record: CrmRecord) => Promise<boolean>;
};

export default function RecordDetail({ record, onClose, onEdit, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function close() {
    setConfirming(false);
    onClose();
  }

  async function confirmDelete() {
    if (!record || deleting) return;
    setDeleting(true);
    const ok = await onDelete(record);
    setDeleting(false);
    if (ok) close();
  }

  const rows: [string, string][] = record
    ? [
        ["Email", record.email],
        ["Event date", formatEventDate(record.event_date) || "Not provided"],
        ["Occasion type", record.occasion_type || "Not provided"],
        ["Guest count", record.guest_count ? String(record.guest_count) : "Not provided"],
        ...(record.phone ? ([["Phone", record.phone]] as [string, string][]) : []),
        ...(record.event_location ? ([["Event location", record.event_location]] as [string, string][]) : []),
        ["Created", formatCreatedAt(record.created_at)],
      ]
    : [];

  return (
    <Modal open={Boolean(record)} title={record?.full_name ?? "Record"} onClose={close} busy={deleting} size="lg">
      {record ? (
        <div className="crm-detail">
          <p><SourceBadge source={record.source} /></p>
          <dl className="crm-detail__grid">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <h3>Tell us about your event</h3>
          <p className="crm-detail__text">{record.event_description || "No description provided."}</p>
          {Object.keys(record.extra ?? {}).length > 0 ? (
            <>
              <h3>Other details from the form</h3>
              <dl className="crm-detail__grid">
                {Object.entries(record.extra).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : null}
          {confirming ? (
            <div className="crm-confirm" role="alertdialog" aria-label="Confirm delete">
              <p>Delete {record.full_name}’s record? This can’t be undone.</p>
              <div className="crm-form__actions">
                <button type="button" className="btn btn--outline" onClick={() => setConfirming(false)} disabled={deleting}>Keep record</button>
                <button type="button" className="btn crm-btn-danger" onClick={confirmDelete} disabled={deleting} autoFocus>
                  {deleting ? "Deleting…" : "Delete record"}
                </button>
              </div>
            </div>
          ) : (
            <div className="crm-form__actions">
              <button type="button" className="crm-linkbtn crm-linkbtn--danger" onClick={() => setConfirming(true)}>Delete</button>
              <button type="button" className="btn btn--outline" onClick={() => onEdit(record)}>Edit</button>
              <button type="button" className="btn btn--blush" onClick={close}>Close</button>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
