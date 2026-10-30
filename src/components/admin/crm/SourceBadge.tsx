import type { CrmSource } from "@/lib/crm/types";

export default function SourceBadge({ source }: { source: CrmSource }) {
  return <span className={`crm-badge crm-badge--${source}`}>{source === "website" ? "Website" : "Manual"}</span>;
}
