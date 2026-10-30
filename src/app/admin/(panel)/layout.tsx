import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/app/admin/actions";
import Brand from "@/components/Brand";
import { getAdminContext } from "@/lib/admin";
import { PAGE_KEYS, PAGE_LABELS } from "@/lib/cms/fields";

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const ctx = await getAdminContext();
  if (ctx.state === "signed-out") redirect("/admin/login");
  if (ctx.state === "unconfigured") {
    return (
      <main className="admin-login">
        <div className="admin-login__card">
          <h1>Setup needed</h1>
          <p>Supabase is not configured. Add the environment variables described in README.md and restart.</p>
        </div>
      </main>
    );
  }
  if (ctx.state === "forbidden") {
    return (
      <main className="admin-login">
        <div className="admin-login__card">
          <h1>Access not granted</h1>
          <p>
            You are signed in as {ctx.user.email}, but this account is not an administrator. Ask the site owner to add you, or follow
            “Create the first admin” in README.md.
          </p>
          <form action={signOut}>
            <button className="btn btn--outline" type="submit">Sign out</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-sidebar__brand">
          <Brand href={null} size="admin" />
          <span>Admin</span>
        </div>
        <nav>
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/dashboard">Customer CRM</Link>
          <p className="admin-sidebar__heading">Page content</p>
          {PAGE_KEYS.map((key) => (
            <Link key={key} href={`/admin/content/${key}`}>{PAGE_LABELS[key].label}</Link>
          ))}
          <p className="admin-sidebar__heading">Media</p>
          <Link href="/admin/gallery">Gallery &amp; categories</Link>
          <p className="admin-sidebar__heading">Site</p>
          <a href="/" target="_blank" rel="noreferrer">View website ↗</a>
        </nav>
        <form action={signOut} className="admin-sidebar__signout">
          <span>{ctx.user.email}</span>
          <button type="submit" className="admin-link-btn">Sign out</button>
        </form>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
