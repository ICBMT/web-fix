import { applyTheme, type Theme } from "./theme";

/**
 * TIME TUNNEL — the light/dark mode transition.
 *
 * Square "pixel" rings rush at the viewer from a vanishing point, warp streaks
 * fly outward, a portal in the new mode's colour swallows the screen, the
 * palette flips behind it, then the portal dissolves while a second burst of
 * rings flies past — you "arrive" in the other mode.
 *
 * Zero-lag by construction: every moving part animates ONLY transform/opacity
 * through the Web Animations API, which browsers run on the compositor thread.
 * The single expensive moment (re-styling the page for the new palette) happens
 * while the portal fully covers the screen, and even if that frame takes a
 * while, the compositor keeps the tunnel moving smoothly.
 */

const PALETTE = {
  dark: { bg: "#0b0a09", fg: "#f2eee5", accent: "#f4602a" },
  light: { bg: "#f3efe6", fg: "#151311", accent: "#d1440f" },
} as const;

const EASE_IN = "cubic-bezier(0.7, 0, 0.84, 0)"; // portal rush
const EASE_APPROACH = "cubic-bezier(0.55, 0, 1, 0.45)"; // things accelerating toward you
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

/* Timings — trimmed ~12% from the first version and every dead frame removed, so
   it feels snappier while every shape, colour and curve is exactly the same. */
const T = {
  ringIn: 775, ringInStagger: 48,
  streakIn: 420, streakInJitter: 320, streakInSpread: 370,
  portalDelay: 120, portal: 495,
  captionInDelay: 455, captionIn: 230,
  ringOut: 670, ringOutStagger: 40, streakOutSpread: 175,
  captionOutDelay: 105, captionOut: 335,
  fadeDelay: 50, fade: 545,
};

let busy = false;

export function isTimeTraveling() {
  return busy;
}

type Plan = {
  next: Theme;
  w: number;
  h: number;
  root: HTMLDivElement;
  run: () => Promise<void>;
};

let prepared: Plan | null = null;

/**
 * Build the whole tunnel (both acts) ahead of time, detached from the page.
 * The toggle calls this on hover/focus, so by the time you click, the only work
 * left is one appendChild + starting animations; nothing is created mid-flight.
 */
export function prepareTimeTravel(next: Theme) {
  if (busy || typeof document.body.animate !== "function") return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (prepared && prepared.next === next && prepared.w === w && prepared.h === h) return;
  prepared = build(next, w, h);
}

