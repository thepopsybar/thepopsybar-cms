import Link from "next/link";
import type { ExperienceGroup } from "@/lib/experiences";

type MegaMenuProps = {
  id: string;
  groups: ExperienceGroup[];
  open: boolean;
  onNavigate: () => void;
};

function Heading({ group }: { group: ExperienceGroup }) {
  if (!group.featured) return <>{group.heading}</>;
  // Featured heading: last word set in the site's italic accent style.
  const words = group.heading.split(" ");
  const last = words[words.length - 1];
  const lead = words.slice(0, -1).join(" ");
  return (
    <>
      {lead} <em>{last}</em>
    </>
  );
}

export default function MegaMenu({ id, groups, open, onNavigate }: MegaMenuProps) {
  return (
    <div id={id} className={open ? "mega is-open" : "mega"}>
      {groups.map((group) => {
        const headingId = `mega-heading-${group.id}`;
        return (
          <div key={group.id} className={`mega__col mega__col--${group.id}`}>
            <p id={headingId} className="mega__heading">
              <Link
                className="mega__heading-link"
                href={group.links[0]?.href.split("#")[0] ?? "/experiences/signatureexperiences"}
                prefetch={false}
                onClick={onNavigate}
              >
                <Heading group={group} />
              </Link>
            </p>
            <ul className="mega__list" aria-labelledby={headingId}>
              {group.links.map((link) => (
                <li key={link.href}>
                  {/* prefetch off until these pages exist, to avoid 404 prefetch requests */}
                  <Link className="mega__link" href={link.href} prefetch={false} onClick={onNavigate}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
