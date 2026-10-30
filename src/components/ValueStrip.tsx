import { getContent } from "@/lib/cms/content";

export default async function ValueStrip() {
  const c = (await getContent("home")).strip;
  const points = [
    { title: c.point1Title, text: c.point1Text },
    { title: c.point2Title, text: c.point2Text },
    { title: c.point3Title, text: c.point3Text },
  ];
  return (
    <section className="strip" aria-label="Why Popsy Bar">
      <div className="strip__inner">
        {points.map((point) => (
          <p key={point.title}>
            <strong>{point.title}</strong> {point.text}
          </p>
        ))}
      </div>
    </section>
  );
}
