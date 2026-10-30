import Brand from "./Brand";
import { getContent } from "@/lib/cms/content";
import { BUSINESS, GOOGLE_MAPS_LINK } from "@/lib/site-config";

const explore = [
  { href: "/experiences/signatureexperiences", label: "Signature Experiences" },
  { href: "/experiences/coffee-beverage", label: "Coffee & Beverages" },
  { href: "/experiences/mocktailexperiences", label: "Mocktails" },
  { href: "/experiences/sweetexperiences", label: "Sweet Experiences" },
  { href: "/gallery", label: "Gallery" },
  { href: "/#plan", label: "Plan Your Event" },
];

export default async function Footer() {
  const c = await getContent("footer");
  const social = [
    { name: "Instagram", href: c.instagramHref },
    { name: "TikTok", href: c.tiktokHref },
    { name: "Facebook", href: c.facebookHref },
  ];
  return (
    <footer className="site-footer">
      <div className="site-footer__brand">
        <Brand />
        <p>{c.tagline}</p>
      </div>

      <nav aria-label="Footer">
        <h4>{c.exploreHeading}</h4>
        {explore.map((link) => (
          <a key={link.href} href={link.href}>{link.label}</a>
        ))}
      </nav>

      <address>
        <h4>{c.contactHeading}</h4>
        <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>{c.phone}</a>
        <a href={`mailto:${c.email}`}>{c.email}</a>
        <a href={GOOGLE_MAPS_LINK}>{BUSINESS.fullAddress}</a>
        <span className="site-footer__social">
          {social.map((item, i) => (
            <span key={item.name}>
              {i > 0 ? " · " : null}
              <a href={item.href}>{item.name}</a>
            </span>
          ))}
        </span>
      </address>
    </footer>
  );
}
