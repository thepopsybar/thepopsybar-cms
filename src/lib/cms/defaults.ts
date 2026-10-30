import { experienceCategories } from "@/lib/experience-categories";
import { occasions } from "@/lib/occasions";
import { slugify } from "@/lib/slug";

/**
 * Single source of truth for every editable piece of text, link and image on the site.
 * - Public pages read these values, merged with any overrides saved from /admin.
 * - /admin builds its forms automatically from this tree.
 * Conventions: wrap words in *asterisks* for the italic accent style. Keys ending in
 * "Href" are links, keys ending in "Image" are images (paste a /images/... path or upload).
 */

const eventCopy = {
  corporate: {
    eyebrow: "Gather with purpose",
    description:
      "Create a welcoming pause in the working day with a thoughtfully presented coffee, beverage, dessert or interactive station. The setup can be shaped around your team, venue and event format.",
    point1: "A considered guest experience",
    point2: "Options for meetings and employee appreciation",
    point3: "Presentation tailored to the occasion",
    image: "/images/gallery-5.jpeg",
    imageAlt: "Styled beverage experience detail for a corporate gathering",
  },
  "brand-activation": {
    eyebrow: "Make the brand part of the moment",
    description:
      "Bring your campaign to life with an engaging station that can reflect your visual identity and invite guests to take part, taste and connect.",
    point1: "Brand-aware styling and details",
    point2: "An interactive point of engagement",
    point3: "Flexible concepts for launches and activations",
    image: "/images/occasion-brand.jpeg",
    imageAlt: "Branded event setup detail",
  },
  wedding: {
    eyebrow: "A personal celebration",
    description:
      "Add a distinctive gathering point to your wedding or engagement with a service experience designed to complement the atmosphere you are creating.",
    point1: "Styling that complements your palette",
    point2: "Guest-friendly service moments",
    point3: "Options across hot & cold beverages, sweets and signature experiences",
    image: "/images/signature-experiences.jpeg",
    imageAlt: "Elegant signature event station",
  },
  "private-party": {
    eyebrow: "Made for getting together",
    description:
      "Give your guests something to gather around with a mobile bar or experience station designed to suit the mood, guest list and pace of your celebration.",
    point1: "A focal point for guests",
    point2: "Personalised presentation",
    point3: "Elevated experience options for different kinds of parties",
    image: "/images/gallery-2.jpeg",
    imageAlt: "Decorative details for a private celebration",
  },
  birthday: {
    eyebrow: "Celebrate another trip around the sun",
    description:
      "From playful sweet treats to colourful drinks and interactive stations, build a birthday experience around the guest of honour and the people celebrating with them.",
    point1: "A look that suits the celebration",
    point2: "Interactive moments for guests",
    point3: "Options for a range of ages and styles",
    image: "/images/hero-bg-2.jpeg",
    imageAlt: "Colourful event experience setup",
  },
  "bridal-baby-shower": {
    eyebrow: "A Thoughtful Soirée",
    description:
      "Bring a soft, considered detail to a bridal or baby shower with a station that feels at home alongside the theme, florals and shared moments of the day.",
    point1: "Theme-conscious presentation",
    point2: "Sweet, beverage and signature options",
    point3: "A welcoming detail for guests",
    image: "/images/occasion-shower.jpeg",
    imageAlt: "Celebration setup for a shower",
  },
  "cultural-celebration": {
    eyebrow: "Celebrate what brings us together",
    description:
      "Create a gathering that reflects the traditions, tastes and personal details that matter to you, with an experience shaped around your celebration.",
    point1: "Room for personal and cultural touches",
    point2: "Customisable menus and styling",
    point3: "A guest experience built around connection",
    image: "/images/hero-watermelon.jpeg",
    imageAlt: "Colourful drink detail for a cultural celebration",
  },
  graduation: {
    eyebrow: "Mark the milestone",
    description:
      "Celebrate the hard work behind the achievement with a station that brings friends and family together for a memorable gathering.",
    point1: "A celebratory guest focal point",
    point2: "Options from drinks to desserts",
    point3: "Presentation suited to your event",
    image: "/images/gallery-8.jpeg",
    imageAlt: "Guest-facing event station detail",
  },
};

type EventCopy = (typeof eventCopy)["wedding"];

const eventsOccasions: Record<string, EventCopy> = Object.fromEntries(
  occasions.map((occasion) => {
    const slug = slugify(occasion.title);
    const copy = (eventCopy as Record<string, EventCopy>)[slug];
    return [slug, copy];
  }),
);

