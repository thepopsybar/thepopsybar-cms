type ChipsProps = {
  items: string[];
  light?: boolean;
  label?: string;
  hrefs?: string[];
};

export default function Chips({ items, light = false, label, hrefs }: ChipsProps) {
  return (
    <ul className={light ? "chips chips--light" : "chips"} aria-label={label}>
      {items.map((item, index) => (
        <li key={item}>
          {hrefs?.[index] ? <a href={hrefs[index]}>{item}</a> : item}
        </li>
      ))}
    </ul>
  );
}
