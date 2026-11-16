import { useEffect, useRef } from "react";

/**
 * Custom cursor
 * - dot: exact pointer position
 * - ring: follows with inertia, stretches + leans along the direction of travel
 *   (squash & stretch), springs back to a circle when you stop
 * - pixel trail: tiny brand "pixels" flare off the path and drift away
 *   (fixed pool, WAAPI transform/opacity only → compositor thread, no GC churn)
 * - [data-cursor-snap]: the ring melts around the element's own shape (pill, box…)
 * - [data-cursor="LABEL"]: the ring grows into a filled label bubble (media cards)
 * - press: ring dips; click: a small pixel burst
 * The rAF loop sleeps whenever everything has settled.
 */

const BASE = 40; // ring diameter (px)
const POOL = 18; // trail pixels

export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("no-cursor");

    const d = dotRef.current!;
    const r = ringRef.current!;
    const lab = labelRef.current!;
    const pixels = Array.from(trailRef.current!.children) as HTMLElement[];
    const running: (Animation | null)[] = pixels.map(() => null);
    let pi = 0;

    const pos = { x: -100, y: -100 };
    const ring = { x: -100, y: -100, w: BASE, h: BASE, rad: BASE / 2, s: 1, sx: 1, sy: 1, ang: 0 };
    let targetScale = 1;
    let press = 1;
    let label = "";
    let snapEl: HTMLElement | null = null;
    let snapRad = 0;
    let visible = false;
    let raf = 0;
    let lastSpawn = { x: 0, y: 0, t: 0 };

    const spawn = (x: number, y: number, burst = false) => {
      const el = pixels[pi];
      running[pi]?.cancel();
      const size = burst ? 4 + Math.random() * 3 : 3 + Math.random() * 3;
      const ang = Math.random() * Math.PI * 2;
      const dist = burst ? 26 + Math.random() * 30 : 10 + Math.random() * 18;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist + (burst ? 0 : 6);
      const rot = (Math.random() - 0.5) * 180;
      el.style.width = el.style.height = `${size}px`;
      el.style.background = Math.random() > 0.3 ? "var(--color-gold)" : "var(--color-bone)";
      running[pi] = el.animate(
        [
          { transform: `translate3d(${x}px,${y}px,0) translate(-50%,-50%) rotate(0deg) scale(1)`, opacity: 0.95 },
          { transform: `translate3d(${x + dx}px,${y + dy}px,0) translate(-50%,-50%) rotate(${rot}deg) scale(0.1)`, opacity: 0 },
        ],
        { duration: (burst ? 560 : 640) + Math.random() * 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
      );
      pi = (pi + 1) % POOL;
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!visible) {
        visible = true;
        ring.x = pos.x;
        ring.y = pos.y;
        d.style.opacity = r.style.opacity = "1";
      }
      if (!reduce && !snapEl && !label) {
        const now = performance.now();
        const moved = Math.hypot(pos.x - lastSpawn.x, pos.y - lastSpawn.y);
        if (moved > 16 && now - lastSpawn.t > 26) {
          spawn(pos.x, pos.y);
          lastSpawn = { x: pos.x, y: pos.y, t: now };
        }
      }
      wake();
    };

    const onOver = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      const snap = t.closest?.("[data-cursor-snap]") as HTMLElement | null;
      const tagged = t.closest?.("[data-cursor]") as HTMLElement | null;
      snapEl = snap;
      if (snap) {
        label = "";
        targetScale = 1;
        const br = parseFloat(getComputedStyle(snap).borderTopLeftRadius) || 0;
        snapRad = br;
      } else if (tagged) {
        label = tagged.dataset.cursor || "";
        targetScale = label ? 3.2 : 1.8;
      } else {
        label = "";
        targetScale = t.closest?.("a, button") ? 1.6 : 1;
      }
      wake();
    };

    const onDown = () => {
      press = 0.78;
      wake();
    };
    const onUp = () => {
      press = 1;
      wake();
    };
    const onClick = (e: MouseEvent) => {
      if (reduce) return;
      for (let i = 0; i < 8; i++) spawn(e.clientX, e.clientY, true);
    };
    const onLeave = () => {
      visible = false;
      d.style.opacity = r.style.opacity = "0";
    };

    const tick = () => {
      raf = 0;
      let settled = true;
      const ease = (cur: number, target: number, k: number) => {
        const n = cur + (target - cur) * k;
        if (Math.abs(target - n) > 0.05) settled = false;
        return Math.abs(target - n) < 0.01 ? target : n;
      };

      // targets
      let tx = pos.x;
      let ty = pos.y;
      let tw = BASE;
      let th = BASE;
      let trad = BASE / 2;
      if (snapEl && snapEl.isConnected) {
        const b = snapEl.getBoundingClientRect();
        const pad = 6;
        // hug the element, leaning slightly toward the pointer (liquid feel)
        tx = b.left + b.width / 2 + (pos.x - (b.left + b.width / 2)) * 0.12;
        ty = b.top + b.height / 2 + (pos.y - (b.top + b.height / 2)) * 0.12;
        tw = b.width + pad * 2;
        th = b.height + pad * 2;
        trad = Math.min(snapRad + pad, th / 2);
        settled = false; // magnetic elements move; keep tracking while snapped
      } else if (snapEl) {
        snapEl = null;
      }

      const px = ring.x;
      const py = ring.y;
      ring.x = ease(ring.x, tx, snapEl ? 0.22 : 0.17);
      ring.y = ease(ring.y, ty, snapEl ? 0.22 : 0.17);
      ring.w = ease(ring.w, tw, 0.2);
      ring.h = ease(ring.h, th, 0.2);
      ring.rad = ease(ring.rad, trad, 0.2);
      ring.s = ease(ring.s, targetScale * press, 0.16);

      // squash & stretch along velocity (free roaming only)
      const vx = ring.x - px;
      const vy = ring.y - py;
      const speed = Math.hypot(vx, vy);
      const stretch = reduce || snapEl || label ? 0 : Math.min(speed / 60, 0.42);
      ring.sx = ease(ring.sx, 1 + stretch, 0.25);
      ring.sy = ease(ring.sy, 1 - stretch * 0.55, 0.25);
      if (speed > 0.6) ring.ang = Math.atan2(vy, vx) * (180 / Math.PI);

      d.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%,-50%) scale(${snapEl ? 0.6 : press < 1 ? 1.4 : 1})`;
      r.style.width = `${ring.w}px`;
      r.style.height = `${ring.h}px`;
      r.style.borderRadius = `${ring.rad}px`;
      r.style.transform =
        `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%,-50%) rotate(${ring.ang}deg) ` +
        `scale(${ring.s * ring.sx}, ${ring.s * ring.sy}) rotate(${-ring.ang}deg)`;

      if (lab.textContent !== label && label) lab.textContent = label;
      lab.style.opacity = label ? "1" : "0";
      r.style.backgroundColor = label ? "var(--color-gold)" : "transparent";
      r.style.borderColor = label ? "transparent" : "rgba(var(--bone-rgb),0.75)";

      if (!settled) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("click", onClick, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      running.forEach((a) => a?.cancel());
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("click", onClick);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("no-cursor");
    };
  }, []);

  return (
    <>
      <div ref={trailRef} aria-hidden className="pointer-events-none fixed inset-0 z-[118] hidden overflow-hidden md:block" style={{ contain: "strict" }}>
        {Array.from({ length: POOL }, (_, i) => (
          <span key={i} className="absolute left-0 top-0 block opacity-0" style={{ willChange: "transform, opacity" }} />
        ))}
      </div>
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[120] hidden h-1.5 w-1.5 rounded-full md:block"
        style={{ background: "var(--color-gold)", opacity: 0, transition: "opacity .3s" }}
      />
      <div
        ref={ringRef}
        aria-hidden
        className="theme-dark pointer-events-none fixed left-0 top-0 z-[119] hidden items-center justify-center border mix-blend-difference md:flex"
        style={{ width: BASE, height: BASE, borderRadius: BASE / 2, borderColor: "rgba(var(--bone-rgb),0.75)", opacity: 0, transition: "opacity .3s", willChange: "transform" }}
      >
        <span ref={labelRef} className="font-mono text-[7px] font-bold tracking-[0.18em] opacity-0 transition-opacity" style={{ fontFamily: "var(--font-mono)", color: "var(--color-ink)" }}>
          VIEW
        </span>
      </div>
    </>
  );
}
