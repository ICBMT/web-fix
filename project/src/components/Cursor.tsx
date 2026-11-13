import { useEffect, useRef } from "react";

export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    document.documentElement.classList.add("no-cursor");

    const pos = { x: -100, y: -100 };
    const ring = { x: -100, y: -100, s: 1 };
    let targetScale = 1;
    let label = "";
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
    };

    const onOver = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest?.("[data-cursor]") as HTMLElement | null;
      if (el) {
        label = el.dataset.cursor || "";
        targetScale = label ? 3.2 : 1.8;
      } else {
        const link = (e.target as HTMLElement).closest?.("a, button");
        targetScale = link ? 1.7 : 1;
        label = "";
      }
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const d = dotRef.current;
      const r = ringRef.current;
      if (!d || !r) return;
      ring.x += (pos.x - ring.x) * 0.13;
      ring.y += (pos.y - ring.y) * 0.13;
      ring.s += (targetScale - ring.s) * 0.14;
      d.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%,-50%)`;
      r.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%,-50%) scale(${ring.s})`;
      if (labelRef.current) {
        if (labelRef.current.textContent !== label) labelRef.current.textContent = label;
        labelRef.current.style.opacity = label ? "1" : "0";
      }
      r.style.backgroundColor = label ? "#e95925" : "transparent";
      r.style.borderColor = label ? "transparent" : "rgba(237,234,224,0.75)";
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerover", onOver);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.documentElement.classList.remove("no-cursor");
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="pointer-events-none fixed left-0 top-0 z-[120] hidden h-1.5 w-1.5 rounded-full bg-gold md:block" style={{ background: "#e95925" }} />
      <div
        ref={ringRef}
        className="pointer-events-none fixed left-0 top-0 z-[119] hidden h-10 w-10 items-center justify-center rounded-full border mix-blend-difference md:flex"
        style={{ borderColor: "rgba(237,234,224,0.75)" }}
      >
        <span ref={labelRef} className="font-mono text-[7px] font-bold tracking-[0.18em] text-ink opacity-0 transition-opacity" style={{ fontFamily: "var(--font-mono)", color: "#0a0a0b" }}>
          VIEW
        </span>
      </div>
    </>
  );
}
