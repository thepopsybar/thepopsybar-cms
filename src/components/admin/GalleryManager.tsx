"use client";

import { useState, useTransition } from "react";
import {
  addGalleryImage,
  deleteGalleryImage,
  reorderGalleryImages,
  replaceGalleryImage,
  updateGalleryImage,
  type ActionResult,
} from "@/app/admin/actions";
import ImageUploader, { type UploadedImage } from "./ImageUploader";
import type { GalleryImage } from "@/lib/cms/types";

type Category = { slug: string; title: string };

type GalleryManagerProps = {
  categories: Category[];
  images: GalleryImage[];
};

function byOrder(a: GalleryImage, b: GalleryImage) {
  return a.position - b.position || a.seq - b.seq;
}

export default function GalleryManager({ categories, images: initial }: GalleryManagerProps) {
  const [images, setImages] = useState<GalleryImage[]>(initial);
  const [status, setStatus] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, { upload: UploadedImage | null; alt: string }>>({});

  function run(action: () => Promise<ActionResult>, onOk?: () => void) {
    startTransition(async () => {
      const result = await action();
      setStatus(result);
      if (result.ok) onOk?.();
    });
  }

  function patch(id: string, change: Partial<GalleryImage>) {
    setImages((current) => current.map((image) => (image.id === id ? { ...image, ...change } : image)));
  }

  function move(category: string, id: string, delta: number) {
    const list = images.filter((image) => image.category === category).sort(byOrder);
    const index = list.findIndex((image) => image.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    const positions = new Map<string, number>(list.map((image, i): [string, number] => [image.id, i + 1]));
    setImages((current) => current.map((image) => (positions.has(image.id) ? { ...image, position: positions.get(image.id)! } : image)));
    run(() => reorderGalleryImages(category, list.map((image) => image.id)));
  }

  function addAndTrack(category: string) {
    const draft = drafts[category];
    if (!draft?.upload) return;
    startTransition(async () => {
      const result = await addGalleryImage({ category, src: draft.upload!.url, publicId: draft.upload!.publicId, alt: draft.alt });
      setStatus(result);
      if (result.ok && result.id) {
        const position = Math.max(0, ...images.filter((i) => i.category === category).map((i) => i.position)) + 1;
        setImages((current) => [
          ...current,
          { id: result.id!, category, src: draft.upload!.url, publicId: draft.upload!.publicId, alt: draft.alt.trim(), position, featured: false, enabled: true, seq: Date.now() },
        ]);
        setDrafts((current) => ({ ...current, [category]: { upload: null, alt: "" } }));
      }
    });
  }

  return (
    <div className="admin-gallery">
      <p className="admin-status" role="status" aria-live="polite">
        {pending ? "Working…" : status ? <span className={status.ok ? "admin-success" : "admin-error"}>{status.message}</span> : " "}
      </p>

      {categories.map((category) => {
        const list = images.filter((image) => image.category === category.slug).sort(byOrder);
        const draft = drafts[category.slug] ?? { upload: null, alt: "" };
        return (
          <details className="admin-card admin-category" key={category.slug} open={list.length > 0}>
            <summary>
              <strong>{category.title}</strong> <span className="admin-muted">· {list.length} photo{list.length === 1 ? "" : "s"}</span>
            </summary>

            {list.length === 0 ? <p className="admin-hint">No photos yet. The public page shows “More photos soon” for this occasion.</p> : null}

            <ul className="admin-images">
              {list.map((image, index) => (
                <li key={image.id} className={image.enabled ? "" : "is-hidden"}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="admin-thumb admin-thumb--lg" src={image.src} alt="" />
                  <div className="admin-images__body">
                    <label htmlFor={`alt-${image.id}`}>Alt text (describe the photo)</label>
                    <input id={`alt-${image.id}`} type="text" value={image.alt} maxLength={300} onChange={(e) => patch(image.id, { alt: e.target.value })} />
                    <div className="admin-images__row">
                      <label className="admin-check">
                        <input type="checkbox" checked={image.enabled} onChange={(e) => patch(image.id, { enabled: e.target.checked })} /> Visible
                      </label>
                      <label className="admin-check">
                        <input type="checkbox" checked={image.featured} onChange={(e) => patch(image.id, { featured: e.target.checked })} /> Show on homepage
                      </label>
                      <label className="admin-check">
                        Occasion
                        <select value={image.category} onChange={(e) => patch(image.id, { category: e.target.value })}>
                          {categories.map((option) => (
                            <option key={option.slug} value={option.slug}>{option.title}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="admin-images__row">
                      <button
                        type="button"
                        className="btn btn--blush btn--sm"
                        disabled={pending}
                        onClick={() =>
                          run(() => updateGalleryImage({ id: image.id, alt: image.alt, category: image.category, featured: image.featured, enabled: image.enabled }))
                        }
                      >
                        Save
                      </button>
                      <ImageUploader
                        label="Replace photo"
                        disabled={pending}
                        onUploaded={(upload) =>
                          run(
                            () => replaceGalleryImage({ id: image.id, src: upload.url, publicId: upload.publicId }),
                            () => patch(image.id, { src: upload.url, publicId: upload.publicId }),
                          )
                        }
                      />
                      <button type="button" className="admin-icon-btn" disabled={index === 0 || pending} onClick={() => move(category.slug, image.id, -1)} aria-label={`Move ${image.alt} earlier`}>↑</button>
                      <button type="button" className="admin-icon-btn" disabled={index === list.length - 1 || pending} onClick={() => move(category.slug, image.id, 1)} aria-label={`Move ${image.alt} later`}>↓</button>
                      <button
                        type="button"
                        className="admin-link-btn admin-danger"
                        disabled={pending}
                        onClick={() => {
                          if (window.confirm("Delete this photo permanently? This also removes it from Cloudinary if it was uploaded there.")) {
                            run(() => deleteGalleryImage(image.id), () => setImages((current) => current.filter((item) => item.id !== image.id)));
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="admin-add">
              <h4>Add a photo to {category.title}</h4>
              <ImageUploader
                label={draft.upload ? "Choose a different file" : "Upload photo"}
                onUploaded={(upload) => setDrafts((current) => ({ ...current, [category.slug]: { ...draft, upload } }))}
              />
              {draft.upload ? (
                <div className="admin-add__preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="admin-thumb admin-thumb--lg" src={draft.upload.url} alt="" />
                  <div>
                    <label htmlFor={`new-alt-${category.slug}`}>Alt text (required)</label>
                    <input
                      id={`new-alt-${category.slug}`}
                      type="text"
                      value={draft.alt}
                      maxLength={300}
                      onChange={(e) => setDrafts((current) => ({ ...current, [category.slug]: { ...draft, alt: e.target.value } }))}
                    />
                    <button type="button" className="btn btn--blush btn--sm" disabled={pending || !draft.alt.trim()} onClick={() => addAndTrack(category.slug)}>
                      Add to gallery
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </details>
        );
      })}
    </div>
  );
}
