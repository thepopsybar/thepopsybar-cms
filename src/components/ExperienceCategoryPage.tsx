import Link from "next/link";
import type { CSSProperties } from "react";
import Rich from "./Rich";
import { getContent, getSectionOrder } from "@/lib/cms/content";
import { isAvailableImage } from "@/lib/local-images";
import type { ExperienceCategory } from "@/lib/experience-categories";

type ExperienceCategoryPageProps = {
  category: ExperienceCategory;
};

export default async function ExperienceCategoryPage({ category }: ExperienceCategoryPageProps) {
  const [experiences, shared] = await Promise.all([getContent("experiences"), getContent("experienceShared")]);
  const c = experiences[category.slug];
  const order = await getSectionOrder(`experiences.${category.slug}`, Object.keys(c.sections));
  const sections = order.map((id) => ({ id, ...c.sections[id] }));

  const theme = {
    "--exp-accent": category.accent,
    "--exp-on-accent": category.onAccent,
    "--exp-card-bg": category.cardBg,
  } as CSSProperties & Record<"--exp-accent" | "--exp-on-accent" | "--exp-card-bg", string>;

  return (
    <main className="exp" style={theme}>
      <section className="exp-hero">
        <div className="exp-hero__text">
          <Link className="exp-back" href="/#experiences">← Back to all experiences</Link>
          <p className="eyebrow">{c.eyebrow}</p>
          <h1 className="exp-hero__title">{c.title}</h1>
          <p className="exp-hero__lead">{c.lead}</p>
          <div className="exp-hero__actions">
            <Link className="btn btn--blush" href="/#plan">Plan Your Event</Link>
            <a className="btn btn--ghost" href="#experience-list">Explore experiences</a>
          </div>
        </div>
        <div className="exp-hero__media">
          <div className="exp-media">
            {isAvailableImage(c.heroImage) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.heroImage} alt={c.heroImageAlt} />
            ) : null}
          </div>
        </div>
      </section>

      <section className="exp-occasions" id="experience-list">
        <p className="eyebrow">{c.listEyebrow}</p>
        <h2>{c.listTitle}</h2>
        <p>{c.listIntro}</p>
        <ul className="chips chips--links">
          {sections.map((section) => (
            <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
          ))}
        </ul>
      </section>

      {sections.map((section, index) => (
        <section
          className={`exp-section exp-section--split${index % 2 === 1 ? " exp-section--reverse" : ""}`}
          id={section.id}
          key={section.id}
        >
          <div className="exp-section__media">
            <div className="exp-media exp-media--wide">
              {isAvailableImage(section.image) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={section.image} alt={section.imageAlt} loading="lazy" />
              ) : null}
            </div>
          </div>
          <div className="exp-section__body">
            <p className="eyebrow">{section.eyebrow}</p>
            <h2 className="exp-section__title">{section.title}</h2>
            <div className="exp-section__copy">
              <p>{section.description}</p>
              <ul className="exp-points">
                {[section.point1, section.point2, section.point3].filter(Boolean).map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <Link className="link-arrow" href="/#plan">{c.enquirePrefix} {section.title}</Link>
            </div>
          </div>
        </section>
      ))}

      <section className="exp-highlights">
        <div className="exp-highlights__inner">
          <p className="eyebrow">{shared.highlightsEyebrow}</p>
          <h2>
            <Rich text={shared.highlightsTitle} />
          </h2>
          <ul className="exp-highlights__grid">
            <li className="exp-highlight"><span className="exp-highlight__num">01</span><h3>{shared.highlight1Title}</h3><p>{shared.highlight1Text}</p></li>
            <li className="exp-highlight"><span className="exp-highlight__num">02</span><h3>{shared.highlight2Title}</h3><p>{shared.highlight2Text}</p></li>
            <li className="exp-highlight"><span className="exp-highlight__num">03</span><h3>{shared.highlight3Title}</h3><p>{shared.highlight3Text}</p></li>
          </ul>
        </div>
      </section>

      <section className="exp-cta">
        <div className="exp-cta__inner">
          <p className="eyebrow">{shared.ctaEyebrow}</p>
          <h2>
            <Rich text={shared.ctaTitle} />
          </h2>
          <p>{shared.ctaText}</p>
          <Link className="btn btn--blush" href="/#plan">{shared.ctaLabel}</Link>
        </div>
      </section>
    </main>
  );
}
