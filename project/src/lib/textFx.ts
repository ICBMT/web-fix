import { gsap, ScrollTrigger } from "./core";

/**
 * Text & hover vocabulary ported from the GreeLogix site, applied declaratively:
 *
 *   [data-hx]        headline → split into letters; letters swell toward the
 *                    cursor (magnetic, GSAP variable-font-demo style) and ignite
 *                    gold on hover (CSS .hx-char:hover)
 *   [data-scramble]  plain-text label decodes from glyph noise when it scrolls in
 *   [data-reveal]    rises + de-blurs into place when it scrolls in
 *   .spot-card       soft gold spotlight follows the pointer (--mx / --my)
 *   a, button        "press physics": a springy dip under the pointer
 *
 * Call once per page render; returns a cleanup. Splitting is idempotent.
 */

const GLYPHS = "!<>-_/[]{}=+*^?#";

function splitHeadline(el: HTMLElement) {
  if (el.dataset.hxDone) return Array.from(el.querySelectorAll<HTMLElement>(".hx-char"));
  el.dataset.hxDone = "1";
  if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", (el.textContent || "").replace(/\s+/g, " ").trim());
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        (child.textContent || "").split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(" "));
            return;
          }
          const word = document.createElement("span");
          word.className = "hx-word";
          word.setAttribute("aria-hidden", "true");
          for (const ch of part) {
            const c = document.createElement("span");
            c.className = "hx-char";
            c.textContent = ch;
            word.appendChild(c);
          }
          frag.appendChild(word);
        });
        child.parentNode!.replaceChild(frag, child);
      } else if (child.nodeType === 1 && (child as Element).tagName !== "BR" && (child as Element).tagName !== "svg") {
        walk(child);
      }
    });
  };
  walk(el);
  return Array.from(el.querySelectorAll<HTMLElement>(".hx-char"));
}

export function initTextFx(root: ParentNode = document): () => void {
  const ac = new AbortController();
  const { signal } = ac;
  const hover = window.matchMedia("(hover: hover)").matches;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = gsap.context(() => {});
  const observers: IntersectionObserver[] = [];

  /* ---------- magnetic headline letters ---------- */
  root.querySelectorAll<HTMLElement>("[data-hx]").forEach((el) => {
    const chars = splitHeadline(el);
    if (!hover || reduce || !chars.length) return;
    let setters: { s: gsap.QuickToFunc; y: gsap.QuickToFunc }[] | null = null;
    let centers: number[] = [];
    let raf = 0;
    let px = 0;
    const reach = () => Math.max(90, parseFloat(getComputedStyle(el).fontSize) * 1.6);
    const frame = () => {
      raf = 0;
      if (!setters) return;
      const R = reach();
      // one batch of reads per frame, then writes
      centers = chars.map((c) => {
        const r = c.getBoundingClientRect();
        return r.left + r.width / 2;
      });
      centers.forEach((cx, i) => {
        const k = Math.max(0, 1 - Math.abs(px - cx) / R);
        setters![i].s(1 + k * 0.22);
        setters![i].y(-k * 0.09);
      });
    };
    el.addEventListener(
      "pointerenter",
      () => {
        if (!setters)
          ctx.add(() => {
            setters = chars.map((c) => ({
              s: gsap.quickTo(c, "scale", { duration: 0.35, ease: "power2.out" }),
              y: gsap.quickTo(c, "yPercent", { duration: 0.35, ease: "power2.out" }) as gsap.QuickToFunc,
            }));
          });
      },
      { signal }
    );
    el.addEventListener(
      "pointermove",
      (e) => {
        px = e.clientX;
        if (!raf) raf = requestAnimationFrame(frame);
      },
      { signal }
    );
    el.addEventListener(
      "pointerleave",
      () => {
        cancelAnimationFrame(raf);
        raf = 0;
        ctx.add(() => gsap.to(chars, { scale: 1, yPercent: 0, duration: 0.7, ease: "elastic.out(1, 0.45)", overwrite: "auto" }));
        setters = null;
      },
      { signal }
    );
  });

  /* ---------- scramble-decode labels ---------- */
  const scrambles = Array.from(root.querySelectorAll<HTMLElement>("[data-scramble]")).filter((el) => !el.children.length);
  if (scrambles.length && !reduce) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          const final = el.dataset.scrambleText || el.textContent || "";
          el.dataset.scrambleText = final;
          const t0 = performance.now();
          const dur = 850;
          const step = (now: number) => {
            if (signal.aborted) {
              el.textContent = final;
              return;
            }
            const p = Math.min((now - t0) / dur, 1);
            const settled = Math.floor(p * final.length);
            el.textContent =
              final.slice(0, settled) +
              [...final.slice(settled)].map((c) => (c === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = final;
          };
          requestAnimationFrame(step);
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    scrambles.forEach((el) => io.observe(el));
    observers.push(io);
  }

  /* ---------- rise + de-blur reveals ---------- */
  if (!reduce)
    ctx.add(() => {
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 34, opacity: 0, filter: "blur(6px)" },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 1.05,
            ease: "power3.out",
            clearProps: "filter",
            delay: parseFloat(el.dataset.delay || "0"),
            scrollTrigger: { trigger: el, start: "top 90%" },
          }
        );
      });
    });

  /* ---------- pointer spotlight ---------- */
  if (hover) {
    root.querySelectorAll<HTMLElement>(".spot-card").forEach((el) => {
      el.addEventListener(
        "pointermove",
        (e) => {
          const r = el.getBoundingClientRect();
          el.style.setProperty("--mx", `${e.clientX - r.left}px`);
          el.style.setProperty("--my", `${e.clientY - r.top}px`);
        },
        { signal }
      );
    });
  }

  ScrollTrigger.refresh();

  return () => {
    ac.abort();
    observers.forEach((o) => o.disconnect());
    ctx.revert();
  };
}

/**
 * Press physics, delegated once for the whole app: every link/button dips to
 * 97% under the pointer and springs back. Uses the independent `scale`
 * property through WAAPI, so it composes with GSAP/magnetic transforms.
 */
export function initPressFx(): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  let pressed: { el: HTMLElement; anim: Animation } | null = null;
  const release = () => {
    if (!pressed) return;
    const { el, anim } = pressed;
    pressed = null;
    anim.cancel();
    el.animate([{ scale: "0.97" }, { scale: "1" }], { duration: 420, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" });
  };
  const down = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const el = (e.target as HTMLElement).closest?.("a, button") as HTMLElement | null;
    if (!el) return;
    release();
    pressed = { el, anim: el.animate([{ scale: "1" }, { scale: "0.97" }], { duration: 140, easing: "ease-out", fill: "forwards" }) };
  };
  window.addEventListener("pointerdown", down, { passive: true });
  window.addEventListener("pointerup", release, { passive: true });
  window.addEventListener("pointercancel", release, { passive: true });
  window.addEventListener("dragstart", release, { passive: true });
  return () => {
    window.removeEventListener("pointerdown", down);
    window.removeEventListener("pointerup", release);
    window.removeEventListener("pointercancel", release);
    window.removeEventListener("dragstart", release);
  };
}
