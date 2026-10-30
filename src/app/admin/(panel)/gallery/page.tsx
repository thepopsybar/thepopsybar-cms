import Link from "next/link";
import GalleryManager from "@/components/admin/GalleryManager";
import SectionOrderEditor from "@/components/admin/SectionOrderEditor";
import { getAdminContext } from "@/lib/admin";
import { mapGalleryRow } from "@/lib/cms/content";
import { occasions } from "@/lib/occasions";
import { slugify } from "@/lib/slug";

export default async function AdminGalleryPage() {
  const ctx = await getAdminContext();
  if (ctx.state !== "ok") return null;

  const [{ data: rows, error }, { data: settingRows }] = await Promise.all([
    ctx.supabase.from("gallery_images").select("id,category,image_url,public_id,alt,position,featured,enabled,seq").order("seq"),
    ctx.supabase.from("section_settings").select("section,position,enabled").eq("page", "gallery"),
  ]);

  type SettingRow = { section: string; position: number; enabled: boolean };
  const saved = new Map<string, SettingRow>(
    ((settingRows ?? []) as SettingRow[]).map((row): [string, SettingRow] => [row.section, row]),
  );
  const categories = occasions
    .map((occasion, index) => ({ slug: slugify(occasion.title), title: occasion.title, index, setting: saved.get(slugify(occasion.title)) }))
    .sort((a, b) => (a.setting?.position ?? 1000 + a.index) - (b.setting?.position ?? 1000 + b.index));

  return (
    <div className="admin-page">
      <h1>Gallery &amp; categories</h1>
      <p className="admin-hint">
        Occasion names come from the website’s occasion list, so they always match the rest of the site. To change an occasion’s
        description, use <Link href="/admin/content/gallery">Gallery page text</Link>.
      </p>
      {error ? (
        <p className="admin-error" role="alert">
          The gallery table could not be read ({error.message}). Run supabase/schema.sql as described in README.md.
        </p>
      ) : null}
      {(rows ?? []).length === 0 && !error ? (
        <p className="admin-hint">The gallery table is empty, so the public site is showing its built-in photos. Run the seed section of supabase/schema.sql to manage them here, or add photos below.</p>
      ) : null}

      <SectionOrderEditor
        settingKey="gallery"
        title="Occasion order and visibility"
        items={categories.map((category) => ({ id: category.slug, label: category.title, enabled: category.setting?.enabled !== false }))}
      />

      <GalleryManager
        categories={categories.map((category) => ({ slug: category.slug, title: category.title }))}
        images={((rows ?? []) as Parameters<typeof mapGalleryRow>[0][]).map((row) => mapGalleryRow(row))}
      />
    </div>
  );
}