function build(next: Theme, w: number, h: number): Plan {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.hypot(w, h) / 2 + 8; // half-diagonal: a circle this big covers everything
  const to = PALETTE[next];
  const from = PALETTE[next === "light" ? "dark" : "light"];
  const small = Math.min(w, h) < 700;

  /* ---------- overlay (one fixed layer, removed afterwards) ---------- */
  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.style.cssText = "position:fixed;inset:0;z-index:250;pointer-events:none;overflow:hidden;contain:strict;";

  const el = (css: string) => {
    const d = document.createElement("div");
    d.style.cssText = "position:absolute;will-change:transform,opacity;" + css;
    root.appendChild(d);
    return d;
  };

  // portal (new-mode colour) with a soft accent rim
  const cover = el(
    `left:${cx - R}px;top:${cy - R}px;width:${2 * R}px;height:${2 * R}px;border-radius:50%;` +
      `background:radial-gradient(circle, ${to.bg} 0%, ${to.bg} 92%, ${to.accent} 99%, transparent 100%);transform:scale(0);`
  );

  // pixel rings: squares that grow toward the viewer
  const S = Math.min(w, h) * 0.42;
  const ringMax = (R * 2.4) / S;
  const mkRing = (i: number, color: string) =>
    el(`left:${cx - S / 2}px;top:${cy - S / 2}px;width:${S}px;height:${S}px;border:2px solid ${color};opacity:0;` + `transform:rotate(${i * 11}deg) scale(0.02);`);

  // warp streaks radiating from the vanishing point
  const L = R * 0.42;
  const mkStreak = (color: string) => el(`left:${cx - 1}px;top:${cy}px;width:2px;height:${L}px;transform-origin:50% 0;opacity:0;` + `background:linear-gradient(to bottom, transparent, ${color});`);

  const neutral = "rgba(140,130,118,0.55)"; // reads on both paper and ink
  type Streak = { node: HTMLDivElement; ang: number; dur: number; delay: number };
  const streak = (color: string, spread: number): Streak => ({
    node: mkStreak(color),
    ang: Math.random() * 360,
    dur: T.streakIn + Math.random() * T.streakInJitter,
    delay: Math.random() * spread,
  });

  // act 1 nodes
  const ringsIn = Array.from({ length: small ? 7 : 10 }, (_, i) => mkRing(i, i % 3 === 2 ? neutral : from.accent));
  const streaksIn = Array.from({ length: small ? 22 : 36 }, (_, i) => streak(i % 4 === 0 ? neutral : from.accent, T.streakInSpread));
  // act 2 nodes, built now so nothing is created at the critical moment
  const ringsOut = Array.from({ length: small ? 5 : 7 }, (_, i) => mkRing(i + 3, i % 3 === 1 ? neutral : to.accent));
  const streaksOut = Array.from({ length: small ? 14 : 24 }, () => streak(to.accent, T.streakOutSpread));

  // centre caption (on top of everything)
  const caption = el(
    `left:0;top:${cy - 28}px;width:100%;text-align:center;opacity:0;font-family:var(--font-mono);` +
      `font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:${to.fg};`
  );
  caption.innerHTML = `<div style="opacity:.55">TIME TRAVEL</div><div style="margin-top:10px;font-family:var(--font-display);font-weight:600;font-size:clamp(28px,4vw,46px);letter-spacing:-0.02em;">→ ${next.toUpperCase()} MODE</div>`;

  const run = async () => {
    const anims: Animation[] = [];
    const play = (node: HTMLElement, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      const a = node.animate(frames, { fill: "both", ...opts });
      anims.push(a);
      return a;
    };
    const flyRing = (node: HTMLElement, i: number, delay: number, dur: number) =>
      play(
        node,
        [
          { transform: `rotate(${i * 11}deg) scale(0.02)`, opacity: 0 },
          { opacity: 1, offset: 0.2 },
          { opacity: 0.9, offset: 0.75 },
          { transform: `rotate(${i * 11 + 34}deg) scale(${ringMax})`, opacity: 0 },
        ],
        { duration: dur, delay, easing: EASE_APPROACH }
      );
    const flyStreak = ({ node, ang, dur, delay }: Streak) =>
      play(
        node,
        [
          { transform: `rotate(${ang}deg) translateY(${R * 0.04}px) scaleY(0.05)`, opacity: 0 },
          { opacity: 0.95, offset: 0.35 },
          { transform: `rotate(${ang}deg) translateY(${R * 1.05}px) scaleY(1.4)`, opacity: 0 },
        ],
        { duration: dur, delay, easing: EASE_APPROACH }
      );

    document.body.appendChild(root);

    /* ---------- act 1: the rush ---------- */
    ringsIn.forEach((n, i) => flyRing(n, i, i * T.ringInStagger, T.ringIn));
    streaksIn.forEach(flyStreak);
    const portal = play(cover, [{ transform: "scale(0)" }, { transform: "scale(1)" }], { duration: T.portal, delay: T.portalDelay, easing: EASE_IN });
    play(caption, [{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "scale(1)" }], { duration: T.captionIn, delay: T.captionInDelay, easing: EASE_OUT });

    try {
      await portal.finished;
    } catch {
      /* cancelled */
    }

    /* ---------- the jump: flip palette while fully covered ----------
       No waiting frames needed: animations started now get their start time when
       this frame (with the new palette) is committed, so the reveal can never show
       the old colours, and the screen doesn't sit there covered for an extra frame or two. */
    const release = applyTheme(next, { deferRelease: true });

    /* ---------- act 2: arrival ---------- */
    ringsOut.forEach((n, i) => flyRing(n, i + 3, i * T.ringOutStagger, T.ringOut));
    streaksOut.forEach(flyStreak);
    play(caption, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.08)" }], { duration: T.captionOut, delay: T.captionOutDelay, easing: EASE_OUT });
    const fade = play(cover, [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.18)", opacity: 0 }], { duration: T.fade, delay: T.fadeDelay, easing: EASE_OUT });

    try {
      await Promise.all([fade.finished, ...anims.map((a) => a.finished)]);
    } catch {
      /* cancelled */
    }
    anims.forEach((a) => a.cancel());
    root.remove();
    // un-freezing transitions restyles the page; do it now, with nothing animating
    release();
  };

  return { next, w, h, root, run };
}

export async function timeTravel(next: Theme): Promise<void> {
  if (busy) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || typeof document.body.animate !== "function") {
    applyTheme(next);
    return;
  }
  busy = true;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const plan = prepared && prepared.next === next && prepared.w === w && prepared.h === h ? prepared : build(next, w, h);
  prepared = null;
  try {
    await plan.run();
  } finally {
    plan.root.remove();
    busy = false;
  }
}
