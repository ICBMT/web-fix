import { useEffect, useRef } from "react";
import { gsap } from "../lib/core";
import { GLB_URL, LOGO_WHITE } from "../lib/data";
import { LogoScene, preloadLogo } from "../three/logoScene";

export default function Loader({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pctRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const scene = new LogoScene(canvasRef.current!, GLB_URL, false);
    scene.setMode("autoplay");
    let alive = true;
    scene.init().catch((err) => console.warn("[Loader] 3D logo failed to initialise:", err));

    const start = performance.now();
    const MIN = 4300;
    // Never trap the visitor behind the loader: if the model or the fonts hang,
    // force completion after this long.
    const MAX = 12000;
    let glbP = 0;
    let glbDone = false;
    let fontsDone = false;
    let shown = 0;
    let raf = 0;

    preloadLogo(GLB_URL, (p) => {
      glbP = p;
    })
      .catch((err) => console.warn("[Loader] GLB failed to load:", err))
      .finally(() => {
        // The GLB is an inlined data: URL, which has no Content-Length, so the
        // loader never emits progress events. Mark it complete once resolved,
        // otherwise the bar plateaus at ~62% and never finishes.
        glbP = 1;
        glbDone = true;
      });
    document.fonts.ready
      .catch(() => {})
      .finally(() => {
        fontsDone = true;
      });

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      if (statusRef.current) statusRef.current.textContent = "SEQUENCE COMPLETE — WELCOME";
      const cols = rootRef.current!.querySelectorAll(".loader-col");
      const tl = gsap.timeline({
        onComplete: () => {
          if (alive) onDone();
        },
      });
      tl.to(contentRef.current, { opacity: 0, y: -40, duration: 0.55, ease: "power3.in" }, 0.25)
        .to(canvasRef.current, { scale: 1.25, opacity: 0, duration: 0.7, ease: "power3.in" }, 0.25)
        .to(cols, { yPercent: -101, duration: 0.9, ease: "expo.inOut", stagger: 0.055 }, 0.75);
    };

    const tick = () => {
      if (!alive) return;
      const elapsed = performance.now() - start;
      if (elapsed > MAX && (!glbDone || !fontsDone)) {
        console.warn("[Loader] timed out waiting for assets — continuing anyway");
        glbP = 1;
        glbDone = true;
        fontsDone = true;
      }
      const timeP = Math.min(1, elapsed / MIN);
      let target = timeP * 0.62 + glbP * 0.38;
      if (!glbDone || !fontsDone) target = Math.min(target, 0.93);
      shown += (target - shown) * 0.075;
      if (shown > 0.999 && glbDone && fontsDone) shown = 1;
      const pct = Math.floor(shown * 100);
      if (pctRef.current) pctRef.current.textContent = String(pct).padStart(3, "0");
      if (barRef.current) barRef.current.style.transform = `scaleX(${shown})`;
      if (statusRef.current && !doneRef.current) {
        statusRef.current.textContent =
          pct < 30 ? "ALLOCATING PIXEL FIELD" : pct < 60 ? "LINKING GEOMETRY" : pct < 90 ? "ASSEMBLING IDENTITY" : "FINALIZING BUILD";
      }
      if (shown >= 1 && glbDone && fontsDone) finish();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      scene.dispose();
    };
  }, [onDone]);

  return (
    <div ref={rootRef} className="theme-dark fixed inset-0 z-[100]">
      {/* wipe columns */}
      <div className="absolute inset-0 flex">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="loader-col h-full flex-1 bg-ink" style={{ borderRight: "1px solid rgba(var(--bone-rgb),0.04)" }} />
        ))}
      </div>

      <div ref={contentRef} className="absolute inset-0 flex flex-col justify-between p-6 md:p-10">
        <div className="flex items-start justify-between">
          <img src={LOGO_WHITE} alt="GreePixel" className="h-6 w-auto opacity-90" />
          <span className="label label-gold">BOOT SEQUENCE / 2.0</span>
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-[-30%]" style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(var(--gold-rgb),0.13), transparent 70%)" }} />
            <canvas ref={canvasRef} className="relative h-[min(64vw,340px)] w-[min(64vw,340px)]" />
          </div>
        </div>

        <div className="flex items-end justify-between gap-8">
          <div>
            <span ref={statusRef} className="label mb-4 block text-gold" style={{ color: "var(--color-gold)" }}>
              INITIALIZING
            </span>
            <div className="flex items-start leading-none">
              <div ref={pctRef} className="font-pixel text-[clamp(4rem,14vw,9rem)] leading-none text-bone" style={{ fontFamily: "var(--font-pixel)" }}>
                000
              </div>
              <span className="mt-2 ml-2 font-pixel text-xl text-gold" style={{ fontFamily: "var(--font-pixel)", color: "var(--color-gold)" }}>
                %
              </span>
            </div>
          </div>
          <div className="hidden text-right md:block">
            <span className="label block">31.5204° N — 74.3587° E</span>
            <span className="label mt-2 block">LAHORE / WORLDWIDE</span>
            <span className="label mt-2 block" style={{ color: "rgba(var(--gold-rgb),0.7)" }}>
              GLB · 23 ACTIONS · 4.56S
            </span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 h-px w-full bg-bone/10">
          <div ref={barRef} className="h-full w-full origin-left bg-gold" style={{ transform: "scaleX(0)", background: "var(--color-gold)" }} />
        </div>
      </div>
    </div>
  );
}
