import Image from "next/image";
import Chips from "./Chips";
import Rich from "./Rich";
import { getContent } from "@/lib/cms/content";
import { isAvailableImage } from "@/lib/local-images";

/** Homepage story section. */
export default async function About() {
  const c = (await getContent("home")).story;
  const chips = c.chips.split("\n").map((line) => line.trim()).filter(Boolean);
  return (
    <section className="story" id="story">
      <div className="story__inner">
        <div className="story__img">
          {isAvailableImage(c.image) ? (
            <Image src={c.image} alt={c.imageAlt} fill sizes="(max-width: 960px) 100vw, 540px" style={{ objectFit: "cover" }} />
          ) : null}
        </div>
        <div className="story__text">
          <p className="eyebrow eyebrow--dark">{c.eyebrow}</p>
          <h2>
            <Rich text={c.title} />
          </h2>
          <p>{c.body}</p>
          <Chips light items={chips} />
        </div>
      </div>
    </section>
  );
}