const occasionCovers: Record<string, { note: string; image: string }> = Object.fromEntries(
  occasions.map((occasion) => [slugify(occasion.title), { note: occasion.note, image: occasion.image }]),
);

const galleryCategoryText: Record<string, { description: string }> = {
  wedding: { description: "Elegant details for weddings and engagements, styled to complement the day you are planning." },
  corporate: { description: "Welcoming stations for team gatherings, appreciation events and professional get-togethers." },
  "private-party": { description: "Colourful drinks, sweet treats and playful details made for getting people together." },
  "brand-activation": { description: "Branded setups that invite guests to taste, take part and connect with your story." },
  "cultural-celebration": { description: "Experiences shaped around the traditions, flavours and details that matter to your celebration." },
  birthday: { description: "Playful, photo-friendly setups built around the guest of honour." },
  "bridal-baby-shower": { description: "Soft, considered styling that sits beautifully alongside florals, themes and shared moments." },
  graduation: { description: "A celebratory gathering point for friends and family to mark the milestone." },
};

const galleryCategories: Record<string, { description: string }> = Object.fromEntries(
  occasions.map((occasion) => {
    const slug = slugify(occasion.title);
    return [slug, galleryCategoryText[slug] ?? { description: "" }];
  }),
);

const experiencesTree: Record<
  string,
  {
    eyebrow: string;
    title: string;
    lead: string;
    heroImage: string;
    heroImageAlt: string;
    listEyebrow: string;
    listTitle: string;
    listIntro: string;
    enquirePrefix: string;
    sections: Record<
      string,
      {
        title: string;
        eyebrow: string;
        description: string;
        point1: string;
        point2: string;
        point3: string;
        image: string;
        imageAlt: string;
      }
    >;
  }
> = Object.fromEntries(
  Object.values(experienceCategories).map((category) => [
    category.slug,
    {
      eyebrow: category.eyebrow,
      title: category.title,
      lead: category.lead,
      heroImage: category.heroImage,
      heroImageAlt: category.heroImageAlt,
      listEyebrow: "Find your experience",
      listTitle: "Made for your kind of gathering",
      listIntro: "Explore the experiences in this collection. Each setup can be styled to complement the feel of your event.",
      enquirePrefix: "Enquire about",
      sections: Object.fromEntries(
        category.sections.map((section) => [
          section.id,
          {
            title: section.title,
            eyebrow: section.eyebrow,
            description: section.description,
            point1: section.points[0] ?? "",
            point2: section.points[1] ?? "",
            point3: section.points[2] ?? "",
            image: section.image,
            imageAlt: section.imageAlt,
          },
        ]),
      ),
    },
  ]),
);

