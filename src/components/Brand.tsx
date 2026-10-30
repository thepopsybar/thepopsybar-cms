import Image from "next/image";

type BrandProps = {
  /** Where the logo links to. Pass `null` to render the logo without a link. */
  href?: string | null;
  /** Visual size preset. Heights are defined in globals.css (.brand--header, .brand--footer, ...). */
  size?: "header" | "footer" | "admin" | "login" | "preloader";
  priority?: boolean;
  className?: string;
};

/**
 * The official The Popsy Bar logo (public/images/logo.png), used everywhere the brand mark appears.
 *
 * The supplied artwork sits inside a 500x500 canvas with generous transparent padding. The image is
 * shown at its original proportions and is only framed (never stretched, filtered or redrawn) so the
 * visible lettering fills the box, which keeps it readable at small sizes.
 */
export default function Brand({ href = "/#top", size = "header", priority = false, className = "" }: BrandProps) {
  const classes = `brand brand--${size} ${className}`.trim();
  const mark = (
    <span className="brand__frame">
      <Image
        className="brand__img"
        src="/images/logo.png"
        alt="The Popsy Bar"
        width={500}
        height={500}
        sizes="(max-width: 600px) 200px, 260px"
        priority={priority}
      />
    </span>
  );
  if (href === null) return <span className={classes}>{mark}</span>;
  return (
    <a className={classes} href={href} aria-label="The Popsy Bar — home">
      {mark}
    </a>
  );
}
