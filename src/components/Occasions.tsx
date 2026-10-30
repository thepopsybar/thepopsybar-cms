import Image from "next/image";
import Rich from "./Rich";
import SectionHead from "./SectionHead";
import { getContent } from "@/lib/cms/content";
import { isAvailableImage } from "@/lib/local-images";
import { occasions } from "@/lib/occasions";
import { slugify } from "@/lib/slug";

export default async function Occasions() {
  const [home, covers] = await Promise.all([getContent("home"), getContent("occasions")]);
  const c = home.occasions;
  return (
    <section className="section" id="events">
      <SectionHead eyebrow={c.eyebrow} title={<Rich text={c.title} />} sub={c.sub} />
      <ul className="occasions">
        {occasions.map((occasion) => {
          const cover = covers[slugify(occasion.title)];
          return (
            <li className="occasion" key={occasion.title}>
              {cover && isAvailableImage(cover.image) ? (
                <Image src={cover.image} alt="" fill sizes="(max-width: 960px) 50vw, 290px" />
              ) : null}
              <div>
                <h3>{occasion.title}</h3>
                <p>{cover?.note ?? occasion.note}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
