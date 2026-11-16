import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUpRight, Move, Play } from "lucide-react";
import { gsap, ScrollTrigger } from "../lib/core";
import { LAB, SERVICE_PREVIEWS } from "../lib/assets";
import { CALENDLY_URL, chapters, GLB_URL, projectMeta, projects, services, stats, STUDIO_LABEL, type Project } from "../lib/data";
import { defaultPose, logoPose, LogoScene, resetPose } from "../three/logoScene";
import Footer from "../components/Footer";
import ToolsStrip from "../components/ToolsStrip";
import { getTheme, onThemeChange } from "../lib/theme";
import { Halos } from "../lib/halos";
import RollText from "../components/RollText";

export default function Home({ ready, onNavigate }: { ready: boolean; onNavigate: (r: string) => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageZoneRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const introDone = useRef(false);
  const sceneRef = useRef<LogoScene | null>(null);
  const featVidRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const labRef = useRef<HTMLElement>(null);
  const labTrackRef = useRef<HTMLDivElement>(null);

  /* ---------- 3D scene lifecycle ---------- */
  useEffect(() => {
    resetPose();
    // 0.8 → logo renders 20% smaller; it scales around its own centre so every
    // scroll pose (x / y / dist) stays exactly where it was.
    const scene = new LogoScene(canvasRef.current!, GLB_URL, true, 0.8);
    scene.setMode("scrub");
    scene.setLight(getTheme() === "light");
    const offTheme = onThemeChange((t) => scene.setLight(t === "light"));
    sceneRef.current = scene;
    scene.init().catch((err) => console.warn("[Home] 3D logo failed to initialise:", err));
    const io = new IntersectionObserver(
      ([entry]) => scene.setRunning(entry.isIntersecting),
      { rootMargin: "80px", threshold: 0 }
    );
    io.observe(stageZoneRef.current!);
    return () => {
      io.disconnect();
      offTheme();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  /* ---------- frosted halos behind text that floats over the 3D logo ---------- */
  useEffect(() => {
    const root = rootRef.current!;
    const halos = new Halos(root, Array.from(root.querySelectorAll<HTMLElement>("[data-halo]")), root);
    const io = new IntersectionObserver(([entry]) => halos.setRunning(entry.isIntersecting), { threshold: 0 });
    io.observe(stageZoneRef.current!);
    return () => {
      io.disconnect();
      halos.dispose();
    };
  }, []);

  /* ---------- featured video plays only when visible ---------- */
  useEffect(() => {
    const v = featVidRef.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.2 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  /* ---------- floating preview image on service rows ----------
     Which row is "hovered" is decided by hit-testing the pointer position, not by
     mouseenter/mouseleave: those don't fire when the page scrolls under a still
     cursor (fast wheel / Lenis), which used to leave the preview stuck to the cursor
     outside the section. The rAF loop only runs while the preview is moving. */
  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    const preview = previewRef.current!;
    const img = preview.querySelector("img")!;
    const list = document.querySelector<HTMLElement>(".service-list");
    if (!list) return;
    const pos = { x: -400, y: -400 };
    const cur = { x: -400, y: -400 };
    let hasPointer = false;
    let near = false; // section close to the viewport
    let active: HTMLElement | null = null;
    let shown = false; // preview fully faded out?
    let dirty = false; // pointer moved / page scrolled since last hit-test
    let raf = 0;
    let lastTx = "";

    const show = (row: HTMLElement) => {
      const key = row.dataset.preview || "01";
      if (img.dataset.key !== key) {
        img.dataset.key = key;
        img.src = SERVICE_PREVIEWS[key];
      }
      if (!shown) {
        // appear where the cursor is instead of flying in from the last spot
        cur.x = pos.x;
        cur.y = pos.y;
        shown = true;
      }
      gsap.to(preview, { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.45, ease: "power3.out", overwrite: "auto" });
    };
    const hide = () => {
      gsap.to(preview, {
        autoAlpha: 0, scale: 0.92, rotate: -3, duration: 0.3, ease: "power3.in", overwrite: "auto",
        onComplete: () => { if (!active) shown = false; },
      });
    };

    const hitTest = () => {
      let row: HTMLElement | null = null;
      if (hasPointer && near) {
        const r = list.getBoundingClientRect();
        if (pos.x >= r.left && pos.x <= r.right && pos.y >= r.top && pos.y <= r.bottom) {
          row = (document.elementFromPoint(pos.x, pos.y) as HTMLElement | null)?.closest<HTMLElement>(".service-row") ?? null;
          if (row && !list.contains(row)) row = null;
        }
      }
      if (row === active) return;
      active = row;
      if (row) show(row);
      else hide();
    };

    const loop = () => {
      raf = 0;
      if (dirty) {
        dirty = false;
        hitTest();
      }
      if (!shown) return; // idle: nothing to move
      cur.x += (pos.x - cur.x) * 0.12;
      cur.y += (pos.y - cur.y) * 0.12;
      const tilt = Math.max(-6, Math.min(6, (pos.x - cur.x) * 0.04));
      const tx = `translate3d(${cur.x + 26}px, ${cur.y - 118}px, 0) rotate(${tilt}deg)`;
      if (tx !== lastTx) {
        preview.style.transform = tx;
        lastTx = tx;
      }
      const settled = Math.abs(pos.x - cur.x) < 0.3 && Math.abs(pos.y - cur.y) < 0.3;
      if (!settled || active || dirty) raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      dirty = true;
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      pos.x = e.clientX;
      pos.y = e.clientY;
      hasPointer = true;
      if (near || active) kick();
    };
    const onScroll = () => {
      if (near || active) kick();
    };
    const onGone = () => {
      hasPointer = false;
      kick();
    };
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) onGone(); // left the window
    };

    const io = new IntersectionObserver(
      ([e]) => {
        near = e.isIntersecting;
        kick();
      },
      { rootMargin: "120px 0px" }
    );
    io.observe(list);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onScroll, { passive: true });
    document.addEventListener("pointerout", onOut);
    window.addEventListener("blur", onGone);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      gsap.killTweensOf(preview);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onScroll);
      document.removeEventListener("pointerout", onOut);
      window.removeEventListener("blur", onGone);
    };
  }, []);

  /* ---------- scroll choreography ---------- */
  useEffect(() => {
    const ctx = gsap.context(() => {
      const chapterEls = gsap.utils.toArray<HTMLElement>(".chapter");
      const ticks = gsap.utils.toArray<HTMLElement>(".chapter-tick");
      const counter = document.querySelector<HTMLElement>(".chapter-counter");

      const mm = gsap.matchMedia();
      mm.add(
        { isDesktop: "(min-width: 900px)", isMobile: "(max-width: 899px)" },
        (mctx) => {
          const { isDesktop } = mctx.conditions as { isDesktop: boolean };
          const k = isDesktop ? 1 : 0;

          // hero drift away
          gsap.to(logoPose, {
            dist: 1.34,
            y: 0.5,
            scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: 0.6 },
          });
          gsap.to(".hero-inner", {
            yPercent: -16,
            opacity: 0.06,
            ease: "none",
            scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom 30%", scrub: true },
          });

          // ---- the story: one scrubbed master timeline ----
          const tl = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            scrollTrigger: {
              trigger: storyRef.current,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.7,
              onUpdate: (self) => {
                const idx = Math.min(3, Math.floor(self.progress * 4));
                ticks.forEach((t, i) => {
                  t.style.background = i === idx ? "var(--color-gold)" : "rgba(var(--bone-rgb),0.18)";
                  t.style.boxShadow = i === idx ? "0 0 12px rgba(var(--gold-rgb),0.8)" : "none";
                });
                if (counter) counter.textContent = `0${idx + 1} / 04`;
              },
            },
          });

          // chapters fade choreography
          chapterEls.forEach((el, i) => {
            const at = i * 4;
            tl.fromTo(el, { autoAlpha: 0, y: 90, filter: "blur(10px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.1 }, at + 0.3);
            if (i < chapterEls.length - 1) tl.to(el, { autoAlpha: 0, y: -90, filter: "blur(10px)", duration: 1 }, at + 3.3);
            else tl.to(el, { autoAlpha: 1, duration: 0.8 }, at + 3.4); // hold last
          });

          // logo keyframes — the pixels scatter & rebuild as the story unfolds
          tl.to(logoPose, { assemble: 0.04, rotY: 0.8, dist: 1.42, x: 0, y: 0.15, duration: 4 }, 0);
          tl.to(logoPose, { assemble: 1, rotY: Math.PI, rotX: 0, dist: isDesktop ? 0.94 : 1.5, x: -1.9 * k, y: 0, duration: 4 }, 4);
          tl.to(logoPose, { assemble: 0.36, rotY: Math.PI * 1.5, rotX: 0.35, dist: 1.7, x: 2.1 * k, y: -0.35, duration: 4 }, 8);
          tl.to(logoPose, { assemble: 1, rotY: Math.PI * 2, rotX: 0, dist: 1.04, x: 0, y: 0, scale: 1.1, duration: 4 }, 12);
        }
      );

      // services reveal
      gsap.utils.toArray<HTMLElement>(".service-row").forEach((row, i) => {
        gsap.fromTo(
          row,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            delay: (i % 2) * 0.06,
            scrollTrigger: { trigger: row, start: "top 92%" },
          }
        );
      });

      // stat counters
      gsap.utils.toArray<HTMLElement>(".stat-num").forEach((el) => {
        const end = Number(el.dataset.value || 0);
        const obj = { v: 0 };
        ScrollTrigger.create({
          trigger: el,
          start: "top 88%",
          once: true,
          onEnter: () =>
            gsap.to(obj, {
              v: end,
              duration: 1.8,
              ease: "power3.out",
              onUpdate: () => {
                el.textContent = String(Math.round(obj.v));
              },
            }),
        });
      });

      // selected work parallax
      gsap.utils.toArray<HTMLElement>(".work-parallax").forEach((el) => {
        gsap.fromTo(
          el,
          { yPercent: Number(el.dataset.speed || 0) },
          {
            yPercent: -Number(el.dataset.speed || 0),
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
          }
        );
      });

      // quote word scrub
      const words = gsap.utils.toArray<HTMLElement>(".quote-word");
      gsap.fromTo(
        words,
        { opacity: 0.13 },
        {
          opacity: 1,
          stagger: 0.08,
          ease: "none",
          scrollTrigger: { trigger: ".quote-block", start: "top 78%", end: "bottom 55%", scrub: 0.5 },
        }
      );

      // LAB — pinned horizontal gallery
      const lab = labRef.current;
      const labTrack = labTrackRef.current;
      if (lab && labTrack) {
        const labTween = gsap.to(labTrack, {
          x: () => -(labTrack.scrollWidth - window.innerWidth),
          ease: "none",
          scrollTrigger: {
            trigger: lab,
            start: "top top",
            end: () => "+=" + (labTrack.scrollWidth - window.innerWidth),
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
        // inner images counter-drift for depth
        gsap.utils.toArray<HTMLElement>(".lab-card img").forEach((im) => {
          gsap.fromTo(
            im,
            { xPercent: -5 },
            { xPercent: 5, ease: "none", scrollTrigger: { trigger: im, containerAnimation: labTween, start: "left right", end: "right left", scrub: true } }
          );
        });
      }

      // section header lines
      gsap.utils.toArray<HTMLElement>(".reveal-line").forEach((el) => {
        gsap.fromTo(el, { yPercent: 120 }, { yPercent: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 92%" } });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  /* ---------- intro after loader ---------- */
  useEffect(() => {
    if (!ready || introDone.current) return;
    introDone.current = true;

    gsap.set(logoPose, { assemble: 0, rotY: -1.4, dist: 1.5, spin: 3.4 });
    gsap.set(".hero-meta", { opacity: 0, y: 18 });
    gsap.set(".hero-cue", { opacity: 0 });
    gsap.set(".hud", { opacity: 0, scale: 0.82 });
    gsap.set(".hud-corner", { opacity: 0 });
    gsap.set(".hero-chip", { autoAlpha: 0, y: 14 });
    const tl = gsap.timeline({
      delay: 0.15,
      onComplete: () => ScrollTrigger.refresh(),
    });
    tl.to(logoPose, { assemble: 1, rotY: defaultPose.rotY, dist: defaultPose.dist, spin: 1, duration: 2.4, ease: "power3.inOut" }, 0)
      .to(".hud", { opacity: 1, scale: 1, duration: 1.7, ease: "expo.out" }, 1.15)
      .to(".hud-corner", { opacity: 1, duration: 0.5, stagger: 0.07 }, 1.3)
      .to(".hero-chip", { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.09 }, 1.35)
      .to(".hero-meta", { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08 }, 0.9)
      .to(".hero-cue", { opacity: 1, duration: 1 }, 1.6);
  }, [ready]);

  const goWork = (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate("#/work");
  };

  // big video tile + two portfolio highlights
  const featured = ["moosehead", "jalebi", "shepherd"].map((id) => projects.find((p) => p.id === id)).filter(Boolean) as Project[];
  const caption = (p: Project) => `${p.cat} — ${STUDIO_LABEL[p.studio].replace("®", "")}, ${projectMeta(p)}`;

  return (
    <div ref={rootRef} className="relative">
      {/* fixed 3D stage */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0" style={{ background: "radial-gradient(58% 44% at 50% 46%, rgba(var(--gold-rgb),0.11), transparent 70%)" }} />
        <canvas ref={canvasRef} className="relative h-full w-full" />
      </div>

      {/* floating service preview (follows cursor) */}
      <div ref={previewRef} className="invisible pointer-events-none fixed left-0 top-0 z-40 h-[236px] w-[340px] opacity-0" style={{ transform: "translate3d(-400px,-400px,0)" }}>
        <img alt="" className="h-full w-full border object-cover" style={{ borderColor: "rgba(var(--gold-rgb),0.5)", boxShadow: "0 24px 70px rgba(0,0,0,0.6), 0 0 0 6px rgba(var(--ink-rgb),0.9)" }} />
      </div>

      {/* ======== zone where the 3D shows through ======== */}
      <div ref={stageZoneRef}>
        {/* ---------- HERO ---------- */}
        <section ref={heroRef} className="relative z-10 flex h-[100svh] flex-col justify-between px-6 pb-8 pt-24 md:px-10">
          <div className="hero-inner relative flex h-full flex-col justify-center">
            {/* corner brackets */}
            <span className="hud-corner left-0 top-0 border-l-2 border-t-2" />
            <span className="hud-corner right-0 top-0 border-r-2 border-t-2" />
            <span className="hud-corner bottom-0 left-0 border-b-2 border-l-2" />
            <span className="hud-corner bottom-0 right-0 border-b-2 border-r-2" />

            <div className="hero-meta flex items-center justify-between">
              <span className="label" data-halo>DIGITAL PRODUCT STUDIO</span>
              <span className="label hidden md:block" data-halo>EST. 2019 — MTL / PAR / LHE</span>
              <span className="label label-gold" data-halo>SCROLL TO ASSEMBLE</span>
            </div>

            <div className="relative mt-6 flex-1">
              <h1 className="sr-only">GreePixel — We build beyond</h1>

              {/* HUD rings framing the 3D logo */}
              <div aria-hidden className="hud pointer-events-none absolute left-1/2 top-1/2 h-[min(80vmin,740px)] w-[min(80vmin,740px)] -translate-x-1/2 -translate-y-1/2">
                <svg viewBox="0 0 100 100" className="animate-spin-slow absolute inset-0 h-full w-full">
                  <circle cx="50" cy="50" r="49" fill="none" style={{ stroke: "rgba(var(--bone-rgb),0.16)" }} strokeWidth="0.22" strokeDasharray="0.6 2.4" />
                </svg>
                <svg viewBox="0 0 100 100" className="animate-spin-rev absolute inset-[7%] h-[86%] w-[86%]">
                  <circle cx="50" cy="50" r="48" fill="none" style={{ stroke: "rgba(var(--gold-rgb),0.55)" }} strokeWidth="0.3" strokeDasharray="10 26" strokeLinecap="round" />
                </svg>
                <span className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2 bg-bone/30" />
                <span className="absolute bottom-0 left-1/2 h-2.5 w-px -translate-x-1/2 bg-bone/30" />
                <span className="absolute left-0 top-1/2 h-px w-2.5 -translate-y-1/2 bg-bone/30" />
                <span className="absolute right-0 top-1/2 h-px w-2.5 -translate-y-1/2 bg-bone/30" />
                <span className="animate-pulse-glow absolute left-1/2 top-[7%] h-1.5 w-1.5 -translate-x-1/2" style={{ background: "var(--color-gold)" }} />
              </div>

              {/* floating spec chips */}
              {[
                { t: "AI SYSTEMS · AGENTS · RAG", pos: "top-[16%] right-[4%] md:right-[7%]", d: "0s" },
                { t: "WEBGL / REAL-TIME 3D", pos: "top-[44%] left-[2%] md:left-[4%]", d: "0.9s" },
                { t: "MVP SPRINTS · 4–8 WK", pos: "bottom-[20%] right-[6%] md:right-[12%]", d: "1.7s" },
                { t: "QA · HARDENING · AUDIT", pos: "bottom-[16%] left-[4%] md:left-[9%]", d: "2.4s" },
              ].map((c) => (
                <span
                  key={c.t}
                  className={`hero-chip label absolute hidden items-center gap-2 border border-bone/15 bg-ink/60 px-3 py-2 backdrop-blur-sm md:flex ${c.pos}`}
                  style={{ background: "rgba(var(--ink-rgb),0.55)" }}
                >
                  <span className="animate-float-y inline-block h-1.5 w-1.5" style={{ background: "var(--color-gold)", animationDelay: c.d }} />
                  {c.t}
                </span>
              ))}
            </div>

            <div className="hero-meta flex items-end justify-between">
              <p className="max-w-xs text-sm leading-relaxed text-bone/60" data-halo>
                Senior engineers & 3D artists crafting AI products, immersive web and software that actually ships.
              </p>
              <span className="label hidden text-right md:block" data-halo>
                WE BUILD
                <br />
                BEYOND
              </span>
            </div>
          </div>

          <div className="hero-cue flex items-center justify-center gap-6">
            <span className="label hidden items-center gap-2 sm:flex" data-halo>
              <Move className="h-3.5 w-3.5" style={{ color: "var(--color-gold)" }} /> DRAG TO SPIN
            </span>
            <span className="flex items-center gap-3" data-halo>
              <ArrowDown className="h-4 w-4 animate-bounce" style={{ color: "var(--color-gold)" }} />
              <span className="label">SCROLL</span>
            </span>
            <span className="label hidden items-center gap-2 sm:flex" data-halo>© 2026</span>
          </div>
        </section>

        {/* ---------- SCROLLY STORY ---------- */}
        <div ref={storyRef} className="relative z-10 h-[560vh]">
          <div className="sticky top-0 h-[100svh] overflow-hidden">
            {/* side progress */}
            <div className="absolute right-6 top-1/2 z-20 flex -translate-y-1/2 flex-col items-end gap-3 md:right-10" data-halo data-halo-pad="16">
              <span className="chapter-counter font-pixel mb-2 text-xs" style={{ fontFamily: "var(--font-pixel)", color: "var(--color-gold)" }}>
                01 / 04
              </span>
              {chapters.map((c, i) => (
                <span key={c.k} className="chapter-tick h-2.5 w-2.5" style={{ background: i === 0 ? "var(--color-gold)" : "rgba(var(--bone-rgb),0.18)" }} />
              ))}
            </div>

            {chapters.map((ch, i) => (
              <div
                key={ch.k}
                className={`chapter invisible absolute inset-0 flex flex-col justify-center px-6 md:px-[9vw] ${
                  i === 1 ? "md:items-end md:text-right" : i === 2 ? "md:items-start" : "items-center text-center"
                }`}
                style={{ opacity: 0 }}
              >
                <span className="label label-gold mb-5 block w-fit max-w-full" data-halo>
                  [{ch.k}] — {ch.meta}
                </span>
                <h2 className="font-display w-fit max-w-full text-[clamp(3rem,9vw,8.5rem)] leading-[0.85]" data-halo data-hx>
                  <span className="block text-bone">{ch.title[0]}</span>
                  <span className="text-stroke block">{ch.title[1]}</span>
                </h2>
                <p className={`mt-7 max-w-md text-sm leading-relaxed text-bone/65 md:text-base ${i === 1 ? "md:ml-auto" : ""}`} data-halo>
                  {ch.body}
                </p>
                <span
                  className="font-pixel pointer-events-none absolute bottom-10 text-[10px] tracking-widest md:bottom-1/2 md:translate-y-1/2"
                  style={{
                    fontFamily: "var(--font-pixel)",
                    color: "rgba(var(--gold-rgb),0.55)",
                    ...(i === 1 ? { left: "1.5rem" } : {}),
                  }}
                >
                  <span data-halo data-halo-pad="14">
                    {"//"} {ch.accent}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ======== solid content over the canvas ======== */}
      <div className="relative z-20" style={{ background: "var(--color-ink)" }}>
        {/* tools we build UIs with — logo strip */}
        <ToolsStrip />

        {/* ---------- SERVICES ---------- */}
        <section className="px-6 py-24 md:px-10 md:py-36">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6 md:mb-20">
            <div>
              <span className="label label-gold block overflow-hidden" data-scramble>[CAPABILITIES]</span>
              <div className="mt-3 overflow-hidden">
                <h2 className="reveal-line font-display block text-[clamp(2.8rem,7vw,6.5rem)] uppercase leading-[0.9]" data-hx>
                  WHAT WE <span className="text-stroke">SHIP</span>
                </h2>
              </div>
            </div>
            <span className="label pb-3" data-reveal>08 DISCIPLINES — ONE TEAM</span>
          </div>

          <div className="service-list border-t" style={{ borderColor: "rgba(var(--bone-rgb),0.09)" }}>
            {services.map((s) => (
              <div
                key={s.n}
                data-preview={s.n}
                className="service-row group relative grid cursor-default grid-cols-[auto_1fr] items-baseline gap-x-5 gap-y-2 border-b py-6 transition-colors duration-300 hover:bg-gold md:grid-cols-12 md:py-8"
                style={{ borderColor: "rgba(var(--bone-rgb),0.09)" }}
              >
                <span className="font-mono text-xs md:col-span-1 md:pl-2" style={{ fontFamily: "var(--font-mono)", color: "var(--color-gold)" }}>
                  /{s.n}
                </span>
                <h3 className="font-display text-2xl uppercase tracking-tight text-bone transition-all duration-300 group-hover:translate-x-3 group-hover:text-ink md:col-span-5 md:text-4xl" style={{ transitionProperty: "transform,color" }}>
                  {s.t}
                </h3>
                <p className="col-span-2 text-sm leading-relaxed text-bone/50 transition-colors duration-300 group-hover:text-ink/80 md:col-span-4">{s.d}</p>
                <div className="col-span-2 flex flex-wrap gap-2 md:col-span-2 md:justify-end md:pr-2">
                  {s.tags.map((t) => (
                    <span key={t} className="label border border-bone/15 px-2 py-1 transition-colors duration-300 group-hover:border-ink/30 group-hover:text-ink" style={{ fontSize: "9px" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- LAB — horizontal R&D gallery ---------- */}
        <section ref={labRef} className="relative overflow-hidden border-t" style={{ borderColor: "rgba(var(--bone-rgb),0.09)" }}>
          <div className="relative flex h-[100svh] flex-col justify-center py-10">
            <div className="absolute inset-0" style={{ background: "radial-gradient(70% 60% at 70% 40%, rgba(var(--gold-rgb),0.07), transparent 70%)" }} />
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4 px-6 md:mb-12 md:px-10">
              <div className="overflow-hidden">
                <span className="label label-gold block" data-scramble>[GREEPIXEL LAB]</span>
                <h2 className="font-display mt-3 text-[clamp(2.4rem,6vw,5.5rem)] uppercase leading-[0.9]" data-hx>
                  AI × INTERACTIVE <span className="text-stroke">R&D</span>
                </h2>
              </div>
              <span className="label pb-2">DRAG THE SCROLL — 08 STUDIES →</span>
            </div>

            <div ref={labTrackRef} className="flex w-max items-stretch gap-5 px-6 md:gap-8 md:px-10">
              {Object.entries(LAB).map(([k, item], i) => (
                <figure key={k} className="lab-card group relative w-[74vw] shrink-0 md:w-[36vw] lg:w-[30vw]" data-cursor="R&D">
                  <div className="theme-dark card-sheen relative overflow-hidden border border-bone/10" style={{ aspectRatio: "16/10", borderColor: "rgba(var(--bone-rgb),0.12)" }}>
                    <img src={item.img} alt={item.title} loading="lazy" className="h-[112%] w-[112%] max-w-none object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: "rgba(var(--gold-rgb),0.12)" }} />
                    <span className="label absolute left-3 top-3 border border-bone/20 px-2 py-1 backdrop-blur-sm" style={{ background: "rgba(var(--ink-rgb),0.5)", fontSize: "9px" }}>
                      EXP/{String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <figcaption className="mt-4 flex items-baseline justify-between">
                    <span className="font-display text-xl uppercase text-bone md:text-2xl">{item.title}</span>
                    <span className="label" style={{ color: "rgba(var(--gold-rgb),0.9)" }}>
                      {item.tag}
                    </span>
                  </figcaption>
                </figure>
              ))}

              <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="group flex w-[60vw] shrink-0 items-center justify-center border border-dashed md:w-[26vw]" style={{ borderColor: "rgba(var(--gold-rgb),0.4)" }} data-cursor="BOOK A CALL">
                <span className="font-display flex items-center gap-4 text-3xl uppercase text-stroke-gold transition-colors duration-300 group-hover:text-gold md:text-4xl" style={{ ["--tw-text-opacity" as string]: 1 }}>
                  Your experiment <ArrowUpRight className="h-8 w-8 transition-transform duration-500 group-hover:-translate-y-2 group-hover:translate-x-2" style={{ color: "var(--color-gold)" }} />
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* ---------- STATS ---------- */}
        <section className="grid grid-cols-2 border-y md:grid-cols-4" style={{ borderColor: "rgba(var(--bone-rgb),0.09)" }}>
          {stats.map((s, i) => (
            <div key={i} className="spot-card border-b border-r p-8 last:border-r-0 md:border-b-0 md:p-12" style={{ borderColor: "rgba(var(--bone-rgb),0.09)" }}>
              <div className="font-display flex items-baseline text-6xl md:text-7xl" style={{ color: i === 0 ? "var(--color-gold)" : "var(--color-bone)" }}>
                <span className="stat-num" data-value={s.v}>
                  0
                </span>
                <span>{s.suffix}</span>
              </div>
              <p className="label mt-4">{s.label}</p>
            </div>
          ))}
        </section>

        {/* ---------- SELECTED WORK ---------- */}
        <section className="px-6 py-24 md:px-10 md:py-36">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6 md:mb-16">
            <div>
              <span className="label label-gold block" data-scramble>[PORTFOLIO — GREEPIXEL® × STUDIO ARCHIVE]</span>
              <div className="mt-3 overflow-hidden">
                <h2 className="reveal-line font-display block text-[clamp(2.8rem,7vw,6.5rem)] uppercase leading-[0.9]" data-hx>SELECTED WORK</h2>
              </div>
            </div>
            <a href="#/work" onClick={goWork} data-cursor="OPEN" data-magnetic className="label group flex items-center gap-2 rounded-full border border-bone/20 px-5 py-3 transition-colors hover:border-gold" data-cursor-snap>
              <RollText text="FULL ARCHIVE" /> <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-45" />
            </a>
          </div>

          <div className="grid gap-6 md:grid-cols-12">
            <a href="#/work" onClick={goWork} data-cursor={featured[0].video ? "PLAY" : "VIEW"} className="theme-dark card-sheen group relative block overflow-hidden md:col-span-7" style={{ aspectRatio: "16/10" }}>
              <div className="work-parallax absolute inset-0" data-speed="6">
                {featured[0].video ? (
                  <video ref={featVidRef} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" src={featured[0].video} poster={featured[0].img} muted loop playsInline preload="none" />
                ) : (
                  <img src={featured[0].img} alt={featured[0].name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                )}
              </div>
              <div className="absolute inset-0 bg-ink/20 transition-colors duration-500 group-hover:bg-transparent" style={{ background: "rgba(var(--ink-rgb),0.25)" }} />
              <div className="absolute left-0 top-0 flex w-full items-center justify-between p-5">
                <span className="label label-gold">[01] FEATURED</span>
                {featured[0].video ? <Play className="h-4 w-4" style={{ color: "var(--color-gold)" }} /> : <ArrowUpRight className="h-4 w-4" style={{ color: "var(--color-gold)" }} />}
              </div>
              <div className="absolute bottom-0 left-0 w-full p-5" style={{ background: "linear-gradient(to top, rgba(var(--ink-rgb),0.85), transparent)" }}>
                <h3 className="font-display text-3xl uppercase md:text-5xl">{featured[0].name}</h3>
                <span className="label mt-1 block">{caption(featured[0])}</span>
              </div>
            </a>

            <div className="grid gap-6 md:col-span-5">
              {featured.slice(1).map((p, i) => (
                <a key={p.id} href="#/work" onClick={goWork} data-cursor="VIEW" className="theme-dark card-sheen group relative block overflow-hidden" style={{ aspectRatio: "16/8.5" }}>
                  <div className="work-parallax absolute inset-0" data-speed={i === 0 ? 10 : 8}>
                    <img src={p.img} alt={p.name} className="h-full w-full scale-110 object-cover transition-transform duration-700 group-hover:scale-125" />
                  </div>
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: "rgba(var(--gold-rgb),0.16)" }} />
                  <div className="absolute bottom-0 left-0 w-full p-5" style={{ background: "linear-gradient(to top, rgba(var(--ink-rgb),0.8), transparent)" }}>
                    <h3 className="font-display text-2xl uppercase md:text-3xl">{p.name}</h3>
                    <span className="label mt-1 block">{caption(p)}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- QUOTE ---------- */}
        <section className="quote-block border-t px-6 py-28 md:px-10 md:py-40" style={{ borderColor: "rgba(var(--bone-rgb),0.09)" }}>
          <span className="label label-gold block text-center" data-scramble>[FIELD REPORT]</span>
          <blockquote className="mx-auto mt-8 max-w-5xl text-center">
            <p className="font-display text-[clamp(1.9rem,4.6vw,4.2rem)] uppercase leading-[1.02]">
              {"What a 70-engineer team could not deliver, this crew shipped — mobile, web and backend, live."
                .split(" ")
                .map((w, i) => (
                  <span key={i} className="quote-word inline-block">
                    {w}&nbsp;
                  </span>
                ))}
            </p>
          </blockquote>
          <p className="label mt-10 text-center" data-reveal>— FOUNDER, EDTECH PLATFORM RESCUE</p>
        </section>

        <Footer onNavigate={onNavigate} />
      </div>
    </div>
  );
}
