import Link from "next/link";
import type { ComponentProps } from "react";

type SmartLinkProps = Omit<ComponentProps<"a">, "href"> & { href: string };

/** Internal paths use next/link; hashes, mailto/tel and external URLs stay plain anchors. */
export default function SmartLink({ href, children, ...rest }: SmartLinkProps) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
