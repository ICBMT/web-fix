import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Flip } from "gsap/Flip";
import { gsap, ScrollTrigger } from "../lib/core";
import { CALENDLY_URL, CREDIT, PORTFOLIO_IDS, projectMeta, projects, STUDIO_LABEL, VIDEO_IDS, type Project } from "../lib/data";
import RollText from "../components/RollText";
import Footer from "../components/Footer";
import Marquee from "../components/Marquee";
import WorkHero from "../components/WorkHero";

gsap.registerPlugin(Flip);

const pad = (n: number) => String(n).padStart(2, "0");

/** Story order: alternates web / mobile / AI so neighbouring cards feel different. */
const STORY_ORDER = [
  "jalebi", "lairo", "startwise", "on-card", "ad-grants-pilot", "gcc-fitness", "shepherd",
  "mts-rescue", "kim-and-co", "xpatio", "the-incc", "find-a-doc", "hotcoin", "deltabook",
].filter((id) => PORTFOLIO_IDS.includes(id));
const STORIES: Project[] = STORY_ORDER.map((id) => projects.find((p) => p.id === id)!).filter(Boolean);

/** Shelves for the filter (same split as the GreeLogix portfolio). */
type Shelf = "all" | "ai" | "web" | "mobile";
const SHELVES: { id: Shelf; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ai", label: "AI UX" },
  { id: "web", label: "Web & SaaS" },
  { id: "mobile", label: "Mobile" },
];
const CATS: Record<string, Shelf[]> = {
  jalebi: ["web"], "ad-grants-pilot": ["ai", "web"], "on-card": ["mobile", "web"], "kim-and-co": ["web"],
  lairo: ["ai", "mobile"], "find-a-doc": ["mobile", "web"], shepherd: ["ai", "mobile"], deltabook: ["mobile"],
  xpatio: ["mobile"], hotcoin: ["mobile"], startwise: ["ai", "web"], "mts-rescue": ["web", "mobile"],
  "gcc-fitness": ["mobile", "web"], "the-incc": ["mobile", "web"],
};

/** Dark interludes between stories (only on the "All" shelf), keyed by story index. */
const INTERLUDES: Record<number, { big: string; small: string }> = {
  2: { big: "150+ products", small: "designed for founders and businesses across the US, UK, UAE and Australia — a few of them are the stories around this one." },
  6: { big: "4–8 weeks", small: "is the typical distance between a first call and a tested, developer-ready product design. Most of these stories started exactly there." },
};

/** Pixel Vault hero cycles every case — ordered so consecutive palettes contrast. */
const HERO_ITEMS: Project[] = [
  "jalebi", "hotcoin", "lairo", "on-card", "moosehead", "shepherd", "ad-grants-pilot", "xpatio",
  "startwise", "kim-and-co", "find-a-doc", "cob", "deltabook", "gcc-fitness", "the-incc", "mts-rescue",
]
  .map((id) => projects.find((p) => p.id === id))
  .filter((p): p is Project => Boolean(p));

/* ------------------------------------------------------------------ */
/* Story card (layout from the GreeLogix portfolio)                     */
/* ------------------------------------------------------------------ */
function StoryVisual({ p }: { p: Project }) {
  return (
    <div
      data-cursor="VIEW"
      className="story-visual theme-dark card-sheen relative aspect-[4/3] overflow-hidden rounded-[1.8rem] sm:aspect-[16/10] sm:rounded-[2.2rem]"
      style={{ boxShadow: "0 30px 80px -30px rgba(0,0,0,0.55)" }}
      aria-hidden
    >
      <div className="story-media absolute -inset-y-[7%] inset-x-0">
        <img src={p.img} alt="" loading="lazy" decoding="async" className="story-img h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.22,1,.36,1)] group-hover/visual:scale-[1.05]" />
      </div>
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent 50%, rgba(0,0,0,0.12))" }} />
      <span className="absolute left-5 top-5 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.26em] text-white/90 backdrop-blur-sm sm:left-6" style={{ background: "rgba(0,0,0,0.28)", fontFamily: "var(--font-mono)" }}>
        {p.industry}
      </span>
      {p.glyph && (
        <span className="animate-float-y pointer-events-none absolute -top-6 right-4 select-none font-display text-[8rem] leading-none text-white/10 sm:text-[11rem]">{p.glyph}</span>
      )}
      <span className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 sm:left-6 sm:right-6">
        <span className="font-display text-xl font-semibold text-white drop-shadow md:text-2xl">{p.name}</span>
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/75" style={{ fontFamily: "var(--font-mono)" }}>
          {p.kind}
        </span>
      </span>
    </div>
  );
}

