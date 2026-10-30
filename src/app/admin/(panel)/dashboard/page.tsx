import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CrmDashboard from "@/components/admin/crm/CrmDashboard";
import { getAdminContext } from "@/lib/admin";

export const metadata: Metadata = { title: "Customer CRM | The Popsy Bar" };
export const dynamic = "force-dynamic";

export default async function CrmPage() {
  // Server-side gate (the panel layout and proxy check too, and every action re-checks).
  const ctx = await getAdminContext();
  if (ctx.state === "signed-out") redirect("/admin/login?next=/admin/dashboard");
  if (ctx.state !== "ok") return null;
  return <CrmDashboard adminId={ctx.user.id} />;
}
