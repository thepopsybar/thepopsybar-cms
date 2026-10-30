import { categoryRoutes } from "@/lib/experience-categories";

export type ExperienceLink = {
  label: string;
  href: string;
};

export type ExperienceGroup = {
  id: "signature" | "coffee" | "mocktail" | "sweet";
  heading: string;
  featured?: boolean;
  links: ExperienceLink[];
};

export const experienceGroups: ExperienceGroup[] = [
  {
    id: "signature",
    heading: "Signature Experiences",
    featured: true,
    links: [
      { label: "Perfume Bar", href: `${categoryRoutes.signature}#perfume-bar` },
      { label: "Oud Bar", href: `${categoryRoutes.signature}#oud-bar` },
      { label: "Flower Station", href: `${categoryRoutes.signature}#flower-station` },
      { label: "Lip Bar", href: `${categoryRoutes.signature}#lip-bar` },
    ],
  },
  {
    id: "coffee",
    heading: "Coffee & Beverage",
    links: [
      { label: "Espresso & Coffee", href: `${categoryRoutes.coffee}#espresso-coffee` },
      { label: "Matcha & Specialty", href: `${categoryRoutes.coffee}#matcha-specialty` },
      { label: "Thai Tea & Milk Tea", href: `${categoryRoutes.coffee}#thai-tea-milk-tea` },
      { label: "Tapioca Boba", href: `${categoryRoutes.coffee}#tapioca-boba` },
    ],
  },
  {
    id: "mocktail",
    heading: "Mocktail Experiences",
    links: [
      { label: "Signature Mocktails", href: `${categoryRoutes.mocktail}#signature-mocktails` },
      { label: "Popping Boba", href: `${categoryRoutes.mocktail}#popping-boba` },
      { label: "Jaman Chaanakha", href: `${categoryRoutes.mocktail}#jaman-chaanakha` },
      { label: "Falsa Mulitli", href: `${categoryRoutes.mocktail}#falsa-mulitli` },
      { label: "Sugarcane Glow", href: `${categoryRoutes.mocktail}#sugarcane-glow` },
    ],
  },
  {
    id: "sweet",
    heading: "Sweet Experiences",
    links: [
      { label: "La Crêperie", href: `${categoryRoutes.sweet}#la-creperie` },
      { label: "Lil Flips Mini Pancakes", href: `${categoryRoutes.sweet}#lil-flips-mini-pancakes` },
      { label: "Churros", href: `${categoryRoutes.sweet}#churros` },
      { label: "Gelato", href: `${categoryRoutes.sweet}#gelato` },
      { label: "Sundaes", href: `${categoryRoutes.sweet}#sundaes` },
      { label: "Popsicles", href: `${categoryRoutes.sweet}#popsicles` },
    ],
  },
];
