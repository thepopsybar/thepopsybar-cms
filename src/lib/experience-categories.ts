export type ExperienceSection = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  points: string[];
  image: string;
  imageAlt: string;
};

export type ExperienceCategory = {
  slug: string;
  title: string;
  eyebrow: string;
  lead: string;
  accent: string;
  onAccent: string;
  cardBg: string;
  heroImage: string;
  heroImageAlt: string;
  sections: ExperienceSection[];
};

export const experienceCategories: Record<string, ExperienceCategory> = {
  signatureexperiences: {
    slug: "signatureexperiences",
    title: "Signature Experiences",
    eyebrow: "The Popsy Bar · Signature",
    lead: "Thoughtful, interactive details that turn your event into something guests remember.",
    accent: "#ead0d7",
    onAccent: "#2f2327",
    cardBg: "#f8e8ec",
    heroImage: "/images/signature-experiences.jpeg",
    heroImageAlt: "Signature event experience setup",
    sections: [
      { id: "perfume-bar", title: "Perfume Bar", eyebrow: "Personalised fragrance", description: "A sensory station where guests can explore fragrances and create a personal take-home moment.", points: ["Interactive guest experience", "Personalised finishing details", "Designed to suit your event"], image: "/images/gallery-1.jpeg", imageAlt: "Event experience display" },
      { id: "oud-bar", title: "Oud Bar", eyebrow: "A memorable scent ritual", description: "A fragrance-led experience with a warm, refined presentation for celebrations and brand events.", points: ["Elegant presentation", "Guest engagement", "Customisable styling"], image: "/images/gallery-2.jpeg", imageAlt: "Styled event details" },
      { id: "flower-station", title: "Flower Station", eyebrow: "Fresh floral details", description: "Invite guests to enjoy a floral moment with a station styled to complement your event palette.", points: ["Floral-inspired styling", "A hands-on activity", "A beautiful photo moment"], image: "/images/gallery-3.jpeg", imageAlt: "Event styling detail" },
      { id: "lip-bar", title: "Lip Bar", eyebrow: "A little self-care", description: "A playful beauty-inspired station that adds a personal, social touch to your gathering.", points: ["Guest-friendly setup", "Styled to your occasion", "Great for celebrations"], image: "/images/gallery-4.jpeg", imageAlt: "Celebration setup detail" },
    ],
  },
  "coffee-beverage": {
    slug: "coffee-beverage",
    title: "Coffee & Beverage",
    eyebrow: "The Popsy Bar · Coffee & Beverage",
    lead: "A welcoming beverage station serving up a considered drink experience for your guests.",
    accent: "#d9c5b1",
    onAccent: "#2f2327",
    cardBg: "#f4e8dc",
    heroImage: "/images/coffee-beverage.jpeg",
    heroImageAlt: "Coffee and beverage event station",
    sections: [
      { id: "espresso-coffee", title: "Espresso & Coffee", eyebrow: "Coffee, made social", description: "Bring the café feeling to your event with a dedicated coffee experience and a polished service setup.", points: ["A welcoming coffee station", "Fits meetings and celebrations", "Styling to suit your event"], image: "/images/hero-main.jpeg", imageAlt: "The Popsy Bar event setup" },
      { id: "matcha-specialty", title: "Matcha & Specialty", eyebrow: "A modern favourite", description: "A specialty drink moment for guests who love a fresh, contemporary beverage menu.", points: ["A distinctive drink offering", "A photo-friendly station", "Customisable presentation"], image: "/images/gallery-5.jpeg", imageAlt: "Specialty beverage event detail" },
      { id: "thai-tea-milk-tea", title: "Thai Tea & Milk Tea", eyebrow: "Creamy, colourful classics", description: "A playful milk-tea option that brings colour and a familiar favourite to the menu.", points: ["A crowd-pleasing option", "Great for social events", "Presented to match your theme"], image: "/images/gallery-6.jpeg", imageAlt: "Beverage station detail" },
      { id: "tapioca-boba", title: "Tapioca Boba", eyebrow: "A little extra fun", description: "Add a bubble-tea-inspired station to make the beverage offering more interactive.", points: ["Fun textures and flavours", "An engaging guest moment", "Ideal for brand activations and parties"], image: "/images/gallery-7.jpeg", imageAlt: "Interactive beverage experience" },
    ],
  },
  mocktailexperiences: {
    slug: "mocktailexperiences",
    title: "Mocktail Experiences",
    eyebrow: "The Popsy Bar · Mocktails",
    lead: "Colourful, alcohol-free drinks and interactive details that give your event a celebratory lift.",
    accent: "#d4ded0",
    onAccent: "#26352a",
    cardBg: "#e8eee5",
    heroImage: "/images/mocktail-experiences.jpeg",
    heroImageAlt: "Mocktail event beverage experience",
    sections: [
      { id: "signature-mocktails", title: "Signature Mocktails", eyebrow: "A toast for everyone", description: "A curated mocktail moment with vibrant presentation and flavours selected for your occasion.", points: ["Alcohol-free drink options", "Styled for your event", "A memorable welcome or refreshment"], image: "/images/hero-watermelon.jpeg", imageAlt: "Colourful beverage detail" },
      { id: "popping-boba", title: "Popping Boba", eyebrow: "A playful pop", description: "Add a fun texture and colour to drinks with a station guests will want to try and share.", points: ["Interactive drink add-ons", "Bright, playful presentation", "A fun fit for parties and activations"], image: "/images/gallery-8.jpeg", imageAlt: "Playful beverage station" },
      { id: "jaman-chaanakha", title: "Jaman Chaanakha", eyebrow: "A distinctive flavour", description: "A distinctive drink offering that can be featured as part of a themed or culturally inspired menu.", points: ["A unique menu moment", "Presentation tailored to your theme", "Suitable for private and corporate events"], image: "/images/hero-whale.jpeg", imageAlt: "Themed event beverage detail" },
      { id: "falsa-mulitli", title: "Falsa Mulitli", eyebrow: "Bright and refreshing", description: "A fruit-forward beverage option for guests looking for a refreshing, colourful alternative.", points: ["Fresh-looking presentation", "A colourful menu feature", "Built around your event style"], image: "/images/gallery-9.jpeg", imageAlt: "Refreshing beverage experience" },
      { id: "sugarcane-glow", title: "Sugarcane Glow", eyebrow: "Naturally sweet and fresh", description: "A fresh, naturally sweet sugarcane-inspired drink that adds a bright, refreshing glow to your menu.", points: ["A refreshing, naturally sweet option", "Presented to match your theme", "A lovely fit for private and corporate events"], image: "/images/gallery-6.jpeg", imageAlt: "Sugarcane Glow mocktail experience" },
    ],
  },
  sweetexperiences: {
    slug: "sweetexperiences",
    title: "Sweet Experiences",
    eyebrow: "The Popsy Bar · Something Sweet",
    lead: "Dessert stations that add a delicious, interactive finish to celebrations, gatherings and brand events.",
    accent: "#f1cbd5",
    onAccent: "#3c2630",
    cardBg: "#f8e5eb",
    heroImage: "/images/cart-preview.jpeg",
    heroImageAlt: "Dessert and event cart setup",
    sections: [
      { id: "la-creperie", title: "La Crêperie", eyebrow: "Made for a sweet moment", description: "A dessert experience centred on delicate crêpes and a presentation guests can gather around.", points: ["A made-to-order style experience", "Toppings and finishing details", "A charming event focal point"], image: "/images/gallery-1.jpeg", imageAlt: "Dessert event styling" },
      { id: "lil-flips-mini-pancakes", title: "Lil Flips Mini Pancakes", eyebrow: "Little bites, big smiles", description: "Bite-sized pancakes make a playful treat for guests of all ages and a lively addition to your event.", points: ["Easy-to-enjoy sweet bites", "Fun topping combinations", "Great for parties and activations"], image: "/images/gallery-2.jpeg", imageAlt: "Sweet event station" },
      { id: "churros", title: "Churros", eyebrow: "A warm favourite", description: "A familiar crowd-pleaser that brings a comforting dessert moment to the celebration.", points: ["A recognisable favourite", "Serve with sweet accompaniments", "Fits casual and upscale events"], image: "/images/gallery-3.jpeg", imageAlt: "Dessert display detail" },
      { id: "gelato", title: "Gelato", eyebrow: "A cool indulgence", description: "A colourful frozen treat experience that feels right at home at celebrations and warm-weather events.", points: ["A refreshing dessert option", "A colourful serving moment", "Styling to match your event"], image: "/images/gallery-4.jpeg", imageAlt: "Dessert experience detail" },
      { id: "sundaes", title: "Sundaes", eyebrow: "Make it your own", description: "A playful sundae station with toppings and finishing touches guests can make their own.", points: ["Build-your-own inspiration", "A fun interactive element", "A photo-friendly presentation"], image: "/images/gallery-5.jpeg", imageAlt: "Sweet toppings and event detail" },
      { id: "popsicles", title: "Popsicles", eyebrow: "A bright, refreshing treat", description: "A colourful frozen treat that adds a simple, cheerful detail to your event menu.", points: ["Bright presentation", "Easy event-friendly treat", "Works with playful themes"], image: "/images/gallery-6.jpeg", imageAlt: "Colourful event detail" },
    ],
  },
};

export const categoryRoutes = {
  signature: "/experiences/signatureexperiences",
  coffee: "/experiences/coffee-beverage",
  mocktail: "/experiences/mocktailexperiences",
  sweet: "/experiences/sweetexperiences",
} as const;
