"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin";
import { destroyAsset, isCloudinaryUrl } from "@/lib/cloudinary";
import {
  ALLOWED_KEYS,
  DEFAULT_VALUES,
  allowedSectionSettings,
  isAllowedImageValue,
  isImageKey,
  isLinkKey,
  isSafeLink,
} from "@/lib/cms/fields";
import { occasions } from "@/lib/occasions";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; message: string };

const NOT_AUTHORIZED: ActionResult = { ok: false, message: "You are not signed in as an administrator." };
const gallerySlugs = occasions.map((occasion) => slugify(occasion.title));

async function requireAdmin() {
  const ctx = await getAdminContext();
  return ctx.state === "ok" ? ctx : null;
}

function refreshSite() {
  revalidatePath("/", "layout");
}

function fail(message: string, detail?: string): ActionResult {
  return { ok: false, message: detail ? `${message} (${detail})` : message };
}

// ---------------------------------------------------------------- page content

export type SaveEntry = { key: string; value: string; publicId: string | null };

export async function saveContent(entries: SaveEntry[]): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return NOT_AUTHORIZED;
  if (!Array.isArray(entries) || entries.length === 0) return fail("Nothing to save.");
  if (entries.length > 500) return fail("Too many changes at once. Save in smaller batches.");

  for (const entry of entries) {
    if (!ALLOWED_KEYS.has(entry.key)) return fail("Unknown content field.", entry.key);
    if (typeof entry.value !== "string" || entry.value.length > 5000) return fail("A value is too long.", entry.key);
    if (isLinkKey(entry.key) && !isSafeLink(entry.value)) return fail("Links must start with /, #, https://, mailto: or tel:.", entry.key);
    if (isImageKey(entry.key) && !isAllowedImageValue(entry.value, isCloudinaryUrl)) {
      return fail("Images must be a /images/... file or an uploaded Cloudinary image.", entry.key);
    }
    if (entry.publicId && !entry.publicId.startsWith("popsy-bar/")) return fail("Invalid image reference.", entry.key);
  }

  const keys = entries.map((entry) => entry.key);
  const { data: existing, error: readError } = await ctx.supabase.from("site_content").select("key,public_id").in("key", keys);
  if (readError) return fail("Could not read the current content.", readError.message);
  const oldPublicIds = new Map<string, string | null>(
    ((existing ?? []) as { key: string; public_id: string | null }[]).map((row): [string, string | null] => [row.key, row.public_id]),
  );

  const toDelete = entries.filter((e) => e.value === DEFAULT_VALUES[e.key] && !e.publicId).map((e) => e.key);
  const toSave = entries
    .filter((e) => !(e.value === DEFAULT_VALUES[e.key] && !e.publicId))
    .map((e) => ({ key: e.key, value: e.value, public_id: e.publicId, updated_at: new Date().toISOString() }));

  if (toSave.length > 0) {
    const { error } = await ctx.supabase.from("site_content").upsert(toSave, { onConflict: "key" });
    if (error) return fail("Could not save your changes.", error.message);
  }
  if (toDelete.length > 0) {
    const { error } = await ctx.supabase.from("site_content").delete().in("key", toDelete);
    if (error) return fail("Could not reset some fields.", error.message);
  }

  // Only now that the new values are safely stored, remove replaced Cloudinary uploads.
  for (const entry of entries) {
    const old = oldPublicIds.get(entry.key);
    if (old && old !== entry.publicId) await destroyAsset(old);
  }

  refreshSite();
  return { ok: true, message: `Saved ${entries.length} change${entries.length === 1 ? "" : "s"}. The site has been refreshed.` };
}

// ---------------------------------------------------------------- order & visibility

export async function saveSectionSettings(settingKey: string, items: { section: string; enabled: boolean }[]): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return NOT_AUTHORIZED;
  const allowed = allowedSectionSettings(gallerySlugs)[settingKey];
  if (!allowed) return fail("Unknown section group.");
  if (!Array.isArray(items) || items.some((item) => !allowed.has(item.section))) return fail("Unknown section.");

  const rows = items.map((item, position) => ({
    page: settingKey,
    section: item.section,
    position,
    enabled: Boolean(item.enabled),
  }));
  const { error } = await ctx.supabase.from("section_settings").upsert(rows, { onConflict: "page,section" });
  if (error) return fail("Could not save the order.", error.message);
  refreshSite();
  return { ok: true, message: "Order and visibility saved." };
}

