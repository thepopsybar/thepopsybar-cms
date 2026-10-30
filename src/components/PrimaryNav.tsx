"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
} from "react";
import MegaMenu from "./MegaMenu";
import type { NavLink } from "./MobileNav";
import type { ExperienceGroup } from "@/lib/experiences";

const HOVER_CLOSE_DELAY_MS = 150;

type PrimaryNavProps = {
  links: NavLink[];
  groups: ExperienceGroup[];
};

export default function PrimaryNav({ links, groups }: PrimaryNavProps) {
  const [open, setOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openedByHover = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    openedByHover.current = false;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (itemRef.current?.contains(document.activeElement)) {
        triggerRef.current?.focus();
      }
      close();
    }
    function onPointerDown(event: globalThis.PointerEvent) {
      if (itemRef.current && !itemRef.current.contains(event.target as Node)) close();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", close);
    };
  }, [open, close]);

  function cancelScheduledClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  // Hover only applies to a real mouse; touch and pen use the click handler.
  function handlePointerEnter(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    cancelScheduledClose();
    if (!open) {
      openedByHover.current = true;
      setOpen(true);
    }
  }

  function handlePointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    cancelScheduledClose();
    closeTimer.current = setTimeout(close, HOVER_CLOSE_DELAY_MS);
  }

  function handleClick() {
    // A click right after hover-opening keeps the menu open instead of closing it.
    if (open && openedByHover.current) {
      openedByHover.current = false;
      return;
    }
    if (open) close();
    else setOpen(true);
  }

  // Tabbing out of the trigger/menu closes it.
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && itemRef.current && !itemRef.current.contains(next)) {
      close();
    }
  }

  return (
    <nav className="site-nav" aria-label="Primary">
      {links.filter((link) => !link.mobileOnly).map((link) =>
        link.megaMenu ? (
          <div
            key={link.href}
            ref={itemRef}
            className="site-nav__item"
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onBlur={handleBlur}
          >
            <button
              ref={triggerRef}
              type="button"
              className="site-nav__trigger"
              aria-expanded={open}
              aria-controls="mega-menu"
              onClick={handleClick}
            >
              {link.label}
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <path d="M2.5 4.5L6 8l3.5-3.5" />
              </svg>
            </button>
            <MegaMenu id="mega-menu" groups={groups} open={open} onNavigate={close} />
          </div>
        ) : (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ),
      )}
    </nav>
  );
}
