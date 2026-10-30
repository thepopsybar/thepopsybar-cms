/** Renders text where *asterisk-wrapped* words get the site's italic accent style. */
export default function Rich({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return (
    <>
      {parts.map((part, index) => (index % 2 === 1 ? <em key={index}>{part}</em> : part))}
    </>
  );
}
