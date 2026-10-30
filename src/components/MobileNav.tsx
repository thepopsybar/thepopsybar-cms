"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ExperienceGroup } from "@/lib/experiences";

export type NavLink = {
  href: string;
  label: string;
  /** Opens the Experiences groups instead of jumping to the href. */
  megaMenu?: boolean;
  /** Shown only in the mobile menu (the desktop header already has this as a button). */
  mobileOnly?: boolean;
};

type MobileNavProps = {
  links: NavLink[];
  groups: ExperienceGroup[];
};

export default function MobileNav({ links, groups }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [experiencesOpen, setExperiencesOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onResize() {
      if (window.matchMedia("(min-width: 961px)").matches) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="mobile-nav-wrap">
      <button
        ref={buttonRef}
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>
      <nav id="mobile-nav" className="mobile-nav" aria-label="Primary mobile" hidden={!open}>
        {links.map((link) =>
          link.megaMenu ? (
            <div key={link.href} className="mobile-nav__section">
              <button
                type="button"
                className="mobile-nav__trigger"
                aria-expanded={experiencesOpen}
                aria-controls="mobile-experiences"
                onClick={() => setExperiencesOpen((value) => !value)}
              >
                {link.label}
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <path d="M2.5 4.5L6 8l3.5-3.5" />
                </svg>
              </button>
              <div id="mobile-experiences" className="mobile-groups" hidden={!experiencesOpen}>
                {groups.map((group) => {
                  const headingId = `mobile-heading-${group.id}`;
                  return (
                    <div key={group.id} className={`mobile-group mobile-group--${group.id}`}>
                      <p id={headingId} className="mobile-group__heading">
                        <Link
                          className="mobile-group__heading-link"
                          href={group.links[0]?.href.split("#")[0] ?? "/experiences/signatureexperiences"}
                          prefetch={false}
                          onClick={() => setOpen(false)}
                        >
                          {group.heading}
                        </Link>
                      </p>
                      <ul aria-labelledby={headingId}>
                        {group.links.map((item) => (
                          <li key={item.href}>
                            <Link
                              className="mobile-group__link"
                              href={item.href}
                              prefetch={false}
                              onClick={() => setOpen(false)}
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <a key={link.href} href={link.href.startsWith("#") ? `/${link.href}` : link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ),
        )}
      </nav>
    </div>
  );
}
