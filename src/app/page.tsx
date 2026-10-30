import { Fragment, type ReactNode } from "react";
import Hero from "@/components/Hero";
import ValueStrip from "@/components/ValueStrip";
import Services from "@/components/Services";
import Occasions from "@/components/Occasions";
import CartDesigner from "@/components/CartDesigner";
import Gallery from "@/components/Gallery";
import About from "@/components/About";
import InquiryForm from "@/components/InquiryForm";
import { getSectionOrder } from "@/lib/cms/content";
import { defaults } from "@/lib/cms/defaults";

const sections: Record<keyof typeof defaults.home, ReactNode> = {
  hero: <Hero />,
  strip: <ValueStrip />,
  experiences: <Services />,
  occasions: <Occasions />,
  cart: <CartDesigner />,
  gallery: <Gallery />,
  story: <About />,
  plan: <InquiryForm />,
};

export default async function Home() {
  const ids = Object.keys(defaults.home) as (keyof typeof defaults.home)[];
  const order = (await getSectionOrder("home", ids)) as (keyof typeof defaults.home)[];
  return (
    <main id="top">
      {order.map((id) => (
        <Fragment key={id}>{sections[id]}</Fragment>
      ))}
    </main>
  );
}
