"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import FormFeedback from "./FormFeedback";
import { formToFields } from "@/lib/forms/submit";
import { useInquirySubmit } from "@/lib/forms/use-submit";
import { useMinEventDate } from "@/lib/forms/use-min-date";
import {
  clearCartDesign,
  getCartDesignServerSnapshot,
  getCartDesignSnapshot,
  parseCartDesign,
  subscribeCartDesign,
} from "@/lib/forms/cart-design-store";

type EventInquiryFormProps = {
  /** "home" is the compact homepage form; "plan" is the full plan form. */
  variant: "home" | "plan";
  occasions: string[];
  initialOccasion?: string;
  submitLabel: string;
};

export default function EventInquiryForm({ variant, occasions, initialOccasion, submitLabel }: EventInquiryFormProps) {
  const [occasion, setOccasion] = useState(initialOccasion || occasions[0] || "");
  const { status, submit } = useInquirySubmit(
    variant === "plan" ? "New event proposal request — The Popsy Bar" : "New event inquiry (homepage) — The Popsy Bar",
  );
  const rawDesign = useSyncExternalStore(subscribeCartDesign, getCartDesignSnapshot, getCartDesignServerSnapshot);
  const design = useMemo(() => parseCartDesign(rawDesign), [rawDesign]);
  const minDate = useMinEventDate();
  const pending = status.state === "pending";
  const full = variant === "plan";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const honeypot = (new FormData(form).get("website") as string | null) ?? "";
    const fields = formToFields(form);
    if (design) {
      fields["Cart design"] = `${design.experience} · ${design.theme}${design.eventName ? ` · “${design.eventName}”` : ""}`;
    }
    const ok = await submit(fields, honeypot);
    if (ok) {
      form.reset();
      setOccasion(initialOccasion || occasions[0] || "");
      clearCartDesign();
    }
  }

  return (
    <form className="plan__form panel" onSubmit={handleSubmit} aria-busy={pending}>
      <div className="form-trap" aria-hidden="true">
        <label>
          Leave this field empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <fieldset className="field">
        <legend className="field__label">What are you celebrating?</legend>
        <div className="options options--grid">
          {occasions.map((title) => (
            <label className="option" key={title}>
              <input
                type="radio"
                name="Occasion"
                value={title}
                checked={occasion === title}
                onChange={() => setOccasion(title)}
              />
              <span>{title}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {design ? (
        <p className="form-note" role="status">
          Cart design added: <strong>{design.experience}</strong> · {design.theme}
          {design.eventName ? <> · “{design.eventName}”</> : null}{" "}
          <button type="button" className="form-note__remove" onClick={clearCartDesign}>Remove</button>
        </p>
      ) : null}
      <div className="plan__row">
        <label className="field">
          <span className="field__label">Your name <span aria-hidden="true">*</span></span>
          <input type="text" name="Name" autoComplete="name" required maxLength={120} />
        </label>
        <label className="field">
          <span className="field__label">Email <span aria-hidden="true">*</span></span>
          <input type="email" name="email" autoComplete="email" required maxLength={254} />
        </label>
        {full ? (
          <label className="field">
            <span className="field__label">Phone number</span>
            <input type="tel" name="Phone number" autoComplete="tel" maxLength={40} />
          </label>
        ) : null}
        <label className="field">
          <span className="field__label">Event date</span>
          <input type="date" name="Event date" min={minDate} />
        </label>
        <label className="field">
          <span className="field__label">Guest count</span>
          <input type="number" name="Guest count" min={1} max={100000} inputMode="numeric" />
        </label>
        {full ? (
          <label className="field">
            <span className="field__label">Event location</span>
            <input type="text" name="Event location" maxLength={200} />
          </label>
        ) : null}
      </div>
      <label className="field">
        <span className="field__label">Tell us about your event</span>
        <textarea name="Details" rows={4} maxLength={5000} />
      </label>
      {full ? (
        <label className="contact-consent">
          <input type="checkbox" name="Contact consent" value="I agree to be contacted about this inquiry" required />
          <span>I agree that The Popsy Bar may contact me about this inquiry. <span aria-hidden="true">*</span></span>
        </label>
      ) : null}
      <button className="btn btn--blush" type="submit" disabled={pending}>
        {pending ? "Sending…" : submitLabel}
      </button>
      <FormFeedback status={status} />
    </form>
  );
}
