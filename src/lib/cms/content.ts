import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { applyOverrides } from "./flatten";
import { defaults, type Defaults } from "./defaults";
import { defaultGalleryImages } from "./gallery-defaults";
import type { GalleryImage, SectionSetting } from "./types";

type Overrides = { values: Record<string, string>; publicIds: Record<string, string> };
const EMPTY: Overrides = { values: {}, publicIds: {} };

/** All saved text/link/image overrides. One request per render, shared by every component. */
export const getOverrides = cache(async (): Promise<Overrides> => {
  const client = createPublicClient();
  if (!client) return EMPTY;
  try {
    const { data, error } = await client.from("site_content").select("key,value,public_id");
    if (error || !data) return EMPTY;
    const values: Record<string, string> = {};
    const publicIds: Record<string, string> = {};
    for (const row of data as { key: string; value: string; public_id: string | null }[]) {
      values[row.key] = row.value;
      if (row.public_id) publicIds[row.key] = row.public_id;
    }
    return { values, publicIds };
  } catch {
    return EMPTY;
  }
});

/** A page's content: the built-in defaults with any saved overrides applied. */
export async function getContent<K extends keyof Defaults>(page: K): Promise<Defaults[K]> {
  const { values } = await getOverrides();
  return applyOverrides(defaults[page], values, page as string);
}

export const getAllSectionSettings = cache(async (): Promise<Record<string, SectionSetting[]>> => {
  const client = createPublicClient();
  if (!client) return {};
  try {
    const { data, error } = await client.from("section_settings").select("page,section,position,enabled");
    if (error || !data) return {};
    const out: Record<string, SectionSetting[]> = {};
    for (const row of data as { page: string; section: string; position: number; enabled: boolean }[]) {
      (out[row.page] ??= []).push({ section: row.section, position: row.position, enabled: row.enabled });
    }
    return out;
  } catch {
    return {};
  }
});

/**
 * Applies the admin's saved order and visibility to a list of section ids.
 * Sections without a saved setting keep their built-in order, after the saved ones.
 */
export async function getSectionOrder(settingKey: string, ids: string[]): Promise<string[]> {
  const all = await getAllSectionSettings();
  return applySectionSettings(ids, all[settingKey] ?? []);
}

export function applySectionSettings(ids: string[], settings: SectionSetting[]): string[] {
  const byId = new Map<string, SectionSetting>(settings.map((setting): [string, SectionSetting] => [setting.section, setting]));
  return ids
    .map((id, index) => ({ id, index, setting: byId.get(id) }))
    .filter((item) => item.setting?.enabled !== false)
    .sort((a, b) => (a.setting?.position ?? 1000 + a.index) - (b.setting?.position ?? 1000 + b.index))
    .map((item) => item.id);
}

type GalleryRow = {
  id: string;
  category: string;
  image_url: string;
  public_id: string | null;
  alt: string;
  position: number;
  featured: boolean;
  enabled: boolean;
  seq: number;
};

export function mapGalleryRow(row: GalleryRow): GalleryImage {
  return {
    id: row.id,
    category: row.category,
    src: row.image_url,
    publicId: row.public_id,
    alt: row.alt,
    position: row.position,
    featured: row.featured,
    enabled: row.enabled,
    seq: row.seq,
  };
}

/**
 * Public gallery photos (enabled only). Falls back to the built-in list when Supabase is not
 * configured or the table has no rows yet, so the site never breaks before setup.
 */
export const getGalleryImages = cache(async (): Promise<GalleryImage[]> => {
  const client = createPublicClient();
  if (!client) return defaultGalleryImages;
  try {
    const { data, error } = await client
      .from("gallery_images")
      .select("id,category,image_url,public_id,alt,position,featured,enabled,seq")
      .eq("enabled", true)
      .order("position", { ascending: true })
      .order("seq", { ascending: true });
    if (error || !data) return defaultGalleryImages;
    if (data.length === 0) {
      // Distinguish "table empty" from "everything hidden" by checking for any row at all.
      const { count } = await client.from("gallery_images").select("id", { count: "exact", head: true });
      return count && count > 0 ? [] : defaultGalleryImages;
    }
    return (data as GalleryRow[]).map(mapGalleryRow);
  } catch {
    return defaultGalleryImages;
  }
});