function StoryCard({ p, index, open, onToggle, hidden }: { p: Project; index: number; open: boolean; onToggle: () => void; hidden: boolean }) {
  const flipped = index % 2 === 1;
  return (
    <article data-story={p.id} className="story-card relative border-t py-12 first:border-t-0 first:pt-4 sm:py-16 lg:py-20" style={{ borderColor: "rgba(var(--bone-rgb),0.1)", display: hidden ? "none" : undefined }}>
      <span aria-hidden className="pointer-events-none absolute -top-3 right-0 select-none font-display text-[6rem] leading-none sm:text-[9rem]" style={{ color: "rgba(var(--bone-rgb),0.05)" }}>
        {pad(index + 1)}
      </span>
      <div className="relative grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
        <div className={`group/visual lg:col-span-7 ${flipped ? "lg:order-2" : ""}`}>
          <StoryVisual p={p} />
        </div>
        <div className="lg:col-span-5">
          <p className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.24em] sm:text-[11px]" style={{ fontFamily: "var(--font-mono)", color: "rgba(var(--bone-rgb),0.65)" }} data-reveal>
            <span className="font-semibold text-gold">Story {pad(index + 1)}</span>
            <span aria-hidden>·</span>
            <span>{p.industry}</span>
          </p>
          <h3 className="mt-4 font-display text-4xl font-semibold leading-[0.98] tracking-tight text-bone min-[420px]:text-5xl xl:text-6xl" data-hx>
            {p.name}
          </h3>
          <p className="mt-2 font-display text-lg font-semibold text-gold" data-reveal>
            {p.cat}
          </p>
          <p className="mt-5 max-w-md leading-[1.8]" style={{ color: "rgba(var(--bone-rgb),0.68)" }} data-reveal>
            {p.desc}
          </p>
          {p.note && (
            <blockquote className="mt-6 max-w-md border-l-2 pl-4 italic leading-relaxed" style={{ borderColor: "var(--color-gold)", color: "rgba(var(--bone-rgb),0.82)" }} data-reveal>
              “{p.note}”
            </blockquote>
          )}

          {!!p.features?.length && (
            <div className="grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)]" style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }} aria-hidden={!open}>
              <div className="overflow-hidden">
                <p className="pt-7 text-[10px] uppercase tracking-[0.24em]" style={{ fontFamily: "var(--font-mono)", color: "rgba(var(--bone-rgb),0.5)" }}>
                  Inside the design
                </p>
                <ul className="mt-3 grid max-w-md gap-x-5 gap-y-2.5 sm:grid-cols-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-sm leading-snug" style={{ color: "rgba(var(--bone-rgb),0.78)" }}>
                      <span className="mt-0.5 shrink-0 text-gold">✦</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-2" data-reveal>
            {p.tags.map((t) => (
              <span key={t} className="story-chip rounded-full border px-3 py-1.5 text-[11px] transition-colors duration-300" style={{ borderColor: "rgba(var(--bone-rgb),0.16)", color: "rgba(var(--bone-rgb),0.72)", background: "rgba(var(--bone-rgb),0.035)" }}>
                {t}
              </span>
            ))}
          </div>

          {!!p.features?.length && (
            <button type="button" onClick={onToggle} aria-expanded={open} className="story-toggle group mt-8 inline-flex items-center gap-3 text-sm font-semibold text-bone" data-cursor-snap>
              <span
                className={`grid h-10 w-10 place-items-center rounded-full border transition-all duration-500 ${open ? "rotate-45 border-gold bg-gold text-white" : "group-hover:border-gold group-hover:text-gold"}`}
                style={open ? undefined : { borderColor: "rgba(var(--bone-rgb),0.22)" }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <RollText text={open ? "Close the story" : "Read the story"} />
              <span className="block h-px w-10 transition-all duration-500 group-hover:w-14 group-hover:bg-gold" style={{ background: "rgba(var(--bone-rgb),0.25)" }} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function Stories() {
  const [shelf, setShelf] = useState<Shelf>("all");
  const [openId, setOpenId] = useState<string | null>(STORIES[0]?.id ?? null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const shown = STORIES.filter((p) => shelf === "all" || CATS[p.id]?.includes(shelf));

  // GSAP Flip: capture every card, swap the shelf, then glide each card from its
  // old seat to its new one; cards joining the shelf rise in.
  const choose = (id: Shelf) => {
    if (id === shelf) return;
    flipState.current = Flip.getState(".story-card, .story-interlude");
    setShelf(id);
  };

  useLayoutEffect(() => {
    const state = flipState.current;
    if (!state) return;
    flipState.current = null;
    const tl = Flip.from(state, {
      targets: ".story-card, .story-interlude",
      duration: 0.75,
      ease: "power3.inOut",
      stagger: 0.04,
      absolute: true,
      scale: false,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 0.1 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.3 }),
      onComplete: () => ScrollTrigger.refresh(),
    });
    return () => {
      tl.kill();
    };
  }, [shelf]);

  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 540);
    return () => clearTimeout(t);
  }, [openId]);

  let visibleIndex = -1;

  return (
    <section className="relative px-6 pb-8 md:px-10" aria-label="Project stories">
      {/* sticky shelf picker, tucked under the nav */}
      <div className="sticky top-[84px] z-40 -mx-2 md:top-[96px]">
        <div className="story-shelf mx-auto flex max-w-[1500px] items-center gap-3 overflow-x-auto rounded-full px-2 py-2" role="tablist" aria-label="Filter projects">
          <span className="hidden shrink-0 items-center gap-2 pl-3 text-[10px] uppercase tracking-[0.24em] md:flex" style={{ fontFamily: "var(--font-mono)", color: "rgba(var(--bone-rgb),0.65)" }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
            Browse
          </span>
          <div className="flex gap-2">
            {SHELVES.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={shelf === f.id}
                onClick={() => choose(f.id)}
                className={`group shrink-0 rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all duration-300 ${shelf === f.id ? "story-shelf-on" : "border hover:border-gold hover:text-gold"}`}
                style={shelf === f.id ? undefined : { borderColor: "rgba(var(--bone-rgb),0.18)", color: "rgba(var(--bone-rgb),0.7)" }}
              >
                <RollText text={f.label} />
              </button>
            ))}
          </div>
          <span className="ml-auto shrink-0 pr-4 text-[11px] uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-mono)", color: "rgba(var(--bone-rgb),0.65)" }} aria-live="polite">
            {shown.length} {shown.length === 1 ? "story" : "stories"}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-wrap items-end justify-between gap-5 pt-14 sm:pt-20">
          <div className="overflow-hidden">
            <h2 className="reveal-line block font-display text-[clamp(2rem,5.4vw,4.6rem)] uppercase leading-[0.92]" data-hx>
              Selected <span className="text-gold">stories</span>
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed" style={{ color: "rgba(var(--bone-rgb),0.6)" }} data-reveal>
            A curated selection of UI/UX design work across SaaS, AI, mobile and web. Open a story to see the design decisions inside.
          </p>
        </div>

        <div>
          {STORIES.map((p, i) => {
            const isShown = shelf === "all" || !!CATS[p.id]?.includes(shelf);
            if (isShown) visibleIndex++;
            const idx = visibleIndex;
            const inter = INTERLUDES[i];
            return (
              <div key={p.id}>
                <StoryCard p={p} index={isShown ? idx : i} open={openId === p.id} onToggle={() => setOpenId(openId === p.id ? null : p.id)} hidden={!isShown} />
                {inter && (
                  <aside
                    className="story-interlude theme-dark spot-card relative my-4 grid items-center gap-6 overflow-hidden rounded-[2rem] px-7 py-10 sm:p-12 md:grid-cols-[auto_1fr]"
                    style={{ background: "var(--color-coal)", display: shelf === "all" ? undefined : "none", border: "1px solid rgba(var(--bone-rgb),0.08)" }}
                    data-reveal
                  >
                    <span aria-hidden className="animate-spin-slow pointer-events-none absolute -bottom-14 -right-8 select-none font-display text-[10rem] leading-none text-white/[0.05]">
                      ✦
                    </span>
                    <p className="relative whitespace-nowrap font-display text-4xl font-semibold text-gold sm:text-5xl lg:text-6xl">{inter.big}</p>
                    <p className="relative max-w-md leading-[1.8] text-bone/70">{inter.small}</p>
                  </aside>
                )}
              </div>
            );
          })}
        </div>

        {shown.length === 0 && <p className="py-24 text-center" style={{ color: "rgba(var(--bone-rgb),0.65)" }}>No stories here yet — try another shelf.</p>}
        <p className="py-14 text-center text-[11px] uppercase tracking-[0.28em]" style={{ fontFamily: "var(--font-mono)", color: "rgba(var(--bone-rgb),0.45)" }}>
          — plus 130+ more product designs under NDA —
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Video card (unchanged look) — motion work, created by GreePixel      */
/* ------------------------------------------------------------------ */
function WorkCard({ p, i }: { p: Project; i: number }) {
  const vidRef = useRef<HTMLVideoElement>(null);

  return (
    <a
      {...(p.url ? { href: p.url, target: "_blank", rel: "noreferrer" } : {})}
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
      <div className="theme-dark card-sheen relative overflow-hidden" style={{ aspectRatio: "16/10" }}>
        <div className="work-media absolute -inset-y-[8%] inset-x-0">
          {p.video ? (
            <video ref={vidRef} src={p.video} poster={p.img} muted loop playsInline preload="none" className="h-full w-full object-cover" />
          ) : (
            <img src={p.img} alt={`${p.name} — ${p.cat} by GreePixel`} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
          )}
        </div>
        <div
          className="absolute inset-0 flex items-end justify-between p-4 opacity-0 transition-opacity duration-400 group-hover:opacity-100 md:p-5"
          style={{ background: "linear-gradient(to top, rgba(var(--ink-rgb),0.72), rgba(var(--ink-rgb),0.08) 55%, rgba(var(--ink-rgb),0.25))" }}
        >
          <span className="font-pixel text-[10px]" style={{ fontFamily: "var(--font-pixel)", color: "var(--color-gold)" }}>
            {p.video ? "HOVER TO PLAY ▶" : "OPEN CASE ↗"}
          </span>
          <span className="label">{projectMeta(p)}</span>
        </div>
        <span className="label absolute left-4 top-4 border border-bone/25 bg-ink/55 px-2 py-1 backdrop-blur-sm" style={{ background: "rgba(var(--ink-rgb),0.5)", fontSize: "9px" }}>
          {p.credit ? CREDIT.toUpperCase() : STUDIO_LABEL[p.studio]}
        </span>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[10px]" style={{ fontFamily: "var(--font-mono)", color: "var(--color-gold)" }}>
            [{pad(i)}]
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

function MotionVault() {
  const items = VIDEO_IDS.filter((id) => id !== "moosehead").map((id) => projects.find((p) => p.id === id)!).filter(Boolean);
  if (!items.length) return null;
  return (
    <section className="relative overflow-hidden px-6 py-20 md:px-10 md:py-28">
      <div className="pointer-events-none absolute -right-6 top-6 select-none font-display text-[24vw] leading-none text-stroke opacity-[0.07] md:text-[18vw]">MOTION</div>
      <div className="mb-12 flex flex-wrap items-end justify-between gap-4 md:mb-16">
        <div className="overflow-hidden">
          <h2 className="reveal-line block font-display text-[clamp(2rem,5.4vw,4.6rem)] uppercase leading-[0.9]" data-hx>
            Motion vault
          </h2>
        </div>
        <span className="label label-gold" data-reveal>
          [{CREDIT.toUpperCase()}]
        </span>
      </div>
      <div className="grid items-end gap-10 md:grid-cols-12 md:gap-12">
        {items.map((p) => (
          <div key={p.id} className="md:col-span-7">
            <WorkCard p={p} i={STORIES.length + 2} />
          </div>
        ))}
        <div className="md:col-span-5" data-reveal>
          <p className="label label-gold">Motion · WebGL · Art direction</p>
          <p className="mt-4 max-w-md text-lg leading-[1.7]" style={{ color: "rgba(var(--bone-rgb),0.72)" }}>
            Brand worlds that move — interaction design, real-time WebGL scenes and launch sites. Hover the frame to play it.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.2em]" style={{ fontFamily: "var(--font-mono)", borderColor: "rgba(var(--gold-rgb),0.45)", color: "var(--color-gold)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            {CREDIT}
          </p>
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

      // story visuals: cinematic wipe-in once, then a gentle inner parallax (transform only)
      gsap.utils.toArray<HTMLElement>(".story-visual").forEach((vis) => {
        const media = vis.querySelector(".story-media");
        const img = vis.querySelector(".story-img");
        gsap.fromTo(
          vis,
          { clipPath: "inset(12% 8% 12% 8% round 2.2rem)", opacity: 0.2 },
          { clipPath: "inset(0% 0% 0% 0% round 2.2rem)", opacity: 1, duration: 1.25, ease: "expo.out", clearProps: "clipPath", scrollTrigger: { trigger: vis, start: "top 88%" } }
        );
        if (img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.6, ease: "expo.out", clearProps: "transform", scrollTrigger: { trigger: vis, start: "top 88%" } });
        if (media)
          gsap.fromTo(media, { y: 0, yPercent: -4 }, { yPercent: 4, ease: "none", scrollTrigger: { trigger: vis, start: "top bottom", end: "bottom top", scrub: true } });
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
      if (Math.abs(current) < 0.001 && Math.abs(target) < 0.001) {
        if (current !== 0) skewSet((current = 0)); // settle once, then stop touching styles
        return;
      }
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

      <Marquee items={["UX RESEARCH", "UI DESIGN", "SAAS DASHBOARDS", "MOBILE APP DESIGN", "DESIGN SYSTEMS", "PROTOTYPING"]} className="border-y py-5" textClass="label !text-[11px]" duration={26} />

      {/* ---------- FEATURED ---------- */}
      <section className="featured-wrap px-6 py-20 md:px-10 md:py-28">
        <div className="mb-8 flex items-end justify-between">
          <span className="label label-gold" data-scramble>[00] — FEATURED CASE</span>
          <span className="label hidden md:block">{projects.some((p) => p.video) ? "HOVER-TO-PLAY BELOW" : "HOVER TO EXPLORE BELOW"}</span>
        </div>
        <a {...(moosehead.url ? { href: moosehead.url, target: "_blank", rel: "noreferrer" } : {})} data-cursor={moosehead.video ? "PLAY" : "VIEW"} className="group relative block overflow-hidden">
          <div className="theme-dark card-sheen relative" style={{ aspectRatio: "16/9" }}>
            <div ref={heroMediaRef} className="h-full w-full">
              {moosehead.video ? (
                <video ref={heroVidRef} src={moosehead.video} poster={moosehead.img} muted loop playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : (
                <img src={moosehead.img} alt={`${moosehead.name} — ${moosehead.cat} by GreePixel`} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(var(--ink-rgb),0.78), rgba(var(--ink-rgb),0.12) 45%, rgba(var(--ink-rgb),0.25))" }} />
            <div className="absolute left-0 top-0 flex w-full items-center justify-between p-5 md:p-7">
              <span className="label border border-bone/25 px-2 py-1 backdrop-blur-sm" style={{ background: "rgba(var(--ink-rgb),0.5)", fontSize: "9px" }}>
                {moosehead.credit ? CREDIT.toUpperCase() : STUDIO_LABEL[moosehead.studio]} — {moosehead.year}
              </span>
              <span className="label label-gold">E-COMMERCE UX / MOTION DESIGN</span>
            </div>
            <div className="absolute bottom-0 left-0 flex w-full items-end justify-between p-5 md:p-7">
              <div>
                <h2 className="font-display text-[clamp(2.6rem,8vw,7rem)] uppercase leading-[0.85]" data-hx>
                  {moosehead.name}
                </h2>
                <p className="label mt-3 max-w-md" style={{ letterSpacing: "0.16em" }}>
                  AHEAD OF THE ALES — A FULL-FUNNEL E-COMMERCE EXPERIENCE, DESIGNED END TO END
                </p>
              </div>
              <ArrowUpRight className="mb-2 h-8 w-8 text-bone/60 transition-all duration-500 group-hover:-translate-y-2 group-hover:translate-x-2 group-hover:text-gold" />
            </div>
          </div>
        </a>
      </section>

      {/* ---------- STORIES (GreeLogix portfolio layout) ---------- */}
      <Stories />

      <Marquee items={["PARIS", "DUBAI", "MONTREAL", "LAHORE", "WORLDWIDE"]} className="border-y py-5" textClass="font-display text-3xl md:text-5xl uppercase" duration={30} reverse />

      {/* ---------- MOTION (video work) ---------- */}
      <MotionVault />

      {/* ---------- NFO ---------- */}
      <section className="border-t px-6 py-20 text-center md:py-28" style={{ borderColor: "rgba(var(--bone-rgb),0.09)" }}>
        <span className="label label-gold" data-scramble>[END OF VAULT]</span>
        <p className="font-display mx-auto mt-6 max-w-4xl text-[clamp(1.6rem,3.6vw,3.2rem)] uppercase leading-[1.05]" data-hx>
          Every pixel above was designed to ship. <span className="text-stroke">Yours could be next.</span>
        </p>
        <a
          href={CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-cursor="BOOK A CALL"
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
