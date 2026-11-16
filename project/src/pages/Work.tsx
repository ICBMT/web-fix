import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { gsap, ScrollTrigger } from "../lib/core";
import { ARCHIVE_IDS, PORTFOLIO_IDS, projectMeta, projects, STUDIO_LABEL, type Project } from "../lib/data";
import RollText from "../components/RollText";
import Footer from "../components/Footer";
import Marquee from "../components/Marquee";
import WorkHero from "../components/WorkHero";

const aspects = ["16/10", "4/5", "16/11", "1/1", "16/9", "4/5"];

/** Card order tuned so portrait shots (Lairo, Xpatio, Sopra) land on tall 4/5 slots. */
const PORTFOLIO_ORDER = ["lairo", "jalebi", "on-card", "ad-grants-pilot", "xpatio", "kim-and-co", "find-a-doc", "shepherd", "hotcoin", "deltabook"].filter((id) =>
  PORTFOLIO_IDS.includes(id)
);
const ARCHIVE_ORDER = ["sopra", "cob", "caisse", "jinns", "biotherm"].filter((id) => ARCHIVE_IDS.includes(id));

/** Pixel Vault hero cycles every case — ordered so consecutive palettes contrast. */
const HERO_ITEMS: Project[] = [
  "jalebi", "hotcoin", "lairo", "on-card", "moosehead", "shepherd", "ad-grants-pilot", "xpatio",
  "sopra", "kim-and-co", "find-a-doc", "cob", "deltabook", "caisse", "jinns", "biotherm",
]
  .map((id) => projects.find((p) => p.id === id))
  .filter((p): p is Project => Boolean(p));

function WorkCard({ p, i }: { p: Project; i: number }) {
  const vidRef = useRef<HTMLVideoElement>(null);
  const aspect = aspects[i % aspects.length];

  return (
    <a
      href={p.url || "#"}
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
      <div className="theme-dark card-sheen relative overflow-hidden" style={{ aspectRatio: aspect }}>
        <div className="work-media absolute -inset-y-[8%] inset-x-0">
          {p.video ? (
            <video ref={vidRef} src={p.video} poster={p.img} muted loop playsInline preload="none" className="h-full w-full object-cover" />
          ) : (
            <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
          )}
        </div>
        <div
          className="absolute inset-0 flex items-end justify-between p-4 opacity-0 transition-opacity duration-400 group-hover:opacity-100 md:p-5"
          style={{ background: "linear-gradient(to top, rgba(var(--ink-rgb),0.72), rgba(var(--ink-rgb),0.08) 55%, rgba(var(--ink-rgb),0.25))" }}
        >
          <span className="font-pixel text-[10px]" style={{ fontFamily: "var(--font-pixel)", color: "var(--color-gold)" }}>
            OPEN CASE ↗
          </span>
          <span className="label">{projectMeta(p)}</span>
        </div>
        <span className="label absolute left-4 top-4 border border-bone/25 bg-ink/55 px-2 py-1 backdrop-blur-sm" style={{ background: "rgba(var(--ink-rgb),0.5)", fontSize: "9px" }}>
          {STUDIO_LABEL[p.studio]}
        </span>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px]" style={{ fontFamily: "var(--font-mono)", color: "var(--color-gold)" }}>
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
          <h2 className="reveal-line font-display block text-[clamp(2rem,5.4vw,4.6rem)] uppercase leading-[0.9]" data-hx>
            {title}
          </h2>
        </div>
        <span className="label" data-reveal>[{String(items.length).padStart(2, "0")} CASES]</span>
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
    <div ref={rootRef} className="relative" style={{ background: "var(--color-ink)" }}>
      {/* ---------- HERO — Pixel Vault ---------- */}
      <WorkHero ready={ready} items={HERO_ITEMS} />

      <Marquee items={["AI PRODUCTS", "SAAS PLATFORMS", "MOBILE APPS", "IMMERSIVE 3D", "LIVE EVENTS"]} className="border-y py-5" textClass="label !text-[11px]" duration={26} />

      {/* ---------- FEATURED ---------- */}
      <section className="featured-wrap px-6 py-20 md:px-10 md:py-28">
        <div className="mb-8 flex items-end justify-between">
          <span className="label label-gold" data-scramble>[00] — FEATURED CASE</span>
          <span className="label hidden md:block">{projects.some((p) => p.video) ? "HOVER-TO-PLAY BELOW" : "HOVER TO EXPLORE BELOW"}</span>
        </div>
        <a href={moosehead.url} target="_blank" rel="noreferrer" data-cursor={moosehead.video ? "PLAY" : "VIEW"} className="group relative block overflow-hidden">
          <div className="theme-dark card-sheen relative" style={{ aspectRatio: "16/9" }}>
            <div ref={heroMediaRef} className="h-full w-full">
              {moosehead.video ? (
                <video ref={heroVidRef} src={moosehead.video} poster={moosehead.img} muted loop playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : (
                <img src={moosehead.img} alt={moosehead.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(var(--ink-rgb),0.78), rgba(var(--ink-rgb),0.12) 45%, rgba(var(--ink-rgb),0.25))" }} />
            <div className="absolute left-0 top-0 flex w-full items-center justify-between p-5 md:p-7">
              <span className="label border border-bone/25 px-2 py-1 backdrop-blur-sm" style={{ background: "rgba(var(--ink-rgb),0.5)", fontSize: "9px" }}>
                MILL3® — 2023
              </span>
              <span className="label label-gold">E-COMMERCE / SHOPIFY / MOTION</span>
            </div>
            <div className="absolute bottom-0 left-0 flex w-full items-end justify-between p-5 md:p-7">
              <div>
                <h2 className="font-display text-[clamp(2.6rem,8vw,7rem)] uppercase leading-[0.85]" data-hx>
                  {moosehead.name}
                </h2>
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
      <Vault title="VAULT 01 — GREEPIXEL® PORTFOLIO" ghost="PIXEL" ids={PORTFOLIO_ORDER} startIndex={1} />

      <Marquee items={["PARIS", "DUBAI", "MONTREAL", "LAHORE", "WORLDWIDE"]} className="border-y py-5" textClass="font-display text-3xl md:text-5xl uppercase" duration={30} reverse />

      <Vault title="VAULT 02 — MILL3® × STUDIO MIRAGE® ARCHIVE" ghost="ARCHIVE" ids={ARCHIVE_ORDER} startIndex={1 + PORTFOLIO_ORDER.length} />

      {/* ---------- NFO ---------- */}
      <section className="border-t px-6 py-20 text-center md:py-28" style={{ borderColor: "rgba(var(--bone-rgb),0.09)" }}>
        <span className="label label-gold" data-scramble>[END OF VAULT]</span>
        <p className="font-display mx-auto mt-6 max-w-4xl text-[clamp(1.6rem,3.6vw,3.2rem)] uppercase leading-[1.05]" data-hx>
          Every pixel above shipped to production. <span className="text-stroke">Yours could be next.</span>
        </p>
        <a
          href="mailto:hello@greepixel.com"
          data-cursor="SAY HI"
          data-magnetic
          className="group mt-10 inline-flex items-center gap-3 rounded-full border px-8 py-4 font-mono text-xs tracking-[0.24em] transition-colors"
          style={{
            borderColor: "var(--color-gold)",
            color: "var(--color-gold)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <RollText text="START A PROJECT" /> <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
        </a>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
