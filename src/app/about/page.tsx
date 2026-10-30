import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import Rich from "@/components/Rich";
import SmartLink from "@/components/SmartLink";
import { getContent, getSectionOrder } from "@/lib/cms/content";
import { defaults } from "@/lib/cms/defaults";
import { isAvailableImage } from "@/lib/local-images";
import { categoryRoutes } from "@/lib/experience-categories";

export const metadata: Metadata = {
  title: "About Us | The Popsy Bar",
  description: "Learn about The Popsy Bar's approach to thoughtful presentation, interactive event experiences and personalised hospitality.",
};

type AboutContent = Awaited<ReturnType<typeof getContent<"about">>>;

function Hero({ c }: { c: AboutContent["hero"] }) {
  return (
    <section className="editorial-hero about-hero">
      <div className="editorial-hero__copy">
        <p className="eyebrow">{c.eyebrow}</p>
        <h1><Rich text={c.title} /></h1>
        <p className="editorial-hero__lead">{c.lead}</p>
        <div className="editorial-hero__actions">
          <SmartLink className="btn btn--blush" href={c.primaryHref}>{c.primaryLabel}</SmartLink>
          <SmartLink className="btn btn--ghost" href={c.secondaryHref}>{c.secondaryLabel}</SmartLink>
        </div>
      </div>
      <div className="editorial-hero__media">
        {isAvailableImage(c.image) ? <Image src={c.image} alt={c.imageAlt} fill priority sizes="(max-width: 800px) 100vw, 50vw" /> : null}
      </div>
    </section>
  );
}

function Story({ c }: { c: AboutContent["story"] }) {
  return (
    <section className="about-story section">
      <div className="about-story__image">
        {isAvailableImage(c.image) ? <Image src={c.image} alt={c.imageAlt} fill sizes="(max-width: 800px) 100vw, 45vw" /> : null}
      </div>
      <div className="about-story__copy">
        <p className="eyebrow">{c.eyebrow}</p>
        <h2><Rich text={c.title} /></h2>
        <p>{c.paragraph1}</p>
        <p>{c.paragraph2}</p>
      </div>
    </section>
  );
}

function Philosophy({ c }: { c: AboutContent["philosophy"] }) {
  return (
    <section className="about-philosophy">
      <div className="about-philosophy__inner">
        <p className="eyebrow">{c.eyebrow}</p>
        <h2><Rich text={c.title} /></h2>
        <p>{c.body}</p>
      </div>
    </section>
  );
}

function Services({ c }: { c: AboutContent["services"] }) {
  const services = [
    { title: "Signature Experiences", text: c.signatureText, href: categoryRoutes.signature, image: c.signatureImage },
    { title: "Coffee & Beverage", text: c.coffeeText, href: categoryRoutes.coffee, image: c.coffeeImage },
    { title: "Mocktail Experiences", text: c.mocktailText, href: categoryRoutes.mocktail, image: c.mocktailImage },
    { title: "Sweet Experiences", text: c.sweetText, href: categoryRoutes.sweet, image: c.sweetImage },
  ];
  return (
    <section className="section about-services">
      <div className="section__head">
        <p className="eyebrow">{c.eyebrow}</p>
        <h2><Rich text={c.title} /></h2>
        <p className="section__sub">{c.sub}</p>
      </div>
      <div className="about-services__grid">
        {services.map((service) => (
          <article className="about-service-card" key={service.title}>
            <Link className="about-service-card__image" href={service.href} aria-label={`Explore ${service.title}`}>
              {isAvailableImage(service.image) ? <Image src={service.image} alt="" fill sizes="(max-width: 650px) 100vw, (max-width: 960px) 50vw, 25vw" /> : null}
            </Link>
            <div className="about-service-card__body">
              <h3><Link href={service.href}>{service.title}</Link></h3>
              <p>{service.text}</p>
              <Link className="link-arrow" href={service.href}>{c.linkLabel}</Link>
            </div>
          </article>
        ))}
        <article className="about-service-card about-service-card--events">
          <div className="about-service-card__event-mark" aria-hidden="true">P.</div>
          <div className="about-service-card__body">
            <p className="eyebrow">{c.eventsEyebrow}</p>
            <h3>{c.eventsTitle}</h3>
            <p>{c.eventsText}</p>
            <Link className="link-arrow" href="/events">{c.eventsLinkLabel}</Link>
          </div>
        </article>
      </div>
    </section>
  );
}

function Values({ c }: { c: AboutContent["values"] }) {
  const values = [
    { number: "01", title: c.value1Title, text: c.value1Text },
    { number: "02", title: c.value2Title, text: c.value2Text },
    { number: "03", title: c.value3Title, text: c.value3Text },
    { number: "04", title: c.value4Title, text: c.value4Text },
  ];
  return (
    <section className="about-values">
      <div className="about-values__inner">
        <p className="eyebrow">{c.eyebrow}</p>
        <h2><Rich text={c.title} /></h2>
        <div className="about-values__grid">
          {values.map((value) => (
            <article className="about-value" key={value.number}>
              <span>{value.number}</span>
              <h3>{value.title}</h3>
              <p>{value.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Approach({ c }: { c: AboutContent["approach"] }) {
  const steps = [
    { number: "01", title: c.step1Title, text: c.step1Text },
    { number: "02", title: c.step2Title, text: c.step2Text },
    { number: "03", title: c.step3Title, text: c.step3Text },
    { number: "04", title: c.step4Title, text: c.step4Text },
  ];
  return (
    <section className="section about-approach">
      <div className="section__head">
        <p className="eyebrow">{c.eyebrow}</p>
        <h2><Rich text={c.title} /></h2>
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
  );
}

function Cta({ c }: { c: AboutContent["cta"] }) {
  return (
    <section className="exp-cta">
      <div className="exp-cta__inner">
        <p className="eyebrow">{c.eyebrow}</p>
        <h2><Rich text={c.title} /></h2>
        <p>{c.body}</p>
        <div className="editorial-hero__actions">
          <SmartLink className="btn btn--blush" href={c.primaryHref}>{c.primaryLabel}</SmartLink>
          <SmartLink className="btn btn--ghost" href={c.secondaryHref}>{c.secondaryLabel}</SmartLink>
        </div>
      </div>
    </section>
  );
}

export default async function AboutPage() {
  const c = await getContent("about");
  const order = await getSectionOrder("about", Object.keys(defaults.about));
  const blocks: Record<string, ReactNode> = {
    hero: <Hero c={c.hero} />,
    story: <Story c={c.story} />,
    philosophy: <Philosophy c={c.philosophy} />,
    services: <Services c={c.services} />,
    values: <Values c={c.values} />,
    approach: <Approach c={c.approach} />,
    cta: <Cta c={c.cta} />,
  };
  return (
    <main className="editorial-page about-page">
      {order.map((id) => (
        <Fragment key={id}>{blocks[id]}</Fragment>
      ))}
    </main>
  );
}
