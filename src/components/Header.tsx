import Brand from "./Brand";
import MobileNav, { type NavLink } from "./MobileNav";
import PrimaryNav from "./PrimaryNav";
import { experienceGroups } from "@/lib/experiences";

const links: NavLink[] = [
  { href: "/#experiences", label: "Experiences", megaMenu: true },
  { href: "/events", label: "Events" },
  { href: "/#cart", label: "Design Your Cart" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
  { href: "/#plan", label: "Plan Your Event", mobileOnly: true },
];

export default function Header() {
  return (
    <header className="site-header">
      <Brand />
      <PrimaryNav links={links} groups={experienceGroups} />
      <a className="btn btn--blush btn--sm header-cta" href="/#plan">
        Plan Your Event
      </a>
      <MobileNav links={links} groups={experienceGroups} />
    </header>
  );
}
