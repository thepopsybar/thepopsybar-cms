import Link from "next/link";
import { notFound } from "next/navigation";
import ContentEditor, { type FieldView } from "@/components/admin/ContentEditor";
import SectionOrderEditor, { type OrderItem } from "@/components/admin/SectionOrderEditor";
import { getAdminContext } from "@/lib/admin";
import { PAGE_KEYS, PAGE_LABELS, listFields, orderGroups } from "@/lib/cms/fields";
import type { PageKey } from "@/lib/cms/defaults";

export default async function AdminContentPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!PAGE_KEYS.includes(page as PageKey)) notFound();
  const pageKey = page as PageKey;

  const ctx = await getAdminContext();
  if (ctx.state !== "ok") return null;

  const [{ data: rows }, { data: settingRows }] = await Promise.all([
    ctx.supabase.from("site_content").select("key,value,public_id"),
    ctx.supabase.from("section_settings").select("page,section,position,enabled"),
  ]);

  type ContentRow = { key: string; value: string; public_id: string | null };
  const overrides = new Map<string, ContentRow>(((rows ?? []) as ContentRow[]).map((row): [string, ContentRow] => [row.key, row]));
  const fields: FieldView[] = listFields(pageKey).map((field) => {
    const override = overrides.get(field.key);
    return { ...field, value: override ? override.value : field.defaultValue, publicId: override?.public_id ?? null };
  });

  const settings = (settingRows ?? []) as { page: string; section: string; position: number; enabled: boolean }[];
  const groups = orderGroups(pageKey).map((group) => {
    const saved = new Map<string, (typeof settings)[number]>(settings.filter((s) => s.page === group.key).map((s): [string, (typeof settings)[number]] => [s.section, s]));
    const items: OrderItem[] = group.sections
      .map((section, index) => ({ section, index, setting: saved.get(section.id) }))
      .sort((a, b) => (a.setting?.position ?? 1000 + a.index) - (b.setting?.position ?? 1000 + b.index))
      .map(({ section, setting }) => ({ id: section.id, label: section.label, enabled: setting?.enabled !== false }));
    return { ...group, items };
  });

  const meta = PAGE_LABELS[pageKey];
  return (
    <div className="admin-page">
      <h1>{meta.label}</h1>
      <p className="admin-hint">
        {meta.blurb} <Link href={meta.path} target="_blank">View page ↗</Link>
      </p>
      <p className="admin-hint">
        Tip: wrap words in *asterisks* to give them the site’s italic accent style. Links can be <code>/page</code>, <code>#section</code> or a full <code>https://</code> address.
      </p>

      {groups.map((group) => (
        <SectionOrderEditor key={group.key} settingKey={group.key} title={group.label} items={group.items} />
      ))}

      <ContentEditor fields={fields} />
    </div>
  );
}
