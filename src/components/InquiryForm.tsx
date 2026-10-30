import EventInquiryForm from "./EventInquiryForm";
import Rich from "./Rich";
import SectionHead from "./SectionHead";
import { getContent } from "@/lib/cms/content";
import { occasions } from "@/lib/occasions";

/** Homepage "Plan your event" section. */
export default async function InquiryForm() {
  const c = (await getContent("home")).plan;
  return (
    <section className="plan" id="plan">
      <SectionHead dark eyebrow={c.eyebrow} title={<Rich text={c.title} />} sub={c.sub} />
      <EventInquiryForm variant="home" occasions={occasions.map((o) => o.title)} submitLabel={c.submitLabel} />
    </section>
  );
}
