import { BUSINESS, GOOGLE_MAPS_EMBED_URL, GOOGLE_MAPS_LINK } from "@/lib/site-config";

/** Responsive Google Map for the business address, with a plain link as a fallback. */
export default function BusinessMap() {
  return (
    <div className="contact-map__frame">
      <iframe
        src={GOOGLE_MAPS_EMBED_URL}
        title={`Map showing The Popsy Bar at ${BUSINESS.fullAddress}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <p className="contact-map__address">
        <strong>{BUSINESS.fullAddress}</strong> · <a href={GOOGLE_MAPS_LINK}>Open in Google Maps</a>
      </p>
    </div>
  );
}
