export type Occasion = {
  title: string;
  note: string;
  image: string;
};

export const occasions: Occasion[] = [
  { title: "Corporate", note: "Incl. employee appreciation", image: "/images/occasion-corporate.jpeg" },
  { title: "Brand Activation", note: "Corporate branding integrations", image: "/images/occasion-brand.jpeg" },
  { title: "Wedding", note: "Weddings & engagements", image: "/images/occasion-wedding.jpeg" },
  { title: "Private Party", note: "Private celebrations", image: "/images/occasion-party.jpeg" },
  { title: "Birthday", note: "All ages", image: "/images/occasion-birthday.jpeg" },
  { title: "Bridal / Baby Shower", note: "Showers", image: "/images/occasion-shower.jpeg" },
  { title: "Cultural Celebration", note: "Mexican & Pakistani roots", image: "/images/occasion-cultural.jpeg" },
  { title: "Graduation", note: "Celebrate the milestone", image: "/images/occasion-graduation.jpeg" },
];