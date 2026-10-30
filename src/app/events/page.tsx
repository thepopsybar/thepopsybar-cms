import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Rich from "@/components/Rich";
import ValueStrip from "@/components/ValueStrip";
import { getContent } from "@/lib/cms/content";
import { isAvailableImage } from "@/lib/local-images";
import { occasions } from "@/lib/occasions";
import { slugify } from "@/lib/slug";

export const metadata: Metadata = {
  title: "Events | The Popsy Bar",
  description: "Explore Popsy Bar event experiences for weddings, corporate events, brand activations, private parties, birthdays, showers and more.",
};

export default async function EventsPage() {
  const c = await getContent("events");

  return (
    <main className="editorial-page events-page">
      <section className="editorial-hero events-hero">
        <div className="editorial-hero__copy">
          <p className="eyebrow">{c.hero.eyebrow}</p>
          <h1><Rich text={c.hero.title} /></h1>
          <p className="editorial-hero__lead">{c.hero.lead}</p>
          <div className="editorial-hero__actions">
            <a className="btn btn--blush" href="#event-list">{c.hero.primaryLabel}</a>
            <Link className="btn btn--ghost" href={c.hero.secondaryHref}>{c.hero.secondaryLabel}</Link>
          </div>
        </div>
        <div className="editorial-hero__media">
          {isAvailableImage(c.hero.image) ? (
            <Image src={c.hero.image} alt={c.hero.imageAlt} fill priority sizes="(max-width: 800px) 100vw, 50vw" />
          ) : null}
        </div>
      </section>

      <section className="editorial-index" id="event-list">
        <p className="eyebrow">{c.index.eyebrow}</p>
        <h2><Rich text={c.index.title} /></h2>
        <p>{c.index.sub}</p>
        <ul className="chips chips--links">
          {occasions.map((event) => (
            <li key={event.title}><a href={`#event-${slugify(event.title)}`}>{event.title}</a></li>
          ))}
        </ul>
      </section>

      {occasions.map((event, index) => {
        const id = slugify(event.title);
        const copy = c.occasions[id];
        if (!copy) return null;
        return (
          <section className={`editorial-section${index % 2 ? " editorial-section--reverse" : ""}`} id={`event-${id}`} key={event.title}>
            <div className="editorial-section__media">
              <div className="editorial-section__image">
                {isAvailableImage(copy.image) ? (
                  <Image src={copy.image} alt={copy.imageAlt} fill sizes="(max-width: 800px) 100vw, 50vw" loading="lazy" />
                ) : null}
              </div>
            </div>
            <div className="editorial-section__body">
              <p className="eyebrow">{copy.eyebrow}</p>
              <h2>{event.title}</h2>
              <p>{copy.description}</p>
              <ul className="editorial-points">
                {[copy.point1, copy.point2, copy.point3].filter(Boolean).map((point) => <li key={point}>{point}</li>)}
              </ul>
              <Link className="link-arrow" href="/#plan">
                Plan a {event.title.toLowerCase()}
              </Link>
            </div>
          </section>
        );
      })}

      <ValueStrip />

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