// ---------------------------------------------------------------- gallery

function validImage(src: string, publicId: string | null): string | null {
  if (!isAllowedImageValue(src, isCloudinaryUrl) || src === "") return "Choose a valid image first.";
  if (publicId && !publicId.startsWith("popsy-bar/")) return "Invalid image reference.";
  return null;
}

export async function addGalleryImage(input: { category: string; src: string; publicId: string | null; alt: string }): Promise<ActionResult & { id?: string }> {
  const ctx = await requireAdmin();
  if (!ctx) return NOT_AUTHORIZED;
  if (!gallerySlugs.includes(input.category)) return fail("Unknown occasion.");
  const imageError = validImage(input.src, input.publicId);
  if (imageError) return fail(imageError);
  const alt = (input.alt ?? "").trim().slice(0, 300);
  if (!alt) return fail("Please describe the photo (alt text) for accessibility.");

  const { data: last } = await ctx.supabase
    .from("gallery_images")
    .select("position")
    .eq("category", input.category)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last as { position: number } | null)?.position ?? 0) + 1;

  const { data, error } = await ctx.supabase
    .from("gallery_images")
    .insert({ category: input.category, image_url: input.src, public_id: input.publicId, alt, position })
    .select("id")
    .single();
  if (error) return fail("Could not add the photo.", error.message);
  refreshSite();
  return { ok: true, message: "Photo added.", id: (data as { id: string }).id };
}

export async function updateGalleryImage(input: { id: string; alt: string; category: string; featured: boolean; enabled: boolean }): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return NOT_AUTHORIZED;
  if (!gallerySlugs.includes(input.category)) return fail("Unknown occasion.");
  const alt = (input.alt ?? "").trim().slice(0, 300);
  if (!alt) return fail("Alt text cannot be empty.");
  const { error } = await ctx.supabase
    .from("gallery_images")
    .update({ alt, category: input.category, featured: Boolean(input.featured), enabled: Boolean(input.enabled) })
    .eq("id", input.id);
  if (error) return fail("Could not update the photo.", error.message);
  refreshSite();
  return { ok: true, message: "Photo updated." };
}

export async function replaceGalleryImage(input: { id: string; src: string; publicId: string | null }): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return NOT_AUTHORIZED;
  const imageError = validImage(input.src, input.publicId);
  if (imageError) return fail(imageError);

  const { data: old } = await ctx.supabase.from("gallery_images").select("public_id").eq("id", input.id).maybeSingle();
  const { error } = await ctx.supabase
    .from("gallery_images")
    .update({ image_url: input.src, public_id: input.publicId })
    .eq("id", input.id);
  if (error) return fail("Could not replace the photo.", error.message);

  const oldId = (old as { public_id: string | null } | null)?.public_id;
  if (oldId && oldId !== input.publicId) await destroyAsset(oldId); // only after the new one is saved
  refreshSite();
  return { ok: true, message: "Photo replaced." };
}

export async function deleteGalleryImage(id: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return NOT_AUTHORIZED;
  const { data: row } = await ctx.supabase.from("gallery_images").select("public_id").eq("id", id).maybeSingle();
  const { error } = await ctx.supabase.from("gallery_images").delete().eq("id", id);
  if (error) return fail("Could not delete the photo.", error.message);
  const publicId = (row as { public_id: string | null } | null)?.public_id;
  if (publicId) await destroyAsset(publicId);
  refreshSite();
  return { ok: true, message: "Photo deleted." };
}

export async function reorderGalleryImages(category: string, ids: string[]): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if (!ctx) return NOT_AUTHORIZED;
  if (!gallerySlugs.includes(category)) return fail("Unknown occasion.");
  for (let index = 0; index < ids.length; index += 1) {
    const { error } = await ctx.supabase.from("gallery_images").update({ position: index + 1 }).eq("id", ids[index]).eq("category", category);
    if (error) return fail("Could not save the order.", error.message);
  }
  refreshSite();
  return { ok: true, message: "Photo order saved." };
}

// ---------------------------------------------------------------- session

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
