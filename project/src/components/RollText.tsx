/**
 * GSAP-style rolling letters (from the GreeLogix site): on hover of the nearest
 * link/button/.group, every character flips up into its accent-coloured twin,
 * staggered left → right. Screen readers get the plain text via aria-label.
 */
export default function RollText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`roll ${className}`} aria-label={text} role="text">
      {[...text].map((ch, i) => {
        const c = ch === " " ? "\u00A0" : ch;
        return (
          <span key={i} className="roll-char" aria-hidden>
            <span className="roll-char-inner" style={{ transitionDelay: `${i * 18}ms` }}>
              <span>{c}</span>
              <span>{c}</span>
            </span>
          </span>
        );
      })}
    </span>
  );
}
