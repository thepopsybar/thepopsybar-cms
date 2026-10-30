import type { Metadata } from "next";
import Image from "next/image";
import BusinessMap from "@/components/BusinessMap";
import ContactForm from "@/components/ContactForm";
import Rich from "@/components/Rich";
import SmartLink from "@/components/SmartLink";
import { getContent } from "@/lib/cms/content";
import { isAvailableImage } from "@/lib/local-images";
import { occasions } from "@/lib/occasions";
import { BUSINESS, GOOGLE_MAPS_LINK } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact Us | The Popsy Bar",
  description: "Contact The Popsy Bar to discuss event dates, guest counts, service options and a tailored experience.",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requestedEvent =
    typeof params.event === "string" && occasions.some((event) => event.title === params.event) ? params.event : "";
  const [c, footer] = await Promise.all([getContent("contact"), getContent("footer")]);
  const phoneHref = `tel:${footer.phone.replace(/[^\d+]/g, "")}`;

  return (
    <main className="editorial-page contact-page">
      <section className="editorial-hero editorial-hero--contact">
        <div className="editorial-hero__copy">
          <p className="eyebrow">{c.hero.eyebrow}</p>
          <h1><Rich text={c.hero.title} /></h1>
          <p className="editorial-hero__lead">{c.hero.lead}</p>
          <div className="editorial-hero__actions">
            <a className="btn btn--blush" href="#contact-form">{c.hero.primaryLabel}</a>
            <a className="btn btn--ghost" href={phoneHref}>Call {footer.phone}</a>
          </div>
        </div>
        <div className="editorial-hero__media">
          {isAvailableImage(c.hero.image) ? (
            <Image src={c.hero.image} alt={c.hero.imageAlt} fill priority sizes="(max-width: 800px) 100vw, 50vw" />
          ) : null}
        </div>
      </section>

      <section className="contact-details section">
        <div className="section__head">
          <p className="eyebrow">{c.details.eyebrow}</p>
          <h2><Rich text={c.details.title} /></h2>
          <p className="section__sub">{c.details.sub}</p>
        </div>
        <div className="contact-details__grid">
          <article className="contact-detail">
            <span className="contact-detail__label">Email</span>
            <h3>{c.details.emailHeading}</h3>
            <a href={`mailto:${footer.email}`}>{footer.email}</a>
          </article>
          <article className="contact-detail">
            <span className="contact-detail__label">Phone</span>
            <h3>{c.details.phoneHeading}</h3>
            <a href={phoneHref}>{footer.phone}</a>
          </article>
          <article className="contact-detail">
            <span className="contact-detail__label">Location</span>
            <h3>{c.details.locationHeading}</h3>
            <p><a href={GOOGLE_MAPS_LINK}>{BUSINESS.fullAddress}</a></p>
            <p>{c.details.locationNote}</p>
          </article>
          <article className="contact-detail">
            <span className="contact-detail__label">Social</span>
            <h3>{c.details.socialHeading}</h3>
            <p>{c.details.socialNote}</p>
            <p>
              <a href={footer.instagramHref}>Instagram</a> · <a href={footer.tiktokHref}>TikTok</a> · <a href={footer.facebookHref}>Facebook</a>
            </p>
          </article>
        </div>
      </section>

      <section className="contact-form-section" id="contact-form">
        <div className="contact-form-section__intro">
          <p className="eyebrow">{c.form.eyebrow}</p>
          <h2><Rich text={c.form.title} /></h2>
          <p>{c.form.intro}</p>
        </div>
        <ContactForm
          occasions={occasions.map((event) => event.title)}
          initialEvent={requestedEvent}
          submitLabel={c.form.submitLabel}
          finePrint={c.form.finePrint}
        />
      </section>

      <section className="contact-map section">
        <div className="section__head">
          <p className="eyebrow">{c.map.eyebrow}</p>
          <h2><Rich text={c.map.title} /></h2>
          <p className="section__sub">{c.map.sub}</p>
        </div>
        <BusinessMap />
      </section>

      <section className="exp-cta">
        <div className="exp-cta__inner">
          <p className="eyebrow">{c.cta.eyebrow}</p>
          <h2><Rich text={c.cta.title} /></h2>
          <p>{c.cta.body}</p>
          <div className="editorial-hero__actions">
            <SmartLink className="btn btn--blush" href={c.cta.primaryHref}>{c.cta.primaryLabel}</SmartLink>
            <SmartLink className="btn btn--ghost" href={c.cta.secondaryHref}>{c.cta.secondaryLabel}</SmartLink>
          </div>
        </div>
      </section>
    </main>
  );
}
