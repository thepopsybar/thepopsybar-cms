import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import BusinessMap from "@/components/BusinessMap";
import EventInquiryForm from "@/components/EventInquiryForm";
import Rich from "@/components/Rich";
import { getContent } from "@/lib/cms/content";
import { isAvailableImage } from "@/lib/local-images";
import { occasions } from "@/lib/occasions";

export const metadata: Metadata = {
  title: "Plan Your Event | The Popsy Bar",
  description: "Choose your occasion, share your event details and request a tailored Popsy Bar proposal.",
};

export default async function PlanYourEventPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requested = typeof params.event === "string" && occasions.some((event) => event.title === params.event) ? params.event : undefined;
  const c = await getContent("plan");
  const steps = [
    { number: "01", title: c.steps.step1Title, text: c.steps.step1Text },
    { number: "02", title: c.steps.step2Title, text: c.steps.step2Text },
    { number: "03", title: c.steps.step3Title, text: c.steps.step3Text },
  ];

  return (
    <main className="editorial-page plan-page">
      <section className="editorial-hero">
        <div className="editorial-hero__copy">
          <p className="eyebrow">{c.hero.eyebrow}</p>
          <h1><Rich text={c.hero.title} /></h1>
          <p className="editorial-hero__lead">{c.hero.lead}</p>
          <div className="editorial-hero__actions">
            <a className="btn btn--blush" href="#plan-form">{c.hero.primaryLabel}</a>
            <Link className="btn btn--ghost" href={c.hero.secondaryHref}>{c.hero.secondaryLabel}</Link>
          </div>
        </div>
        <div className="editorial-hero__media">
          {isAvailableImage(c.hero.image) ? (
            <Image src={c.hero.image} alt={c.hero.imageAlt} fill priority sizes="(max-width: 800px) 100vw, 50vw" />
          ) : null}
        </div>
      </section>

      <section className="section about-approach">
        <div className="section__head">
          <p className="eyebrow">{c.steps.eyebrow}</p>
          <h2><Rich text={c.steps.title} /></h2>
        </div>
        <ol className="about-approach__steps">
          {steps.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <div><h3>{step.title}</h3><p>{step.text}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="plan plan-page__form" id="plan-form">
        <header className="section__head">
          <p className="eyebrow eyebrow--dark">{c.occasions.eyebrow}</p>
          <h2><Rich text={c.occasions.title} /></h2>
          <p className="section__sub">{c.occasions.sub}</p>
        </header>
        <EventInquiryForm variant="plan" occasions={occasions.map((event) => event.title)} initialOccasion={requested} submitLabel={c.form.submitLabel} />
        <p className="plan__note">{c.form.intro}</p>
      </section>

      <section className="contact-map section">
        <div className="section__head">
          <p className="eyebrow">{c.map.eyebrow}</p>
          <h2><Rich text={c.map.title} /></h2>
          <p className="section__sub">{c.map.sub}</p>
        </div>
        <BusinessMap />
      </section>
    </main>
  );
}
