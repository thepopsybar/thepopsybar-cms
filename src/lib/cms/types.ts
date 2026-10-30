export type GalleryImage = {
  id: string;
  /** Occasion slug, see slugify(occasion.title) */
  category: string;
  src: string;
  publicId: string | null;
  alt: string;
  position: number;
  /** Shown in the homepage gallery strip. */
  featured: boolean;
  enabled: boolean;
  seq: number;
};

export type SectionSetting = { section: string; position: number; enabled: boolean };
