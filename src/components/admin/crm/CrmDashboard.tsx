"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteCrmRecord, listCrmRecords } from "@/app/admin/(panel)/dashboard/actions";
import { signOut } from "@/app/admin/actions";
import { formatCreatedAt, formatEventDate } from "@/lib/crm/dates";
import { PAGE_SIZE, type CrmCounts, type CrmRecord, type CrmSort } from "@/lib/crm/types";
import PushSetup from "./PushSetup";
import RecordDetail from "./RecordDetail";
import RecordForm from "./RecordForm";
import SourceBadge from "./SourceBadge";
import { ToastViewport, useToasts } from "./Toasts";
import { useWebsiteInquiryRealtime } from "./useInquiryRealtime";

type SourceFilter = "all" | "website" | "manual";

export default function CrmDashboard() {
  const [rows, setRows] = useState<CrmRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<CrmCounts>({ total: 0, website: 0, manual: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [sort, setSort] = useState<CrmSort>("created_at");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CrmRecord | null>(null);
  const [viewing, setViewing] = useState<CrmRecord | null>(null);
  const { toasts, push, dismiss } = useToasts();
  const latest = useRef(0);

  // Debounce the search box.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  // Load from Supabase (through the admin-checked server action). Ignore out-of-order replies.
  useEffect(() => {
    const id = ++latest.current;
    let cancelled = false;
    (async () => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      try {
        const result = await listCrmRecords({ q, source, sort, dir, page });
        if (cancelled || id !== latest.current) return;
        if (result.ok) {
          setRows(result.rows);
          setTotal(result.total);
          setCounts(result.counts);
          setError("");
        } else {
          setError(result.message);
        }
      } catch {
        if (!cancelled && id === latest.current) setError("Couldn’t reach the server. Check your connection and try again.");
      } finally {
        if (!cancelled && id === latest.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, source, sort, dir, page, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  // Open-dashboard alert for a brand-new website inquiry (manual entries never arrive here).
  useWebsiteInquiryRealtime(
    useCallback(() => {
      push("success", "New website inquiry received.");
      refresh();
    }, [push, refresh]),
  );

  function toggleSort(column: CrmSort) {
    if (sort === column) setDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSort(column);
      setDir("desc");
    }
    setPage(1);
  }

  function handleSaved(record: CrmRecord, mode: "created" | "updated") {
    setAdding(false);
    setEditing(null);
    setViewing(null);
    if (mode === "created") {
      // Newest first: jump back to the top so the new record is visible.
      setSort("created_at");
      setDir("desc");
      setPage(1);
      push("success", "Manual record added successfully.");
    } else {
      push("success", `${record.full_name}’s record was updated.`);
    }
    refresh();
  }

  async function handleDelete(record: CrmRecord): Promise<boolean> {
    const result = await deleteCrmRecord(record.id);
    if (!result.ok) {
      push("error", result.message);
      return false;
    }
    push("success", "Record deleted.");
    if (rows.length === 1 && page > 1) setPage(page - 1);
    refresh();
    return true;
  }

  const filtered = Boolean(q.trim()) || source !== "all";
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const ariaSort = (col: CrmSort) => (sort === col ? (dir === "asc" ? "ascending" : "descending") : "none");
  const arrow = (col: CrmSort) => (sort === col ? (dir === "asc" ? " ↑" : " ↓") : "");

  return (
    <div className="crm">
      <header className="crm-head">
        <div>
          <h1>Customer CRM</h1>
          <p className="admin-hint">Manage your event inquiries and bookings.</p>
          <PushSetup />
        </div>
        <div className="crm-head__actions">
          <button type="button" className="btn btn--blush" onClick={() => setAdding(true)}>Add Manually</button>
          <button type="button" className="btn btn--outline" onClick={refresh} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
          <form action={signOut}>
            <button type="submit" className="btn btn--outline">Log out</button>
          </form>
        </div>
      </header>

      <ul className="crm-stats" aria-label="Summary">
        <li><strong>{counts.total}</strong><span>Total Records</span></li>
        <li className="crm-stats__website"><strong>{counts.website}</strong><span>Website Inquiries</span></li>
        <li className="crm-stats__manual"><strong>{counts.manual}</strong><span>Manually Added</span></li>
      </ul>

      <div className="crm-toolbar">
        <label className="crm-search">
          <span className="sr-only">Search by name or email</span>
          <input type="search" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div className="crm-filter" role="group" aria-label="Filter by source">
          {(["all", "website", "manual"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={source === value ? "is-active" : ""}
              aria-pressed={source === value}
              onClick={() => {
                setSource(value);
                setPage(1);
              }}
            >
              {value === "all" ? "All" : value === "website" ? "Website" : "Manual"}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="crm-state" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn--outline" onClick={refresh}>Try again</button>
        </div>
      ) : (
        <div className="crm-tablewrap" aria-busy={loading}>
          <table className="crm-table">
            <thead>
              <tr>
                <th scope="col" className="crm-col-name">Full Name</th>
                <th scope="col" className="crm-col-email">Email</th>
                <th scope="col" aria-sort={ariaSort("event_date")}>
                  <button type="button" className="crm-sortbtn" onClick={() => toggleSort("event_date")}>Event Date{arrow("event_date")}</button>
                </th>
                <th scope="col">Occasion Type</th>
                <th scope="col" className="crm-num">Guest Count</th>
                <th scope="col" className="crm-col-desc">Tell Us About Your Event</th>
                <th scope="col">Source</th>
                <th scope="col" aria-sort={ariaSort("created_at")}>
                  <button type="button" className="crm-sortbtn" onClick={() => toggleSort("created_at")}>Submitted / Created At{arrow("created_at")}</button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0
                ? Array.from({ length: 6 }, (_, i) => (
                    <tr key={i} className="crm-skeleton" aria-hidden="true">
                      {Array.from({ length: 8 }, (_, j) => (
                        <td key={j}><span /></td>
                      ))}
                    </tr>
                  ))
                : rows.map((r) => (
                    <tr
                      key={r.id}
                      className={`crm-row crm-row--${r.source}`}
                      onClick={() => setViewing(r)}
                    >
                      <td className="crm-col-name">
                        <button type="button" className="crm-namebtn" onClick={() => setViewing(r)}>{r.full_name}</button>
                      </td>
                      <td className="crm-col-email">{r.email}</td>
                      <td>{formatEventDate(r.event_date) || <span className="crm-dash">—</span>}</td>
                      <td>{r.occasion_type || <span className="crm-dash">—</span>}</td>
                      <td className="crm-num">{r.guest_count ?? <span className="crm-dash">—</span>}</td>
                      <td className="crm-col-desc"><span className="crm-clamp" title={r.event_description}>{r.event_description || <span className="crm-dash">—</span>}</span></td>
                      <td><SourceBadge source={r.source} /></td>
                      <td className="crm-nowrap">{formatCreatedAt(r.created_at)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!loading && rows.length === 0 ? (
            <div className="crm-state">
              {filtered ? (
                <>
                  <p>No records match your search.</p>
                  <button type="button" className="btn btn--outline" onClick={() => { setSearch(""); setQ(""); setSource("all"); setPage(1); }}>Clear filters</button>
                </>
              ) : (
                <>
                  <p>No customer records yet. Website inquiries will appear here automatically, or add one yourself.</p>
                  <button type="button" className="btn btn--blush" onClick={() => setAdding(true)}>Add Manually</button>
                </>
              )}
            </div>
          ) : null}
        </div>
      )}

      {!error && total > 0 ? (
        <nav className="crm-pager" aria-label="Pagination">
          <span>Showing {from}–{to} of {total}</span>
          <div>
            <button type="button" className="btn btn--outline btn--sm" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</button>
            <span aria-live="polite">Page {page} of {pages}</span>
            <button type="button" className="btn btn--outline btn--sm" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </nav>
      ) : null}

      <RecordForm record={null} open={adding} onClose={() => setAdding(false)} onSaved={handleSaved} />
      <RecordForm record={editing} open={Boolean(editing)} onClose={() => setEditing(null)} onSaved={handleSaved} />
      <RecordDetail
        record={editing ? null : viewing}
        onClose={() => setViewing(null)}
        onEdit={(r) => setEditing(r)}
        onDelete={handleDelete}
      />
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
