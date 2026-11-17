import Marquee from "./Marquee";
import { TOOLS } from "../lib/tools";

/** Velocity-reactive strip of the tools we build UIs with — logo + name, brand colour on hover. */
export default function ToolsStrip() {
  const items = TOOLS.map((t) => (
    <span
      key={t.slug}
      className="tool-chip flex items-center gap-3"
      style={t.hover ? ({ "--brand": t.hover } as React.CSSProperties) : undefined}
      title={t.title}
    >
      <svg viewBox="0 0 24 24" className="tool-logo h-[22px] w-auto shrink-0" role="img" aria-label={t.title}>
        <path d={t.path} fill="currentColor" />
      </svg>
      <span className="label !text-[11px]" style={{ color: "inherit" }}>
        {t.title}
      </span>
    </span>
  ));

  return (
    <div className="relative">
      <span className="sr-only">Design, prototyping and developer hand-off tools we use: {TOOLS.map((t) => t.title).join(", ")}</span>
      <Marquee items={items} className="border-y py-5" duration={42} />
    </div>
  );
}
