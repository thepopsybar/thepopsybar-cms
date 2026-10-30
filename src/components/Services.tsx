import Image from "next/image";
import Chips from "./Chips";
import SectionHead from "./SectionHead";
import { experienceGroups } from "@/lib/experiences";
import { categoryRoutes } from "@/lib/experience-categories";
import Rich from "./Rich";
import { getContent } from "@/lib/cms/content";
import { isAvailableImage } from "@/lib/local-images";

type ExperienceCardData = {
  title: string;
  description: string;
  chips: string[];
  href: string;
  chipHrefs: string[];
  image: { src: string; alt: string };
};

const linksFor = (groupId: "signature" | "coffee" | "mocktail" | "sweet") =>
  experienceGroups.find((group) => group.id === groupId)!.links.map((link) => link.href);

type HomeExperiences = Awaited<ReturnType<typeof getContent<"home">>>["experiences"];

function buildCards(c: HomeExperiences): ExperienceCardData[] {
  return [
    {
      title: c.coffeeTitle,
      description: c.coffeeText,
      chips: ["Espresso & Coffee", "Matcha & Specialty", "Thai Tea & Milk Tea", "Tapioca Boba"],
      href: categoryRoutes.coffee,
      chipHrefs: linksFor("coffee"),
      image: { src: c.coffeeImage, alt: c.coffeeImageAlt },
    },
    {
      title: c.mocktailTitle,
      description: c.mocktailText,
      chips: ["Signature mocktails", "Popping boba", "Jaman Chaanakha", "Falsa Mulitli", "Sugarcane Glow"],
      href: categoryRoutes.mocktail,
      chipHrefs: linksFor("mocktail"),
      image: { src: c.mocktailImage, alt: c.mocktailImageAlt },
    },
    {
      title: c.sweetTitle,
      description: c.sweetText,
      chips: ["La Crêperie", "Lil Flips Mini Pancakes", "Churros", "Gelato", "Sundaes", "Popsicles"],
      href: categoryRoutes.sweet,
      chipHrefs: linksFor("sweet"),
      image: { src: c.sweetImage, alt: c.sweetImageAlt },
    },
  ];
}

function ExperienceCard({
  linkLabel,
  title,
  description,
  chips,
  image,
  href,
  chipHrefs,
}: ExperienceCardData & { linkLabel: string }) {
  return (
    <article className="card">
      <div className="card__img">
        {isAvailableImage(image.src) ? (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 380px"
            style={{ objectFit: "cover" }}
          />
        ) : null}
      </div>
      <div className="card__body">
        <h3>{title}</h3>
        <p>{description}</p>
        <Chips items={chips} hrefs={chipHrefs} />
        <a className="link-arrow" href={href}>{linkLabel}</a>
      </div>
    </article>
  );
}

export default async function Services() {
  const c = (await getContent("home")).experiences;
  const cards = buildCards(c);
  return (
    <section className="section" id="experiences">
      <SectionHead eyebrow={c.eyebrow} title={<Rich text={c.title} />} sub={c.sub} />

      <article className="feature">
        <div className="feature__media">
          {isAvailableImage(c.featureImage) ? (
            <Image
              src={c.featureImage}
              alt={c.featureImageAlt}
              fill
              sizes="(max-width: 960px) 100vw, 660px"
              style={{ objectFit: "cover" }}
            />
          ) : null}
        </div>
        <div className="feature__body">
          <p className="eyebrow">{c.featureEyebrow}</p>
          <h3>
            <Rich text={c.featureTitle} />
          </h3>
          <p>{c.featureBody}</p>
          <Chips
            label="Signature offerings"
            items={["Perfume Bar", "Oud Bar", "Flower Station", "Lip Bar"]}
            hrefs={linksFor("signature")}
          />
          <a className="link-arrow" href={categoryRoutes.signature}>{c.linkLabel}</a>
        </div>
      </article>

      <div className="cards">
        {cards.map((card) => (
          <ExperienceCard key={card.title} linkLabel={c.linkLabel} {...card} />
        ))}
      </div>
    </section>
  );
}
