import Image from "next/image";
import Link from "next/link";
import Rich from "./Rich";
import SectionHead from "./SectionHead";
import { getContent, getGalleryImages } from "@/lib/cms/content";
import { isAvailableImage } from "@/lib/local-images";

const VARIANTS: Record<number, "g--wide" | "g--tall"> = { 0: "g--wide", 1: "g--tall", 4: "g--wide", 5: "g--tall" };

/** Homepage gallery strip: the photos marked "featured" in /admin (max 8). */
export default async function Gallery() {
  const [home, footer, all] = await Promise.all([getContent("home"), getContent("footer"), getGalleryImages()]);
  const c = home.gallery;
  const items = all
    .filter((image) => image.featured && isAvailableImage(image.src))
    .sort((a, b) => a.seq - b.seq)
    .slice(0, 8);

  return (
    <section className="section" id="gallery">
      <SectionHead eyebrow={c.eyebrow} title={<Rich text={c.title} />} />
      {items.length > 0 ? (
        <div className="gallery">
          {items.map((item, index) => {
            const variant = VARIANTS[index];
            return (
              <div key={item.id} className={variant ? `g ${variant}` : "g"}>
                <Image src={item.src} alt={item.alt} fill sizes="(max-width: 600px) 50vw, (max-width: 1180px) 33vw, 400px" style={{ objectFit: "cover" }} />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="gallery__note">More photos soon.</p>
      )}
      <p className="gallery__note">
        <Link href="/gallery">{c.viewAllLabel}</Link>. {c.noteLead}{" "}
        <a href={footer.instagramHref}>Instagram</a>,{" "}
        <a href={footer.tiktokHref}>TikTok</a> and{" "}
        <a href={footer.facebookHref}>Facebook</a>.
      </p>
    </section>
  );
}
