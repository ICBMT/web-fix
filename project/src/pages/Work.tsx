import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { gsap, ScrollTrigger, splitChars } from "../lib/core";
import { projects, type Project } from "../lib/data";
import Footer from "../components/Footer";
import Marquee from "../components/Marquee";

const externalLinks: Record<string, string> = {
  moosehead: "https://mill3.studio/en/projects/moosehead/",
  cob: "https://cobfoods.com/",
  gsoft: "https://mill3.studio/en/projects/gsoft/",
  ventriloc: "https://mill3.studio/en/projects/ventriloc/",
  amourliquide: "https://mill3.studio/en/projects/amour-liquide/",
  basehabitation: "https://mill3.studio/en/projects/",
  difc: "https://studiomirage.io/works/difc",
  margiela: "https://studiomirage.io/works/margiela",
  renault: "https://studiomirage.io/works/renault-trucks",
  omnicell: "https://studiomirage.io/works/omnicell-explorer",
  ubisoft: "https://studiomirage.io/works/ubisoft",
  tasmim: "https://studiomirage.io/works/tasmim",
  sopra: "https://studiomirage.io/works/sopra-banking",
  caisse: "https://studiomirage.io/works/caisse-des-depots",
  jinns: "https://studiomirage.io/works/jinns",
  biotherm: "https://studiomirage.io/works/biotherm",
};

const aspects = ["16/10", "4/5", "16/11", "1/1", "16/9", "4/5"];

function WorkCard({ p, i }: { p: Project; i: number }) {
  const vidRef = useRef<HTMLVideoElement>(null);
  const aspect = aspects[i % aspects.length];

  return (
    <a
      href={externalLinks[p.id] || "#"}
      target="_blank"
      rel="noreferrer"
      data-cursor={p.video ? "PLAY" : "VIEW"}
      className="work-card group block"
      onMouseEnter={() => vidRef.current?.play().catch(() => {})}
      onMouseLeave={() => {
        if (vidRef.current) {
          vidRef.current.pause();
          vidRef.current.currentTime = 0;
        }
      }}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: aspect }}>
        <div className="work-media absolute -inset-y-[8%] inset-x-0">
          {p.video ? (
            <video ref={vidRef} src={p.video} poster={p.img} muted loop playsInline preload="none" className="h-full w-full object-cover" />
          ) : (
            <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
          )}
        </div>
        <div
          className="absolute inset-0 flex items-end justify-between p-4 opacity-0 transition-opacity duration-400 group-hover:opacity-100 md:p-5"
          style={{ background: "linear-gradient(to top, rgba(10,10,11,0.72), rgba(10,10,11,0.08) 55%, rgba(10,10,11,0.25))" }}
        >
          <span className="font-pixel text-[10px]" style={{ fontFamily: "var(--font-pixel)", color: "#e95925" }}>
            OPEN CASE ↗
          </span>
          <span className="label">{p.year}</span>
        </div>
        <span className="label absolute left-4 top-4 border border-bone/25 bg-ink/55 px-2 py-1 backdrop-blur-sm" style={{ background: "rgba(10,10,11,0.5)", fontSize: "9px" }}>
          {p.studio === "MILL3" ? "MILL3®" : "MIRAGE®"}
        </span>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px]" style={{ fontFamily: "var(--font-mono)", color: "#e95925" }}>
            [{String(i + 1).padStart(2, "0")}]
          </span>
          <h3 className="font-display text-xl uppercase leading-none text-bone transition-colors duration-300 group-hover:text-gold md:text-2xl">{p.name}</h3>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-bone/40 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-gold" />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-4 pl-10">
        <span className="label" style={{ letterSpacing: "0.18em" }}>
          {p.cat}
        </span>
        <span className="label hidden sm:block" style={{ letterSpacing: "0.14em" }}>
          {p.tags.join(" · ")}
        </span>
      </div>
    </a>
  );
}