export const defaults = {
  home: {
    hero: {
      eyebrow: "Luxury mobile event experiences",
      title: "Turn Your Event Into an *Experience.*",
      lead: "Luxury mobile coffee, beverage, dessert, and interactive experiences brought directly to your event.",
      primaryLabel: "Plan Your Experience",
      primaryHref: "#plan",
      secondaryLabel: "Explore Experiences",
      secondaryHref: "#experiences",
      note: "Weddings, corporate events, private celebrations and more. Fully mobile, fully customized.",
      tag: "Served live",
      mainImage: "/images/hero-main.jpeg",
      mainImageAlt: "Barista serving a drink at a mobile coffee cart under a cream umbrella",
      whaleImage: "/images/hero-whale.jpeg",
      whaleImageAlt: "Whale-shaped dessert garnished with an orchid",
      watermelonImage: "/images/hero-watermelon.jpeg",
      watermelonImageAlt: "Watermelon mocktail with lime on a branded cup",
      bgImage1: "/images/hero-bg-1.jpeg",
      bgImage2: "/images/hero-bg-2.jpeg",
      bgImage3: "/images/hero-bg-3.jpeg",
      bgImage4: "/images/hero-bg-4.jpeg",
      bgImage5: "",
    },
    strip: {
      point1Title: "We bring the experience to you.",
      point1Text: "High-end, fully mobile setups that arrive at your venue.",
      point2Title: "Interactive, not just served.",
      point2Text: "Guests gather, watch, and taste. Built to be photographed.",
      point3Title: "Designed around your event.",
      point3Text: "Colors, branding, signage, and styling matched to you.",
    },
    experiences: {
      eyebrow: "The Popsy Bar",
      title: "Choose your *experience.*",
      sub: "Mix and match across categories to build the event you picture.",
      linkLabel: "View Experiences",
      featureEyebrow: "Our most requested",
      featureTitle: "Signature *Experiences*",
      featureBody:
        "Interactive experiences beyond food and drink, made for guests who want to be part of the moment. Fully hosted, styled to your event, and unforgettable on camera.",
      featureImage: "/images/signature-experiences.jpeg",
      featureImageAlt: "Popsy Bar signature cart with a gold logo sign and cream canopy",
      coffeeTitle: "Coffee & Beverage",
      coffeeText: "Barista-crafted drinks served from a beautiful mobile bar.",
      coffeeImage: "/images/coffee-beverage.jpeg",
      coffeeImageAlt: "Citrus drinks served beside a branded Popsy Bar cup",
      mocktailTitle: "Mocktail Experiences",
      mocktailText: "Signature and popping boba mocktails, plus Pakistani-inspired creations.",
      mocktailImage: "/images/mocktail-experiences.jpeg",
      mocktailImageAlt: "Boba mocktail topped with an orchid",
      sweetTitle: "Sweet Experiences",
      sweetText: '"The Sweet Spot" interactive dessert stations guests can watch and share.',
      sweetImage: "/images/sweet-experiences.jpeg",
      sweetImageAlt: "White ice cream cart with glass jars, cones and fresh flowers",
    },
    occasions: {
      eyebrow: "Can they do my event?",
      title: "What are you *celebrating?*",
      sub: "Tell us the occasion and we'll shape the experience around it.",
    },
    cart: {
      eyebrow: "Why Popsy is different",
      title: "Design your *cart.*",
      sub: "Every Popsy setup is styled around your event. Try it: name your cart, pick a look, and see it come together.",
      previewImage: "/images/cart-preview.jpeg",
      previewImageAlt: "Popsy cart with a framed sign reading Your Event Mocktails",
      caption:
        "Live preview on a real Popsy cart. Your name, colors and menu title appear on the signage. Final designs are custom-made for each event.",
      buttonLabel: "Add this design to my inquiry",
    },
    gallery: {
      eyebrow: "Visual proof",
      title: "See the *experience.*",
      noteLead: "More on",
      viewAllLabel: "See the full gallery",
    },
    story: {
      eyebrow: "The Popsy story",
      title: "Two cultures, *one cart.*",
      body: "The Popsy Bar was started by a Houston-born brother and sister who wanted to celebrate their Mexican and Pakistani roots through food. That blend still shows up today, from birria and churros to Pakistani signature mocktails.",
      image: "/images/story.jpeg",
      imageAlt: "Founder smiling beside a styled Popsy Bar cart",
      chips: "Founded by siblings\nMexican & Pakistani flavors\nHalal menus\nCustom menus",
    },
    plan: {
      eyebrow: "Start here",
      title: "Plan your *event.*",
      sub: "Answer a few quick questions and request a customized proposal.",
      submitLabel: "Request my proposal",
    },
  },

  about: {
    hero: {
      eyebrow: "The Popsy Bar · Our story",
      title: "Thoughtful details. *Memorable moments.*",
      lead: "The Popsy Bar brings interactive mobile bar and event experiences to gatherings, with a focus on presentation, personal touches and the joy of sharing a moment.",
      primaryLabel: "Explore events",
      primaryHref: "/events",
      secondaryLabel: "Get in touch",
      secondaryHref: "/contact",
      image: "/images/story.jpeg",
      imageAlt: "A Popsy Bar cart beside its event team",
    },
    story: {
      image: "/images/hero-bg-4.jpeg",
      imageAlt: "A detail from an event experience setup",
      eyebrow: "Our story",
      title: "Built around the *shared moment.*",
      paragraph1:
        "The Popsy Bar is an invitation to make gatherings feel considered and personal. Whether guests are discovering a drink, choosing a sweet treat or exploring an interactive station, we want the experience to feel like a natural part of the occasion.",
      paragraph2:
        "This page is an editable introduction to the brand rather than a timeline of unverified milestones. Add the details of the founders’ journey, inspirations and defining moments here whenever you’re ready.",
    },
    philosophy: {
      eyebrow: "Our philosophy",
      title: "Good hospitality lives in *the details.*",
      body: "Presentation creates the first impression; thoughtful service makes the experience welcoming; personalisation helps it feel connected to your event. We bring these ideas together through creative stations designed around the people and purpose of each gathering.",
    },
    services: {
      eyebrow: "What we do",
      title: "Find the experience that *fits.*",
      sub: "Explore the existing service collections, then tell us how you would like to bring them into your event.",
      linkLabel: "Explore collection",
      signatureText: "Interactive stations that add a personal, sensory or creative detail to a gathering.",
      signatureImage: "/images/signature-experiences.jpeg",
      coffeeText: "A welcoming drink station designed to bring a café-inspired moment to your event.",
      coffeeImage: "/images/coffee-beverage.jpeg",
      mocktailText: "Colourful, alcohol-free drinks and playful details that invite guests to connect.",
      mocktailImage: "/images/mocktail-experiences.jpeg",
      sweetText: "Dessert stations that give guests something delicious and interactive to enjoy.",
      sweetImage: "/images/cart-preview.jpeg",
      eventsEyebrow: "For your occasion",
      eventsTitle: "Events",
      eventsText: "Explore ideas for corporate gatherings, celebrations, weddings, showers and more.",
      eventsLinkLabel: "Browse event types",
    },
    values: {
      eyebrow: "What makes it special",
      title: "A considered experience, *from first detail to last.*",
      value1Title: "Thoughtful presentation",
      value1Text: "The details of a setup help set the mood. We consider how the station looks, feels and fits within your event.",
      value2Title: "Personal touches",
      value2Text: "Your occasion is the starting point for conversations about styling, menus and the kind of experience you want guests to have.",
      value3Title: "Warm hospitality",
      value3Text: "A good experience is more than what is served. It is also how guests are welcomed, guided and included.",
      value4Title: "Creative connection",
      value4Text: "We look for ways to make the station a natural place for guests to gather, discover and share a moment.",
    },
    approach: {
      eyebrow: "Our approach",
      title: "From first idea to *event day.*",
      step1Title: "Tell us about it",
      step1Text: "Share the occasion, venue, date, guest estimate and the atmosphere you have in mind.",
      step2Title: "Explore the options",
      step2Text: "We can discuss suitable service categories and the details that matter most to your gathering.",
      step3Title: "Shape the experience",
      step3Text: "Work through the menu, styling and practical considerations for your event.",
      step4Title: "Enjoy the moment",
      step4Text: "On the day, the experience is there to help bring people together around something special.",
    },
    cta: {
      eyebrow: "Let’s make it yours",
      title: "Have something *in mind?*",
      body: "Explore our experience collections or get in touch to talk through your plans.",
      primaryLabel: "Explore experiences",
      primaryHref: "/experiences/signatureexperiences",
      secondaryLabel: "Contact us",
      secondaryHref: "/contact",
    },
  },

  events: {
    hero: {
      eyebrow: "The Popsy Bar · Events",
      title: "Every gathering deserves its *moment.*",
      lead: "From intimate celebrations to brand moments and milestone gatherings, explore event experiences designed to bring people together.",
      primaryLabel: "Explore event types",
      secondaryLabel: "Plan your event",
      secondaryHref: "/#plan",
      image: "/images/hero-bg-3.jpeg",
      imageAlt: "A styled event experience setting",
    },
    index: {
      eyebrow: "Find your occasion",
      title: "What are you *celebrating?*",
      sub: "Choose an event type to explore ideas for a tailored Popsy Bar experience.",
    },
    occasions: eventsOccasions,
    cta: {
      eyebrow: "Your event, your way",
      title: "Let’s create a moment *worth gathering for.*",
      body: "Tell us what you’re planning and we’ll help you explore the right experience for your occasion.",
      label: "Plan your event",
    },
  },

  contact: {
    hero: {
      eyebrow: "The Popsy Bar · Get in touch",
      title: "Let’s plan something *memorable.*",
      lead: "Tell us what you’re celebrating, the kind of experience you have in mind, and any details you already know. We’d love to hear what you’re planning.",
      primaryLabel: "Send an inquiry",
      image: "/images/signature-experiences.jpeg",
      imageAlt: "The Popsy Bar signature experience station",
    },
    details: {
      eyebrow: "Contact details",
      title: "Start with a *hello.*",
      sub: "Share a few details and we can begin exploring what fits your event.",
      emailHeading: "Let’s talk details",
      phoneHeading: "Speak with us",
      locationHeading: "Visit us",
      locationNote: "Share your venue or event location in the form so we can discuss the details.",
      socialHeading: "Follow the story",
      socialNote: "See recent events and ideas on our social channels.",
    },
    form: {
      eyebrow: "Event inquiry",
      title: "Tell us what you’re *imagining.*",
      intro: "Required fields are marked in the form. The more you can share, the easier it is to start a useful conversation.",
      submitLabel: "Submit inquiry",
      finePrint: "Prefer to talk? Call or email us using the details above.",
    },
    map: {
      eyebrow: "Find us",
      title: "Come and *find us.*",
      sub: "Our location is shown below. Contact us before visiting so we can make sure someone is available.",
    },
    cta: {
      eyebrow: "Whenever you’re ready",
      title: "We’d love to hear *your idea.*",
      body: "Explore the experiences or send us a note to start planning.",
      primaryLabel: "Explore events",
      primaryHref: "/events",
      secondaryLabel: "Explore experiences",
      secondaryHref: "/experiences/signatureexperiences",
    },
  },

  plan: {
    hero: {
      eyebrow: "The Popsy Bar · Plan your event",
      title: "Let’s shape your *experience.*",
      lead: "Choose your occasion, tell us a little about your plans and request a tailored proposal. A few details are all we need to get started.",
      primaryLabel: "Start planning",
      secondaryLabel: "See the gallery",
      secondaryHref: "/gallery",
      image: "/images/hero-bg-2.jpeg",
      imageAlt: "A colourful dessert cart styled for a celebration",
    },
    steps: {
      eyebrow: "How it works",
      title: "Three simple *steps.*",
      step1Title: "Tell us the occasion",
      step1Text: "Pick the kind of event you are planning and share the date and guest estimate.",
      step2Title: "Share your ideas",
      step2Text: "Tell us about the atmosphere, venue and experiences you have in mind.",
      step3Title: "Request your proposal",
      step3Text: "Send your inquiry and we will follow up to talk through the details.",
    },
    occasions: {
      eyebrow: "Step one",
      title: "What are you *celebrating?*",
      sub: "Select the occasion that fits best. You can add more detail in your message.",
    },
    form: {
      eyebrow: "Your details",
      title: "Request your *proposal.*",
      intro: "Fields marked with an asterisk are required.",
      submitLabel: "Request my proposal",
    },
    map: {
      eyebrow: "Find us",
      title: "Where to *find us.*",
      sub: "Prefer to visit or to talk it through in person? Here is where we are based.",
    },
  },

  gallery: {
    hero: {
      eyebrow: "The Popsy Bar · Gallery",
      title: "See the *experience.*",
      lead: "A look at the drinks, desserts and styled setups we bring to celebrations of every kind, organised by occasion.",
      primaryLabel: "Plan your event",
      primaryHref: "/#plan",
      secondaryLabel: "Browse by occasion",
      image: "/images/hero-bg-2.jpeg",
      imageAlt: "A colourful checkered dessert cart styled with flowers",
    },
    labels: {
      viewMore: "View More",
      viewLess: "Show Less",
      empty: "More photos soon.",
      emptyNote: "We’re adding photos for this occasion. Tell us about your event in the meantime.",
      cta: "Plan this event",
    },
    categories: galleryCategories,
    cta: {
      eyebrow: "Your turn",
      title: "Ready to create *your moment?*",
      body: "Tell us what you’re celebrating and we’ll help you plan an experience that fits.",
      label: "Plan your event",
    },
  },

  occasions: occasionCovers,

  footer: {
    tagline: "Luxury mobile coffee, beverage, & dessert bars. Elevated interactive event experiences.",
    exploreHeading: "Explore",
    contactHeading: "Contact Us",
    email: "thepopsybar@gmail.com",
    phone: "(832) 316-5851",
    instagramHref: "https://www.instagram.com/thepopsybar",
    tiktokHref: "https://www.tiktok.com/@thepopsybar",
    facebookHref: "https://www.facebook.com/thepopsybar",
  },

  experienceShared: {
    highlightsEyebrow: "The Popsy Bar experience",
    highlightsTitle: "Thoughtful details. *Memorable moments.*",
    highlight1Title: "Styled for you",
    highlight1Text: "Choose a look that complements your event, colour palette and atmosphere.",
    highlight2Title: "Made to gather around",
    highlight2Text: "Give guests an inviting focal point and an experience to enjoy together.",
    highlight3Title: "Easy to plan",
    highlight3Text: "Tell us about your event and we can help you explore the right setup.",
    ctaEyebrow: "Let’s make it memorable",
    ctaTitle: "Planning something *special?*",
    ctaText: "Tell us what you’re celebrating and we’ll help you plan an experience that fits.",
    ctaLabel: "Plan Your Event",
  },

  experiences: experiencesTree,
};

export type Defaults = typeof defaults;
export type PageKey = keyof Defaults;
