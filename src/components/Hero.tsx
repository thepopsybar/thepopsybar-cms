import Image from "next/image";
import HeroSlideshow from "./HeroSlideshow";
import Rich from "./Rich";
import SmartLink from "./SmartLink";
import { getContent } from "@/lib/cms/content";
import { isAvailableImage } from "@/lib/local-images";

export default async function Hero() {
  const c = (await getContent("home")).hero;
  const backgrounds = [c.bgImage1, c.bgImage2, c.bgImage3, c.bgImage4, c.bgImage5].filter(isAvailableImage);

  return (
    <section className="hero-section">
      <HeroSlideshow images={backgrounds} />
      <div className="hero">
        <div className="hero__text">
          <p className="eyebrow">{c.eyebrow}</p>
          <h1 className="hero__title">
            <Rich text={c.title} />
          </h1>
          <p className="hero__lead">{c.lead}</p>
          <div className="hero__actions">
            <SmartLink className="btn btn--blush" href={c.primaryHref}>{c.primaryLabel}</SmartLink>
            <SmartLink className="btn btn--ghost" href={c.secondaryHref}>{c.secondaryLabel}</SmartLink>
          </div>
          <p className="hero__note">{c.note}</p>
        </div>
        <div className="hero__collage">
          <figure className="hero__img hero__img--main">
            {isAvailableImage(c.mainImage) ? (
              <Image src={c.mainImage} alt={c.mainImageAlt} fill loading="eager" fetchPriority="high" sizes="(max-width: 960px) 100vw, 600px" />
            ) : null}
            <figcaption className="tag">{c.tag}</figcaption>
          </figure>
          <figure className="hero__img">
            {isAvailableImage(c.whaleImage) ? (
              <Image src={c.whaleImage} alt={c.whaleImageAlt} fill sizes="(max-width: 960px) 50vw, 300px" />
            ) : null}
          </figure>
          <figure className="hero__img">
            {isAvailableImage(c.watermelonImage) ? (
              <Image src={c.watermelonImage} alt={c.watermelonImageAlt} fill sizes="(max-width: 960px) 50vw, 300px" />
            ) : null}
          </figure>
        </div>
      </div>
    </section>
  );
}
