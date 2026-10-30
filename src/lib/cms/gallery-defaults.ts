import type { GalleryImage } from "./types";

/**
 * Built-in gallery, using only the photos that already exist in /public/images.
 * Used when Supabase is not configured or the gallery table is empty. The same list
 * seeds supabase/schema.sql, so the database starts out identical to this.
 * Categories without a photo (Cultural Celebration, Graduation) intentionally stay empty.
 */
type Seed = { src: string; alt: string; category: string; featured: boolean };

export const gallerySeeds: Seed[] = [
  { src: "/images/gallery-1.jpeg", alt: "A host serving drinks to guests at a Popsy Bar cart", category: "corporate", featured: true },
  { src: "/images/gallery-2.jpeg", alt: "Baby shower mocktail cart with floral signage", category: "bridal-baby-shower", featured: true },
  { src: "/images/gallery-3.jpeg", alt: "Whale-shaped dessert bowl garnished with an orchid", category: "private-party", featured: true },
  { src: "/images/gallery-4.jpeg", alt: "Iced citrus drink beside orange slices and a branded cup", category: "private-party", featured: true },
  { src: "/images/gallery-5.jpeg", alt: "Two hosts posing beside a styled, branded event cart", category: "brand-activation", featured: true },
  { src: "/images/gallery-6.jpeg", alt: "Seashell-shaped mocktail with an orchid garnish", category: "bridal-baby-shower", featured: true },
  { src: "/images/gallery-7.jpeg", alt: "Watermelon drink with lime and lemon slices on a branded cup", category: "private-party", featured: true },
  { src: "/images/gallery-8.jpeg", alt: "Gold Popsy Bar sign hanging from a cart", category: "private-party", featured: true },
  { src: "/images/cart-preview.jpeg", alt: "Branded cart with a LURÉ × Luchiana Design sign", category: "brand-activation", featured: false },
  { src: "/images/gallery-9.jpeg", alt: "Guest posing with a LURÉ jar at an event", category: "brand-activation", featured: false },
  { src: "/images/hero-bg-1.jpeg", alt: "Styled event space with round tables and a mobile cart", category: "wedding", featured: false },
  { src: "/images/hero-bg-2.jpeg", alt: "Colourful checkered dessert cart styled with flowers", category: "birthday", featured: false },
  { src: "/images/hero-bg-4.jpeg", alt: "Pink balloon backdrop with a storybook-themed sign", category: "birthday", featured: false },
  { src: "/images/hero-bg-3.jpeg", alt: "Pastel balloon garland setup at a shower", category: "bridal-baby-shower", featured: false },
];

export const defaultGalleryImages: GalleryImage[] = (() => {
  const counters: Record<string, number> = {};
  return gallerySeeds.map((seed, index) => {
    counters[seed.category] = (counters[seed.category] ?? 0) + 1;
    return {
      id: `default-${index + 1}`,
      category: seed.category,
      src: seed.src,
      publicId: null,
      alt: seed.alt,
      position: counters[seed.category],
      featured: seed.featured,
      enabled: true,
      seq: index + 1,
    };
  });
})();