function Vault({ title, ids, startIndex, ghost }: { title: string; ids: string[]; startIndex: number; ghost: string }) {
  const items = ids.map((id) => projects.find((p) => p.id === id)!).filter(Boolean);
  const colA = items.filter((_, i) => i % 2 === 0);
  const colB = items.filter((_, i) => i % 2 === 1);

  return (
    <section className="relative overflow-hidden px-6 py-20 md:px-10 md:py-28">
      <div className="pointer-events-none absolute -right-6 top-6 select-none font-display text-[24vw] leading-none text-stroke opacity-[0.07] md:text-[18vw]">{ghost}</div>
      <div className="mb-12 flex flex-wrap items-end justify-between gap-4 md:mb-16">
        <div className="overflow-hidden">
          <h2 className="reveal-line font-display block text-[clamp(2rem,5.4vw,4.6rem)] uppercase leading-[0.9]">{title}</h2>
        </div>
        <span className="label">[{String(items.length).padStart(2, "0")} CASES]</span>
      </div>
      <div className="grid gap-x-6 gap-y-16 md:grid-cols-2 md:gap-y-24">
        <div className="flex flex-col gap-16 md:gap-24">
          {colA.map((p) => (
            <WorkCard key={p.id} p={p} i={startIndex + ids.indexOf(p.id)} />
          ))}
        </div>
        <div className="flex flex-col gap-16 md:mt-36 md:gap-24">
          {colB.map((p) => (
            <WorkCard key={p.id} p={p} i={startIndex + ids.indexOf(p.id)} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Work({ ready, onNavigate }: { ready: boolean; onNavigate: (r: string) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroVidRef = useRef<HTMLVideoElement>(null);
  const heroMediaRef = useRef<HTMLDivElement>(null);
  const introDone = useRef(false);

  /* ---------- hero intro, gated until loader finished ---------- */
  useEffect(() => {
    if (!ready || introDone.current) return;
    introDone.current = true;
    const c1 = splitChars(document.querySelector<HTMLElement>(".work-word-1")!);
    const c2 = splitChars(document.querySelector<HTMLElement>(".work-word-2")!);
    gsap.set([...c1, ...c2], { yPercent: 115 });
    gsap.set(".work-meta", { opacity: 0, y: 16 });
    gsap
      .timeline({ delay: 0.25 })
      .to(c1, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.06 }, 0)
      .to(c2, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.045 }, 0.15)
      .to(".work-meta", { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "power3.out" }, 0.7);
  }, [ready]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // card reveals + inner media parallax
      gsap.utils.toArray<HTMLElement>(".work-card").forEach((card) => {
        gsap.fromTo(card, { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 92%" } });
        const media = card.querySelector(".work-media");
        if (media) {
          gsap.fromTo(
            media,
            { yPercent: -5 },
            { yPercent: 5, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true } }
          );
        }
      });

      gsap.utils.toArray<HTMLElement>(".reveal-line").forEach((el) => {
        gsap.fromTo(el, { yPercent: 120 }, { yPercent: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 94%" } });
      });

      // hero video subtle zoom out on scroll
      if (heroMediaRef.current) {
        gsap.fromTo(
          heroMediaRef.current,
          { scale: 1.12 },
          { scale: 1, ease: "none", scrollTrigger: { trigger: ".featured-wrap", start: "top bottom", end: "bottom top", scrub: true } }
        );
      }

    }, rootRef);

    // velocity skew on the archive grid (own ticker, scoped cleanup)
    const skewSet = gsap.quickSetter(".work-card", "skewY", "deg");
    const clampSkew = gsap.utils.clamp(-2.4, 2.4);
    let target = 0;
    let current = 0;
    let lastY = window.scrollY;
    let lastT = performance.now();
    const skewLoop = () => {
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      const y = window.scrollY;
      if (dt > 0) target = clampSkew(((y - lastY) / dt) * 0.0045);
      lastY = y;
      current += (target - current) * 0.08;
      target *= 0.92;
      skewSet(current);
    };
    gsap.ticker.add(skewLoop);

    // autoplay hero video when visible
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) heroVidRef.current?.play().catch(() => {});
        else heroVidRef.current?.pause();
      },
      { threshold: 0.25 }
    );
    if (heroVidRef.current) io.observe(heroVidRef.current);

    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => {
      ctx.revert();
      io.disconnect();
      gsap.ticker.remove(skewLoop);
      gsap.set(".work-card", { skewY: 0 });
    };
  }, []);

  const moosehead = projects.find((p) => p.id === "moosehead")!;

  return (
    <div ref={rootRef} className="relative" style={{ background: "#0a0a0b" }}>
      {/* ---------- HERO ---------- */}
      <section className="relative flex h-[92svh] flex-col justify-between overflow-hidden px-6 pb-10 pt-28 md:px-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 opacity-[0.5]" style={{ background: "radial-gradient(60% 50% at 50% 38%, rgba(233,89,37,0.09), transparent 70%)" }} />
          {/* pixel decorations */}
          {[
            ["12%", "30%"],
            ["78%", "22%"],
            ["86%", "64%"],
            ["6%", "70%"],
          ].map(([x, y], i) => (
            <span key={i} className="absolute h-2 w-2" style={{ left: x, top: y, background: i % 2 ? "rgba(237,234,224,0.3)" : "#e95925" }} />
          ))}
        </div>

        <div className="work-meta flex items-center justify-between">
          <span className="label">GREEPIXEL® — VAULT</span>
          <span className="label hidden md:block">MILL3 (MTL) × STUDIO MIRAGE (PAR / DXB)</span>
          <span className="label label-gold">16 CASES — 2021 → 2026</span>
        </div>

        <div className="relative">
          <h1 className="sr-only">GreePixel work archive</h1>
          <div aria-hidden>
            <div className="work-word-1 font-display text-[clamp(4.5rem,19vw,17rem)] leading-[0.8] text-bone">WORK</div>
            <div className="work-word-2 font-display text-right text-[clamp(4.5rem,19vw,17rem)] leading-[0.8] text-stroke">ARCHIVE</div>
          </div>
        </div>

        <div className="work-meta flex items-center justify-between">
          <p className="max-w-sm text-sm leading-relaxed text-bone/60">
            Sixteen case studies recovered from the vaults of the two studios that forged GreePixel — web experiences, real-time 3D and live-event worlds.
          </p>
          <span className="label flex items-center gap-2">
            SCROLL <ArrowDown className="h-3.5 w-3.5 animate-bounce" style={{ color: "#e95925" }} />
          </span>
        </div>
      </section>

      <Marquee items={["IMMERSIVE 3D", "REAL-TIME WORLDS", "LIVE EVENTS", "E-COMMERCE", "MOTION & CRAFT"]} className="border-y py-5" textClass="label !text-[11px]" duration={26} />

      {/* ---------- FEATURED ---------- */}
      <section className="featured-wrap px-6 py-20 md:px-10 md:py-28">
        <div className="mb-8 flex items-end justify-between">
          <span className="label label-gold">[00] — FEATURED CASE</span>
          <span className="label hidden md:block">{projects.some((p) => p.video) ? "HOVER-TO-PLAY BELOW" : "HOVER TO EXPLORE BELOW"}</span>
        </div>
        <a href={externalLinks.moosehead} target="_blank" rel="noreferrer" data-cursor={moosehead.video ? "PLAY" : "VIEW"} className="group relative block overflow-hidden">
          <div className="relative" style={{ aspectRatio: "16/9" }}>
            <div ref={heroMediaRef} className="h-full w-full">
              {moosehead.video ? (
                <video ref={heroVidRef} src={moosehead.video} poster={moosehead.img} muted loop playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : (
                <img src={moosehead.img} alt={moosehead.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,10,11,0.78), rgba(10,10,11,0.12) 45%, rgba(10,10,11,0.25))" }} />
            <div className="absolute left-0 top-0 flex w-full items-center justify-between p-5 md:p-7">
              <span className="label border border-bone/25 px-2 py-1 backdrop-blur-sm" style={{ background: "rgba(10,10,11,0.5)", fontSize: "9px" }}>
                MILL3® — 2023
              </span>
              <span className="label label-gold">E-COMMERCE / SHOPIFY / MOTION</span>
            </div>
            <div className="absolute bottom-0 left-0 flex w-full items-end justify-between p-5 md:p-7">
              <div>
                <h2 className="font-display text-[clamp(2.6rem,8vw,7rem)] uppercase leading-[0.85]">{moosehead.name}</h2>
                <p className="label mt-3 max-w-md" style={{ letterSpacing: "0.16em" }}>
                  AHEAD OF THE ALES — A FULL-FUNNEL BREW E-COMMERCE UNIVERSE
                </p>
              </div>
              <ArrowUpRight className="mb-2 h-8 w-8 text-bone/60 transition-all duration-500 group-hover:-translate-y-2 group-hover:translate-x-2 group-hover:text-gold" />
            </div>
          </div>
        </a>
      </section>

      {/* ---------- VAULTS ---------- */}
      <Vault title="VAULT 01 — MILL3® MONTREAL" ghost="MILL3" ids={["gsoft", "cob", "ventriloc", "amourliquide", "basehabitation"]} startIndex={1} />

      <Marquee items={["PARIS", "DUBAI", "MONTREAL", "LAHORE", "WORLDWIDE"]} className="border-y py-5" textClass="font-display text-3xl md:text-5xl uppercase" duration={30} reverse />

      <Vault title="VAULT 02 — STUDIO MIRAGE® PARIS/DUBAI" ghost="MIRAGE" ids={["difc", "margiela", "renault", "omnicell", "ubisoft", "tasmim", "sopra", "caisse", "jinns", "biotherm"]} startIndex={6} />

      {/* ---------- NFO ---------- */}
      <section className="border-t px-6 py-20 text-center md:py-28" style={{ borderColor: "rgba(237,234,224,0.09)" }}>
        <span className="label label-gold">[END OF VAULT]</span>
        <p className="font-display mx-auto mt-6 max-w-4xl text-[clamp(1.6rem,3.6vw,3.2rem)] uppercase leading-[1.05]">
          Every pixel above shipped to production. <span className="text-stroke">Yours could be next.</span>
        </p>
        <a
          href="mailto:hello@greepixel.com"
          data-cursor="SAY HI"
          data-magnetic
          className="mt-10 inline-flex items-center gap-3 border px-8 py-4 font-mono text-xs tracking-[0.24em] transition-colors"
          style={{
            borderColor: "#e95925",
            color: "#e95925",
            fontFamily: "var(--font-mono)",
          }}
        >
          START A PROJECT <ArrowUpRight className="h-4 w-4" />
        </a>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
