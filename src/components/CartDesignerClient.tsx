"use client";

import { useState, type FormEvent, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { saveCartDesign } from "@/lib/forms/cart-design-store";

const experiences = [
  "Mocktails", "Coffee Bar", "Matcha Bar", "Crêpes Bar", "Churros",
  "Sundae Bar", "Gelato Bar", "Perfume Bar", "Oud Bar", "Flower Station",
] as const;

const themes = [
  { id: "coastal", name: "Coastal Blue", sw: "#9CC3E6", bg: "#EAF3FA", ink: "#1F3F66", acc: "#B08A4E", ref: "cart-kozak.jpg", caption: "A custom cart panel and framed menu designed around a celebration theme." },
  { id: "citrus", name: "Citrus Sunset", sw: "#F0A04B", bg: "#FFF0D4", ink: "#7A3410", acc: "#E2711D", ref: "cart-latte.jpg", caption: "Fresh citrus, bright fabric and statement props styled around one color story." },
  { id: "melon", name: "Watermelon Pop", sw: "#E8626E", bg: "#FFE2E0", ink: "#8A1F2B", acc: "#2E8B57", ref: "cart-watermelon.jpg", caption: "Branded cups styled with fresh fruit, vivid fabric and playful props." },
  { id: "blush", name: "Blush & Gold", sw: "#F4D9DC", bg: "#F9E6E8", ink: "#3B2024", acc: "#B08A4E", ref: "cart-conch.jpg", caption: "Orchids, pearl-white serveware and soft tones for an elegant look." },
] as const;

const specs = [
  ["Colors", "Matched to your palette"], ["Branding", "Corporate integrations"],
  ["Signage", "Personalized"], ["Cart décor", "Custom styling"],
  ["Menus", "Tailored to your guests"], ["Themed styling", "Built around your theme"],
];

export default function CartDesignerClient({ content }: { content: { eyebrow: string; title: string; sub: string; previewImageAlt: string; caption: string; buttonLabel: string } }) {
  const router = useRouter();
  const [eventName, setEventName] = useState("Your Event");
  const [experience, setExperience] = useState<string>("Mocktails");
  const [themeId, setThemeId] = useState<string>("coastal");
  const [message, setMessage] = useState("");
  const theme = themes.find((item) => item.id === themeId) ?? themes[0];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveCartDesign({ eventName: eventName.trim(), experience, theme: theme.name });
    const target = document.getElementById("plan");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
      setMessage("Design added. Finish your inquiry below and it will be sent with your request.");
    } else router.push("/plan-your-event");
  }

  const titleSize = experience.length > 12 ? "small" : experience.length > 9 ? "medium" : "normal";

  return (
    <section className="section" id="design">
      <div className="section__head">
        <p className="eyebrow">{content.eyebrow}</p>
        <h2>{content.title.split(/\*([^*]+)\*/g).map((part, index) => index % 2 === 1 ? <em key={index}>{part}</em> : part)}</h2>
        <p className="section__sub">{content.sub}</p>
      </div>
      <div className="cart-studio">
        <div className="cart-studio__visual">
          <div className="cart-studio__wrap">
            <div className="cart-studio__stage" style={{ "--p-bg": theme.bg, "--p-ink": theme.ink, "--p-acc": theme.acc } as CSSProperties} aria-label="Live preview of your custom cart">
              <img className="cart-studio__base" src="/images/cart-cartbase.jpg" alt={content.previewImageAlt || "A Popsy Bar cart under a fringed umbrella"} />
              <div className="cart-studio__menu"><b>{experience}</b><i /><i /></div>
              <div className="cart-studio__panel">
                <div className="cart-studio__frame" />
                <div className="cart-studio__sign">
                  <small>{eventName.trim() || "Your Event"}</small>
                  <span className={`cart-studio__script cart-studio__script--${titleSize}`}>{experience}</span>
                </div>
              </div>
            </div>
          </div>
          <p className="cart-studio__fine">{content.caption || "Live preview on a real Popsy cart. Your name, colors and menu title appear on the signage. Final designs are custom-made for each event."}</p>
          <div className="cart-studio__reference">
            <img src={`/images/${theme.ref}`} alt="" />
            <p><b>See it in real life</b>{theme.caption}</p>
          </div>
        </div>

        <form className="cart-studio__panel-form panel" onSubmit={handleSubmit}>
          <label className="cart-studio__control">
            <span>Event or family name</span>
            <input className="cart-studio__field" type="text" maxLength={22} value={eventName} autoComplete="off" onChange={(e) => setEventName(e.target.value)} />
          </label>
          <label className="cart-studio__control">
            <span>Experience</span>
            <select className="cart-studio__field" value={experience} onChange={(e) => setExperience(e.target.value)}>
              {experiences.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <fieldset className="cart-studio__control cart-studio__themes">
            <legend>Theme &amp; colors</legend>
            <div className="cart-studio__theme-list">
              {themes.map((item) => (
                <button key={item.id} type="button" className="cart-studio__theme" aria-pressed={themeId === item.id} onClick={() => setThemeId(item.id)}>
                  <i style={{ background: item.sw }} />{item.name}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="cart-studio__actions">
            <button className="btn btn--blush" type="submit">{content.buttonLabel} <span aria-hidden="true">→</span></button>
          </div>
          {message ? <p className="form-note" role="status">{message}</p> : null}
          <dl className="cart-studio__specs">
            {specs.map(([term, detail]) => <div key={term}><dt>{term}</dt><dd>{detail}</dd></div>)}
          </dl>
        </form>
      </div>
    </section>
  );
}
