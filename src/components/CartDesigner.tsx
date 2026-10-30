import Image from "next/image";
import CartDesignForm from "./CartDesignForm";
import Rich from "./Rich";
import SectionHead from "./SectionHead";
import { getContent } from "@/lib/cms/content";
import { isAvailableImage } from "@/lib/local-images";

export default async function CartDesigner() {
  const c = (await getContent("home")).cart;
  return (
    <section className="section" id="cart">
      <SectionHead eyebrow={c.eyebrow} title={<Rich text={c.title} />} sub={c.sub} />
      <div className="cart">
        <CartDesignForm
          buttonLabel={c.buttonLabel}
          caption={c.caption}
          reference={
            isAvailableImage(c.previewImage) ? (
              <Image src={c.previewImage} alt={c.previewImageAlt} fill sizes="72px" style={{ objectFit: "cover" }} />
            ) : null
          }
        />
      </div>
    </section>
  );
}
