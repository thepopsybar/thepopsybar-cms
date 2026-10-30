"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";

type GalleryCategoryProps = {
  id: string;
  title: string;
  description: string;
  images: { id: string; src: string; alt: string }[];
  previewCount: number;
  labels: { viewMore: string; viewLess: string; empty: string; emptyNote: string; cta: string };
  index: number;
};

export default function GalleryCategory({ id, title, description, images, previewCount, labels, index }: GalleryCategoryProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const hasMore = images.length > previewCount;
  const visible = expanded ? images : images.slice(0, previewCount);
  const countClass = `gallery-grid--n${Math.min(visible.length, 3)}`;

  return (
    <section className={`gallery-cat${index % 2 ? " gallery-cat--alt" : ""}`} id={id} aria-labelledby={`${id}-title`}>
      <div className="gallery-cat__inner">
        <header className="gallery-cat__head">
          <p className="eyebrow">{String(index + 1).padStart(2, "0")} · Occasion</p>
          <h2 id={`${id}-title`}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </header>

        {images.length > 0 ? (
          <>
            <ul className={`gallery-grid ${countClass}`} id={panelId}>
              {visible.map((image) => (
                <li className="gallery-grid__item" key={image.id}>
                  <Image src={image.src} alt={image.alt} fill sizes="(max-width: 600px) 50vw, (max-width: 1180px) 33vw, 380px" style={{ objectFit: "cover" }} />
                </li>
              ))}
            </ul>
            {hasMore ? (
              <button
                type="button"
                className="btn btn--outline gallery-cat__more"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? labels.viewLess : labels.viewMore}
                <span className="gallery-cat__count"> ({images.length})</span>
              </button>
            ) : null}
          </>
        ) : (
          <div className="gallery-cat__empty" role="note">
            <p className="gallery-cat__empty-title">{labels.empty}</p>
            <p>{labels.emptyNote}</p>
            <Link className="link-arrow" href="/#plan">{labels.cta}</Link>
          </div>
        )}
      </div>
    </section>
  );
}
