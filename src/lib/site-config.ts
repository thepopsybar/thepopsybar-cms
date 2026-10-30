/**
 * Central business configuration. Edit here, not in individual components.
 */
export const BUSINESS = {
  name: "The Popsy Bar",
  streetAddress: "2717 FM 2218 Rd",
  locality: "Rosenberg",
  region: "TX",
  postalCode: "77469",
  country: "USA",
  fullAddress: "2717 FM 2218 Rd, Rosenberg, TX 77469, USA",
  phoneDisplay: "(832) 316-5851",
  phoneHref: "tel:+18323165851",
  publicEmail: "thepopsybar@gmail.com",
} as const;

/** Inquiries from every website form are delivered to this address through FormSubmit. */
export const FORM_SUBMIT_EMAIL = "thepopsybar1@gmail.com";
export const FORM_SUBMIT_ENDPOINT = `https://formsubmit.co/ajax/${FORM_SUBMIT_EMAIL}`;

export const GOOGLE_MAPS_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2861.218912293783!2d-95.7768246!3d29.532926399999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x86411c53d1eee879%3A0x51fb507d893b4d8!2s2717%20FM%202218%20Rd%2C%20Rosenberg%2C%20TX%2077469%2C%20USA!5e1!3m2!1sen!2s!4v1792890005937!5m2!1sen!2s";

export const GOOGLE_MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BUSINESS.fullAddress)}`;

/** Production origin, used for links in push notifications. Override with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://thepopsybar.com").replace(/\/+$/, "");

/**
 * Time zone that decides what "today" means for event dates (the business is in Rosenberg, TX).
 * Override with NEXT_PUBLIC_BUSINESS_TIME_ZONE (any IANA name, e.g. "America/New_York").
 */
export const BUSINESS_TIME_ZONE = process.env.NEXT_PUBLIC_BUSINESS_TIME_ZONE?.trim() || "America/Chicago";
