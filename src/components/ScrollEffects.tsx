"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Progressive-enhancement scroll reveals for public pages only.
 * Server-rendered content is visible by default. Reveal styles are enabled
 * only after this observer is successfully installed in the browser.
 */
const TARGETS = [
  ".hero__text",
  ".hero__collage > *",
  ".section__head",
  ".feature__media",
  ".feature__body",
  ".cards > .card",
  ".occasions > .occasion",
  ".value-strip > *",
  ".strip__inner > *",
  ".gallery .g",
  ".gallery__note",
  ".story__img",
  ".story__text",
  ".editorial-hero__copy",
  ".editorial-hero__media",
  ".editorial-index > *",
  ".editorial-section__media",
  ".editorial-section__image",
  ".editorial-section__copy",
  ".editorial-points > li",
  ".editorial-section > .section__head",
  ".about-story__image",
  ".about-story__copy",
  ".about-philosophy > *",
  ".about-approach > *",
  ".about-approach__steps > li",
  ".about-services__grid > *",
  ".about-service-card",
  ".about-values__inner > *",
  ".about-values__grid > *",
  ".contact-details > *",
  ".contact-details__grid > *",
  ".contact-detail",
  ".contact-form-section > *",
  ".contact-form",
  ".contact-map > *",
  ".gallery-cat__head",
  ".gallery-grid__item",
  ".gallery-cat__more",
  ".gallery-cat__empty",
  ".plan__steps > li",
  ".plan__form",
  ".plan__note",
  ".plan-page__form > .section__head",
  ".exp-hero__text",
  ".exp-hero__media",
  ".exp-occasions > *",
  ".exp-section__media",
  ".exp-section__body",
  ".exp-highlights__inner > *",
  ".exp-highlight",
  ".exp-cta__inner",
  ".site-footer__brand",
  ".site-footer > nav > *",
  ".site-footer > address > *",
].join(",");

export default function ScrollEffects() {
  const pathname = usePathname();

  useEffect(() => {
    // Keep the admin interface instant and free of decorative reveals.
    if (pathname?.startsWith("/admin")) {
      document.documentElement.classList.remove("motion-enabled");
      return;
    }

    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      root.classList.remove("motion-enabled");
      return;
    }

    let observer: IntersectionObserver | null = null;
    let frame = 0;
    const observed = new WeakSet<Element>();

    const reveal = (element: Element) => {
      element.classList.add("is-revealed");
      (element as HTMLElement).style.removeProperty("--reveal-delay");
      observer?.unobserve(element);
    };

    const scan = (scope: ParentNode = document) => {
      const candidates = scope.querySelectorAll(TARGETS);
      candidates.forEach((element) => {
        if (observed.has(element) || element.closest("[data-admin-root]")) return;
        observed.add(element);
        element.classList.add("motion-reveal");

        // Small stagger for items in the same grid/list; never a long queue.
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter((sibling) =>
            sibling.matches(TARGETS),
          );
          const index = siblings.indexOf(element);
          if (index > 0) {
            (element as HTMLElement).style.setProperty("--reveal-delay", `${Math.min(index * 65, 260)}ms`);
          }
        }

        // Anything already on screen is made visible immediately on first scan.
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
          element.classList.add("is-revealed");
        } else {
          observer?.observe(element);
        }
      });
    };

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) reveal(entry.target);
        });
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.06 },
    );

    scan();
    // Enable hiding only after the first scan and observation are ready.
    root.classList.add("motion-enabled");

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof Element) {
        const revealTarget = target.closest(".motion-reveal");
        if (revealTarget) reveal(revealTarget);
      }
    };
    document.addEventListener("focusin", onFocusIn);

    // Supports interactive content revealed later, e.g. Gallery "View More".
    const mutationObserver = new MutationObserver((mutations) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              if (node.matches(TARGETS)) {
                scan(node.parentElement ?? document);
              } else {
                scan(node);
              }
            }
          });
        });
      });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      root.classList.remove("motion-enabled");
      observer?.disconnect();
      mutationObserver.disconnect();
      document.removeEventListener("focusin", onFocusIn);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
