import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import GalleryCategory from "@/components/GalleryCategory";
import Rich from "@/components/Rich";
import { getContent, getGalleryImages, getSectionOrder } from "@/lib/cms/content";
import { isAvailableImage } from "@/lib/local-images";
import { occasions } from "@/lib/occasions";
import { slugify } from "@/lib/slug";

export const metadata: Metadata = {
  title: "Gallery | The Popsy Bar",
  description: "Browse photos of Popsy Bar drinks, desserts and styled event setups, organised by occasion.",
};

const PREVIEW_COUNT = 3;

export default async function GalleryPage() {
  const [c, images] = await Promise.all([getContent("gallery"), getGalleryImages()]);
  const slugs = occasions.map((occasion) => slugify(occasion.title));
  const order = await getSectionOrder("gallery", slugs);

  const categories = order.map((slug) => {
    const occasion = occasions.find((item) => slugify(item.title) === slug)!;
    const photos = images
      .filter((image) => image.category === slug && isAvailableImage(image.src))
      .sort((a, b) => a.position - b.position || a.seq - b.seq)
      .map((image) => ({ id: image.id, src: image.src, alt: image.alt }));
    return { slug, title: occasion.title, description: c.categories[slug]?.description ?? "", photos };
  });

  return (
    <main className="editorial-page gallery-page">
      <section className="editorial-hero">
        <div className="editorial-hero__copy">
          <p className="eyebrow">{c.hero.eyebrow}</p>
          <h1><Rich text={c.hero.title} /></h1>
          <p className="editorial-hero__lead">{c.hero.lead}</p>
          <div className="editorial-hero__actions">
            <Link className="btn btn--blush" href={c.hero.primaryHref}>{c.hero.primaryLabel}</Link>
            <a className="btn btn--ghost" href="#gallery-index">{c.hero.secondaryLabel}</a>
          </div>
        </div>
        <div className="editorial-hero__media">
          {isAvailableImage(c.hero.image) ? (
            <Image src={c.hero.image} alt={c.hero.imageAlt} fill priority sizes="(max-width: 800px) 100vw, 50vw" />
          ) : null}
        </div>
      </section>

      <nav className="editorial-index" id="gallery-index" aria-label="Gallery occasions">
        <p className="eyebrow">Browse by occasion</p>
        <ul className="chips chips--links">
          {categories.map((category) => (
            <li key={category.slug}><a href={`#${category.slug}`}>{category.title}</a></li>
          ))}
        </ul>
      </nav>

      {categories.map((category, index) => (
        <GalleryCategory
          key={category.slug}
          id={category.slug}
          title={category.title}
          description={category.description}
          images={category.photos}
          previewCount={PREVIEW_COUNT}
          labels={c.labels}
          index={index}
        />
      ))}

      <section className="exp-cta">
        <div className="exp-cta__inner">
          <p className="eyebrow">{c.cta.eyebrow}</p>
          <h2><Rich text={c.cta.title} /></h2>
          <p>{c.cta.body}</p>
          <Link className="btn btn--blush" href="/#plan">{c.cta.label}</Link>
        </div>
      </section>
    </main>
  );
}
