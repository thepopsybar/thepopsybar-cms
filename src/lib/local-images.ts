/**
 * Photos that ship in /public/images. Keep this list in sync if you add or remove local files.
 * Used so pages never render an <Image> for a file that does not exist (those spots show a
 * graceful placeholder instead). Photos uploaded through /admin live on Cloudinary and are
 * always treated as available.
 */
const LOCAL_IMAGES = new Set<string>([
  "/images/cart-preview.jpeg",
  "/images/coffee-beverage.jpeg",
  "/images/gallery-1.jpeg",
  "/images/gallery-2.jpeg",
  "/images/gallery-3.jpeg",
  "/images/gallery-4.jpeg",
  "/images/gallery-5.jpeg",
  "/images/gallery-6.jpeg",
  "/images/gallery-7.jpeg",
  "/images/gallery-8.jpeg",
  "/images/gallery-9.jpeg",
  "/images/hero-bg-1.jpeg",
  "/images/hero-bg-2.jpeg",
  "/images/hero-bg-3.jpeg",
  "/images/hero-bg-4.jpeg",
  "/images/hero-main.jpeg",
  "/images/hero-watermelon.jpeg",
  "/images/hero-whale.jpeg",
  "/images/mocktail-experiences.jpeg",
  "/images/occasion-birthday.jpeg",
  "/images/occasion-brand.jpeg",
  "/images/occasion-corporate.jpeg",
  "/images/occasion-cultural.jpeg",
  "/images/occasion-graduation.jpeg",
  "/images/occasion-party.jpeg",
  "/images/occasion-shower.jpeg",
  "/images/occasion-wedding.jpeg",
  "/images/signature-experiences.jpeg",
  "/images/story.jpeg",
  "/images/sweet-experiences.jpeg",
]);

export function isAvailableImage(src: string | null | undefined): src is string {
  if (!src) return false;
  if (/^https?:\/\//i.test(src)) return true;
  return LOCAL_IMAGES.has(src);
}
