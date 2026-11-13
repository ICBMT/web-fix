import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { gsap, ScrollTrigger, splitChars } from "../lib/core";
import { projectMeta, STUDIO_LABEL, type Project } from "../lib/data";
import { PixelVault } from "../three/pixelVault";

const GLYPHS = "▓▒░█▚▞▙▟#%&@$*+=<>/\\01";
const pad = (n: number) => String(n).padStart(2, "0");

/** Decode-style text swap: random glyphs resolve left → right. */
const scrambles = new WeakMap<HTMLElement, gsap.core.Tween>();
function scramble(el: HTMLElement | null, text: string, duration = 0.9) {
  if (!el) return;
  scrambles.get(el)?.kill();
  const state = { p: 0 };
  const tween = gsap.to(state, {
    p: 1,
    duration,
    ease: "power2.out",
    onUpdate: () => {
      const reveal = Math.floor(state.p * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        out += i < reveal || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
    },
    onComplete: () => {
      el.textContent = text;
    },
  });
  scrambles.set(el, tween);
}

export default function WorkHero({ ready, items }: { ready: boolean; items: Project[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vaultRef = useRef<PixelVault | null>(null);
  const barRef = useRef<HTMLSpanElement | null>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const catRef = useRef<HTMLSpanElement>(null);
  const idxRef = useRef<HTMLSpanElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
  const introDone = useRef(false);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const [active, setActive] = useState(0);
  const [fallback, setFallback] = useState(false);

  /* ---------- pixel vault lifecycle ---------- */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const section = sectionRef.current!;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let vault: PixelVault;
    try {
      vault = new PixelVault(canvas, {
        images: items.map((p) => p.img),
        reducedMotion,
        onChange: setActive,
        onProgress: (p) => {
          if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
        },
      });
    } catch (err) {
      console.warn("[WorkHero] WebGL unavailable, using static fallback", err);
      setFallback(true);
      return;
    }
    vaultRef.current = vault;
    // StrictMode / remount: if the page is already revealed, start immediately
    if (readyRef.current && introDone.current) vault.start();
    vault.init().catch((err) => {
      console.warn("[WorkHero] pixel vault failed", err);
      setFallback(true);
    });

    const io = new IntersectionObserver(([e]) => vault.setRunning(e.isIntersecting), { threshold: 0 });
    io.observe(section);

    const onMove = (e: PointerEvent) => {
      vault.pointer(e.clientX, e.clientY);
      if (coordRef.current) {
        const r = section.getBoundingClientRect();
        const x = Math.max(0, Math.round(e.clientX - r.left));
        const y = Math.max(0, Math.round(e.clientY - r.top));
        coordRef.current.textContent = `X ${String(x).padStart(4, "0")} · Y ${String(y).padStart(4, "0")}`;
      }
    };
    const onLeave = () => vault.leave();
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("button, a")) return;
      vault.shockwave(e.clientX, e.clientY);
      vault.advance();
    };
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    section.addEventListener("click", onClick);

    return () => {
      io.disconnect();
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      section.removeEventListener("click", onClick);
      vault.dispose();
      vaultRef.current = null;
    };
  }, [items]);

  /* ---------- intro, gated until the loader is gone ---------- */
  useEffect(() => {
    if (!ready || introDone.current) return;
    introDone.current = true;
    vaultRef.current?.start();

    const c1 = splitChars(sectionRef.current!.querySelector<HTMLElement>(".work-word-1")!);
    const c2 = splitChars(sectionRef.current!.querySelector<HTMLElement>(".work-word-2")!);
    gsap.set([...c1, ...c2], { yPercent: 115 });
    gsap.set(".work-meta", { opacity: 0, y: 16 });
    gsap.set(".vault-tick", { scaleY: 0 });
    gsap
      .timeline({ delay: 0.35 })
      .to(c1, { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.06 }, 0)
      .to(c2, { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.045 }, 0.15)
      .to(".work-meta", { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "power3.out" }, 0.8)
      .to(".vault-tick", { scaleY: 1, duration: 0.5, ease: "power3.out", stagger: 0.03 }, 1.0)
      .add(() => scramble(nameRef.current, items[0].name.toUpperCase(), 1.1), 1.0);
  }, [ready, items]);

  /* ---------- scroll: pixels scatter, type drifts ---------- */
  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => vaultRef.current?.setScatter(self.progress),
      });
      gsap.to(".vault-type", {
        yPercent: -22,
        opacity: 0.15,
        ease: "none",
        scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "bottom top", scrub: true },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  /* ---------- HUD swap on project change ---------- */
  useEffect(() => {
    const p = items[active];
    if (!p) return;
    if (idxRef.current) idxRef.current.textContent = pad(active + 1);
    if (introDone.current) scramble(nameRef.current, p.name.toUpperCase());
    scramble(catRef.current, `${p.cat} · ${STUDIO_LABEL[p.studio]} · ${projectMeta(p)}`.toUpperCase(), 0.7);
  }, [active, items]);

  const jump = useCallback((i: number) => vaultRef.current?.goTo(i), []);
  const current = items[active];

  return (
    <section ref={sectionRef} className="relative h-[100svh] min-h-[560px] overflow-hidden select-none" style={{ isolation: "isolate", background: "#0a0a0b" }}>
      {/* ---- the mosaic ---- */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      {fallback && current && (
        <img src={current.img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" aria-hidden />
      )}

      {/* readability: fade into the page at the top & bottom */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(to bottom, rgba(10,10,11,0.85) 0%, rgba(10,10,11,0) 22%, rgba(10,10,11,0) 62%, rgba(10,10,11,0.92) 100%)" }}
      />

      {/* HUD corners */}
      <div className="pointer-events-none absolute inset-4 md:inset-6">
        <span className="hud-corner left-0 top-0 border-l-2 border-t-2" />
        <span className="hud-corner right-0 top-0 border-r-2 border-t-2" />
        <span className="hud-corner bottom-0 left-0 border-b-2 border-l-2" />
        <span className="hud-corner bottom-0 right-0 border-b-2 border-r-2" />
      </div>

      <div className="pointer-events-none relative z-10 flex h-full flex-col justify-between px-6 pb-8 pt-24 md:px-10 md:pb-10 md:pt-28">
        {/* top meta */}
        <div className="work-meta flex items-center justify-between">
          <span className="label">GREEPIXEL® — WORK</span>
          <span className="label hidden md:block">PIXEL VAULT · {pad(items.length)} PROJECTS RENDERED LIVE</span>
          <span className="label label-gold">{items.length} CASES — 2021 → 2026</span>
        </div>

        {/* giant type — difference blend inverts over revealed pixels */}
        <div className="vault-type relative" style={{ mixBlendMode: "difference" }}>
          <h1 className="sr-only">GreePixel work archive</h1>
          <div aria-hidden>
            <div className="work-word-1 font-display text-[clamp(4.5rem,19vw,17rem)] leading-[0.8] text-bone">WORK</div>
            <div className="work-word-2 font-display text-right text-[clamp(4.5rem,19vw,17rem)] leading-[0.8] text-stroke">ARCHIVE</div>
          </div>
        </div>

        {/* bottom HUD */}
        <div>
          <div className="work-meta mb-5 grid items-end gap-6 md:grid-cols-12">
            <div className="md:col-span-7">
              <span className="label flex items-center gap-2">
                <span className="animate-pulse-glow inline-block h-1.5 w-1.5" style={{ background: "#e95925" }} />
                NOW SHOWING
                <span className="text-[11px]" style={{ fontFamily: "var(--font-pixel)", color: "#e95925" }}>
                  <span ref={idxRef}>01</span> / {pad(items.length)}
                </span>
              </span>
              <span ref={nameRef} className="font-display mt-2 block text-[clamp(2rem,5vw,4rem)] uppercase leading-[0.9] text-bone">
                {items[0]?.name.toUpperCase()}
              </span>
              <span ref={catRef} className="label mt-2 block" style={{ letterSpacing: "0.2em" }}>
                {items[0] ? `${items[0].cat} · ${STUDIO_LABEL[items[0].studio]}` : ""}
              </span>
            </div>
            <div className="hidden flex-col items-end gap-2 text-right md:col-span-5 md:flex">
              <span ref={coordRef} className="label" style={{ color: "rgba(237,234,224,0.75)" }}>
                X 0000 · Y 0000
              </span>
              <span className="label">MOVE TO REVEAL — CLICK TO SHUFFLE</span>
              <span className="label flex items-center gap-2">
                SCROLL <ArrowDown className="h-3.5 w-3.5 animate-bounce" style={{ color: "#e95925" }} />
              </span>
            </div>
          </div>

          {/* project ticks — click to jump */}
          <div className="pointer-events-auto flex h-6 items-end gap-[3px] md:gap-1">
            {items.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => jump(i)}
                aria-label={`Show ${p.name}`}
                title={p.name}
                className="vault-tick group relative h-full flex-1 origin-bottom"
              >
                <span
                  className="absolute bottom-0 left-0 h-[3px] w-full transition-all duration-300 group-hover:h-[6px]"
                  style={{ background: i === active ? "rgba(233,89,37,0.28)" : "rgba(237,234,224,0.16)" }}
                />
                {i === active && (
                  <span
                    ref={(el) => {
                      barRef.current = el;
                    }}
                    className="absolute bottom-0 left-0 h-[3px] w-full origin-left"
                    style={{ background: "#e95925", boxShadow: "0 0 10px rgba(233,89,37,0.8)", transform: "scaleX(0)" }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
