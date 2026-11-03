import Link from "next/link";
import { getAdminContext } from "@/lib/admin";
import { getCloudinaryConfig } from "@/lib/cloudinary";
import { PAGE_KEYS, PAGE_LABELS } from "@/lib/cms/fields";

export default async function AdminDashboard() {
  const ctx = await getAdminContext();
  if (ctx.state !== "ok") return null;

  const [content, gallery] = await Promise.all([
    ctx.supabase.from("site_content").select("key", { count: "exact", head: true }),
    ctx.supabase.from("gallery_images").select("id", { count: "exact", head: true }),
  ]);
  const cloudinary = getCloudinaryConfig();
  const tablesMissing = Boolean(content.error || gallery.error);

  return (
    <div className="admin-page">
      <h1>Dashboard</h1>
      <p className="admin-hint">Edit the website without touching code. Changes appear on the public site as soon as you save.</p>

      <div className="admin-status-grid">
        <div className="admin-card">
          <h2>Database</h2>
          <p className={tablesMissing ? "admin-error" : "admin-success"}>
            {tablesMissing ? "Connected, but tables are missing. Run supabase/schema.sql (see README)." : "Connected to Supabase"}
          </p>
          {!tablesMissing ? <p className="admin-muted">{content.count ?? 0} saved text/image edits · {gallery.count ?? 0} gallery photos</p> : null}
        </div>
        <div className="admin-card">
          <h2>Image uploads</h2>
          <p className={cloudinary.configured ? "admin-success" : "admin-error"}>
            {cloudinary.configured ? "Cloudinary configured" : "Cloudinary not configured: uploads are disabled"}
          </p>
          {!cloudinary.configured ? (
            <p className="admin-muted">Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (see README).</p>
          ) : (
            <p className="admin-muted">Uploads go to the “popsy-bar” folder.</p>
          )}
        </div>
        <div className="admin-card">
          <h2>Inquiry emails</h2>
          <p className="admin-muted">
            Every website inquiry is saved to the Customer CRM, then an email notification is sent from notifications@thepopsybar.com.
          </p>
        </div>
      </div>

      <h2>Edit your site</h2>
      <ul className="admin-links">
        <li>
          <Link href="/admin/dashboard"><strong>Customer CRM</strong></Link>
          <span>Website inquiries and manually added bookings in one spreadsheet-style list.</span>
        </li>
        {PAGE_KEYS.map((key) => (
          <li key={key}>
            <Link href={`/admin/content/${key}`}><strong>{PAGE_LABELS[key].label}</strong></Link>
            <span>{PAGE_LABELS[key].blurb}</span>
          </li>
        ))}
        <li>
          <Link href="/admin/gallery"><strong>Gallery &amp; categories</strong></Link>
          <span>Upload, replace, reorder and hide gallery photos for each occasion.</span>
        </li>
      </ul>
    </div>
  );
}
