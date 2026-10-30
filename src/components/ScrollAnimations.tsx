"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Progressive-enhancement scroll reveals for public pages. Content remains visible
 * when JavaScript is disabled and when reduced motion is requested.
 */
export default function ScrollAnimations() {
  const pathname = usePathname();

  useEffect(() => {
    const html = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (pathname?.startsWith("/admin") || reducedMotion.matches || !("IntersectionObserver" in window)) {
      html.classList.remove("motion-ready");
      return;
    }

    const selector = [
      "main > section",
      "main > div > section",
      ".editorial-hero",
      ".exp-hero",
      ".hero",
      ".hero-slideshow",
      ".section__head",
      ".editorial-index",
      ".editorial-section",
      ".exp-section",
      ".gallery-cat",
      ".about-service-card",
      ".about-value",
      ".exp-highlight",
      ".contact-detail",
      ".gallery-grid__item",
      ".about-approach__steps > li",
      ".contact-form-section__intro",
      ".exp-cta__inner",
      ".value-strip__item",
      ".service-card",
      ".card",
      ".feature",
      ".occasion",
      ".gallery .g",
      ".hero__collage .hero__img",
      ".story__img",
      ".story__text",
      ".cart-designer__panel",
      ".strip__inner > p",
    ].join(",");

    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const unique = Array.from(new Set(nodes)).filter((element) => {
      if (element.closest("[data-no-reveal]")) return false;
      // Keep the page's primary hero visible immediately and animate its contents separately.
      return !element.matches("main > section:first-child, .editorial-hero, .exp-hero, .hero");
    });

    const heroParts = document.querySelectorAll<HTMLElement>(
      "main > section:first-child .editorial-hero__copy, main > section:first-child .editorial-hero__media, .editorial-hero__copy, .editorial-hero__media, .exp-hero__text, .exp-hero__media, .hero__content, .hero__copy, .hero__text, .hero__collage"
    );

    heroParts.forEach((element, index) => {
      element.dataset.reveal = "hero";
      element.style.setProperty("--reveal-delay", `${Math.min(index, 3) * 90}ms`);
    });

    unique.forEach((element, index) => {
      element.dataset.reveal = element.matches(".about-service-card, .about-value, .exp-highlight, .contact-detail, .gallery-grid__item, .about-approach__steps > li") ? "item" : "section";
      if (element.dataset.reveal === "item") {
        const siblings = element.parentElement ? Array.from(element.parentElement.children) : [];
        element.style.setProperty("--reveal-delay", `${Math.min(Math.max(siblings.indexOf(element), 0), 5) * 70}ms`);
      }
    });

    // Avoid a flash of hidden content: the observer only hides elements after it is ready.
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    html.classList.add("motion-ready");
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight * 0.92) {
        element.classList.add("is-revealed");
      } else {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
      html.classList.remove("motion-ready");
      document.querySelectorAll("[data-reveal]").forEach((element) => {
        (element as HTMLElement).classList.remove("is-revealed");
        delete (element as HTMLElement).dataset.reveal;
      });
    };
  }, [pathname]);

  return null;
}
