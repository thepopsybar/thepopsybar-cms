"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import CartPreview, { cartExperiences, cartThemes, menuTitleFor, themePalettes, type CartTheme } from "./CartPreview";
import { saveCartDesign } from "@/lib/forms/cart-design-store";

const specs = [
  { term: "Colors", detail: "Matched to your palette" },
  { term: "Branding", detail: "Corporate integrations" },
  { term: "Signage", detail: "Personalized" },
  { term: "Cart décor", detail: "Custom styling" },
  { term: "Menus", detail: "Tailored to your guests" },
  { term: "Themed styling", detail: "Built around your theme" },
];

type CartDesignFormProps = {
  buttonLabel: string;
  caption: string;
  /** Server-rendered photo of a real Popsy cart (CMS-managed), shown as a reference thumbnail. */
  reference?: ReactNode;
};

export default function CartDesignForm({ buttonLabel, caption, reference }: CartDesignFormProps) {
  const router = useRouter();
  const [eventName, setEventName] = useState("");
  const [experience, setExperience] = useState<string>(cartExperiences[0]);
  const [theme, setTheme] = useState<string>(cartThemes[0]);
  const [message, setMessage] = useState("");

  const palette = themePalettes[theme as CartTheme] ?? themePalettes[cartThemes[0]];
  const vars = {
    "--cp-wall": palette.wall,
    "--cp-wall2": palette.wall2,
    "--cp-floor": palette.floor,
    "--cp-canopy": palette.canopy,
    "--cp-canopy2": palette.canopy2,
    "--cp-panel": palette.panel,
    "--cp-rim": palette.rim,
    "--cp-ink": palette.ink,
    "--cp-accent": palette.accent,
    "--cp-drink": palette.drink,
    "--cp-drink2": palette.drink2,
    "--cp-leaf": palette.leaf,
  } as CSSProperties;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveCartDesign({ eventName: eventName.trim(), experience, theme });
    const target = document.getElementById("plan");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
      setMessage("Design added. Finish your inquiry below and it will be sent with your request.");
    } else {
      router.push("/#plan");
    }
  }

  function shuffle() {
    const pick = <T,>(list: readonly T[], current: T): T => {
      const others = list.filter((item) => item !== current);
      return others[Math.floor(Math.random() * others.length)];
    };
    setExperience((current) => pick(cartExperiences, current as (typeof cartExperiences)[number]));
    setTheme((current) => pick(cartThemes, current as CartTheme));
    setMessage("");
  }

  function reset() {
    setEventName("");
    setExperience(cartExperiences[0]);
    setTheme(cartThemes[0]);
    setMessage("");
  }

  return (
    <>
      <figure className="cart__preview cartx" style={vars}>
        <div className="cartx__stage">
          <CartPreview eventName={eventName} experience={experience} theme={theme} />
        </div>
        <p className="cartx__summary" aria-live="polite">
          <strong>{experience}</strong> · {theme} · {menuTitleFor(experience)}
        </p>
        <figcaption className="cartx__caption">
          {reference ? <span className="cartx__ref">{reference}</span> : null}
          <span>{caption}</span>
        </figcaption>
      </figure>

      <form className="cart__panel panel cartx__panel" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Event or family name</span>
          <input
            type="text"
            name="event-name"
            placeholder="Your Event"
            value={eventName}
            maxLength={80}
            autoComplete="off"
            onChange={(e) => setEventName(e.target.value)}
          />
        </label>

        <fieldset className="field">
          <legend className="field__label">Experience</legend>
          <div className="options options--grid cartx__experiences">
            {cartExperiences.map((item) => (
              <label className="option" key={item}>
                <input type="radio" name="experience" value={item} checked={experience === item} onChange={() => setExperience(item)} />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend className="field__label">Theme & colors</legend>
          <div className="cartx__themes">
            {cartThemes.map((item) => {
              const p = themePalettes[item];
              return (
                <label className="cartx__theme" key={item}>
                  <input type="radio" name="theme" value={item} checked={theme === item} onChange={() => setTheme(item)} />
                  <span className="cartx__theme-body">
                    <span
                      className="cartx__swatch"
                      aria-hidden="true"
                      style={{ background: `linear-gradient(135deg, ${p.canopy} 0 50%, ${p.panel} 50% 100%)`, borderColor: p.rim }}
                    />
                    <span>{item}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="cartx__actions">
          <button className="btn btn--outline" type="submit">{buttonLabel}</button>
          <button className="cartx__link" type="button" onClick={shuffle}>Shuffle look</button>
          <button className="cartx__link" type="button" onClick={reset}>Reset</button>
        </div>
        {message ? <p className="form-note" role="status">{message}</p> : null}

        <dl className="specs">
          {specs.map((spec) => (
            <div key={spec.term}>
              <dt>{spec.term}</dt>
              <dd>{spec.detail}</dd>
            </div>
          ))}
        </dl>
      </form>
    </>
  );
}
