import type { ReactNode } from "react";

type SectionHeadProps = {
  eyebrow: string;
  title: ReactNode;
  sub?: string;
  dark?: boolean;
};

export default function SectionHead({ eyebrow, title, sub, dark = false }: SectionHeadProps) {
  return (
    <header className={dark ? "section__head section__head--dark" : "section__head"}>
      <p className={dark ? "eyebrow eyebrow--dark" : "eyebrow"}>{eyebrow}</p>
      <h2>{title}</h2>
      {sub ? <p className="section__sub">{sub}</p> : null}
    </header>
  );
}
