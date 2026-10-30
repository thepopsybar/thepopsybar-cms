import type { FormStatus } from "@/lib/forms/use-submit";

/** Accessible result message for any form. Renders nothing until the form has been submitted. */
export default function FormFeedback({ status }: { status: FormStatus }) {
  if (status.state === "idle") return <div aria-live="polite" />;
  return (
    <p
      className={`form-feedback form-feedback--${status.state}`}
      role={status.state === "error" ? "alert" : "status"}
    >
      {status.message}
    </p>
  );
}
