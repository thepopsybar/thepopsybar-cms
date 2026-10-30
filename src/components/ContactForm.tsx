"use client";

import type { FormEvent } from "react";
import FormFeedback from "./FormFeedback";
import { formToFields } from "@/lib/forms/submit";
import { useFormSubmit } from "@/lib/forms/use-submit";
import { useMinEventDate } from "@/lib/forms/use-min-date";

type ContactFormProps = {
  occasions: string[];
  initialEvent: string;
  submitLabel: string;
  finePrint: string;
};

export default function ContactForm({ occasions, initialEvent, submitLabel, finePrint }: ContactFormProps) {
  const minDate = useMinEventDate();
  const { status, submit } = useFormSubmit("New contact inquiry — The Popsy Bar");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const honeypot = (new FormData(form).get("website") as string | null) ?? "";
    const ok = await submit(formToFields(form), honeypot);
    if (ok) form.reset();
  }

  const pending = status.state === "pending";

  return (
    <form className="contact-form panel" onSubmit={handleSubmit} aria-busy={pending}>
      <div className="form-trap" aria-hidden="true">
        <label>
          Leave this field empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="contact-form__grid">
        <label className="field">
          <span className="field__label">Full name <span aria-hidden="true">*</span></span>
          <input type="text" name="Full name" autoComplete="name" required maxLength={120} />
        </label>
        <label className="field">
          <span className="field__label">Email <span aria-hidden="true">*</span></span>
          <input type="email" name="email" autoComplete="email" required maxLength={254} />
        </label>
        <label className="field">
          <span className="field__label">Phone number</span>
          <input type="tel" name="Phone number" autoComplete="tel" maxLength={40} />
        </label>
        <label className="field">
          <span className="field__label">Event type</span>
          <select name="Event type" defaultValue={initialEvent}>
            <option value="">Select an occasion</option>
            {occasions.map((title) => (
              <option key={title} value={title}>{title}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Preferred event date</span>
          <input type="date" name="Preferred event date" min={minDate} />
        </label>
        <label className="field">
          <span className="field__label">Estimated guest count</span>
          <input type="number" name="Estimated guest count" min={1} max={100000} inputMode="numeric" />
        </label>
        <label className="field contact-form__full">
          <span className="field__label">Subject <span aria-hidden="true">*</span></span>
          <input type="text" name="Subject" required maxLength={160} />
        </label>
        <label className="field contact-form__full">
          <span className="field__label">Message <span aria-hidden="true">*</span></span>
          <textarea name="Message" rows={6} required maxLength={5000} placeholder="Tell us about your event, location, ideas, or questions." />
        </label>
        <label className="contact-consent contact-form__full">
          <input type="checkbox" name="Contact consent" value="I agree to be contacted about this inquiry" required />
          <span>I agree that The Popsy Bar may contact me about this inquiry. <span aria-hidden="true">*</span></span>
        </label>
      </div>
      <button className="btn btn--blush" type="submit" disabled={pending}>
        {pending ? "Sending…" : submitLabel}
      </button>
      <FormFeedback status={status} />
      <p className="contact-form__fineprint">{finePrint}</p>
    </form>
  );
}
