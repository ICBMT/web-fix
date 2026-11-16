import { applyTheme, type Theme } from "./theme";

/**
 * TIME TUNNEL: the light/dark mode transition.
 *
 * Square "pixel" rings rush at the viewer from a vanishing point, warp streaks
 * fly outward, a portal in the new mode's colour swallows the screen, the
 * palette flips behind it, then the portal dissolves while a second burst of
 * rings flies past and you "arrive" in the other mode.
 *
 * Built for smoothness:
 * - Rings + streaks are painted into ONE canvas by a Web Worker (OffscreenCanvas).
 *   They keep moving at full frame rate even while the main thread is busy
 *   restyling the page for the new palette, and it's a single GPU layer instead of
 *   ~80 huge ones (the previous DOM rings each needed a ~1800px texture).
 * - The portal + caption are two WAAPI (compositor) animations.
 * - The stage (worker, canvas, sprites) is built once and reused, and warmed up
 *   when the pointer reaches the toggle; a click only posts one message.
 * - While the portal fully covers the screen, the page is told to pause its own
 *   per-frame work (3D logo, halos) so the repaint finishes as fast as possible.
 * - No worker/OffscreenCanvas support → the same drawing code runs on the main thread.
 */

const PALETTE = {
  dark: { bg: "#0b0a09", fg: "#f2eee5", accent: "#f4602a" },
  light: { bg: "#f3efe6", fg: "#151311", accent: "#d1440f" },
} as const;

const EASE_IN = "cubic-bezier(0.7, 0, 0.84, 0)"; // portal rush
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_REVEAL = "cubic-bezier(0.33, 1, 0.68, 1)"; // gentler out-curve: the reveal glides instead of popping
const APPROACH: [number, number, number, number] = [0.55, 0, 1, 0.45]; // things accelerating toward you

/* Timings sit between the original cut and the "snappy" cut: brisk, but with
   room for the motion to breathe. */
const T = {
  ringIn: 840, ringInStagger: 52,
  streakIn: 450, streakInJitter: 340, streakInSpread: 400,
  portalDelay: 130, portal: 530,
  captionInDelay: 490, captionIn: 250,
  ringOut: 730, ringOutStagger: 43, streakOutSpread: 190,
  captionOutDelay: 115, captionOut: 380,
  fadeDelay: 55, fade: 640,
};
const FLIP_AT = T.portalDelay + T.portal;

/** Page-wide signal so heavy per-frame work can pause while the screen is covered. */
export type TunnelPhase = "covered" | "revealing" | "done";
export const TUNNEL_EVENT = "gp-tunnel";
const signal = (phase: TunnelPhase) => window.dispatchEvent(new CustomEvent<TunnelPhase>(TUNNEL_EVENT, { detail: phase }));

/* ------------------------------------------------------------------------- */
/* Painter: runs inside the worker (or on the main thread as a fallback).     */
/* MUST stay self-contained: it's serialised with Function#toString.          */
/* ------------------------------------------------------------------------- */
type Msg =
  | { type: "init"; canvas: OffscreenCanvas | HTMLCanvasElement; w: number; h: number; dpr: number }
  | { type: "resize"; w: number; h: number; dpr: number }
  | { type: "start"; at: number; plan: Plan };

type RingSpec = { rot: number; color: string; start: number; dur: number };
type StreakSpec = { ang: number; color: string; start: number; dur: number };
type Plan = { cx: number; cy: number; S: number; ringMax: number; R: number; L: number; bez: [number, number, number, number]; rings: RingSpec[]; streaks: StreakSpec[] };

function painter(scope: { onmessage: ((e: { data: Msg }) => void) | null; postMessage: (m: unknown) => void }) {
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  let cv: OffscreenCanvas | HTMLCanvasElement | null = null;
  let dpr = 1;
  let W = 0;
  let H = 0;
  const sprites = new Map<string, CanvasImageSource>();
  let plan: Plan | null = null;
  let t0 = 0;
  let running = false;
  const now = () => performance.timeOrigin + performance.now();
  const raf: (cb: () => void) => void =
    typeof (scope as unknown as { requestAnimationFrame?: unknown }).requestAnimationFrame === "function"
      ? (cb) => (scope as unknown as { requestAnimationFrame: (cb: () => void) => void }).requestAnimationFrame(cb)
      : (cb) => setTimeout(cb, 16);

  // cubic-bezier easing (same maths as CSS)
  const bezier = (x1: number, y1: number, x2: number, y2: number) => {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sy = (t: number) => ((ay * t + by) * t + cy) * t;
    const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
    return (x: number) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const e = sx(t) - x;
        if (Math.abs(e) < 1e-5) break;
        const d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      let lo = 0, hi = 1;
      for (let i = 0; i < 20 && Math.abs(sx(t) - x) > 1e-5; i++) {
        if (sx(t) < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return sy(t);
    };
  };
  let ease = bezier(0.55, 0, 1, 0.45);

  const mkCanvas = (w: number, h: number): OffscreenCanvas | HTMLCanvasElement => {
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  };

  // gradient streak (transparent → colour), pre-rendered once per colour/length
  const sprite = (color: string, L: number) => {
    const key = color + "|" + Math.round(L) + "|" + dpr;
    let s = sprites.get(key);
    if (!s) {
      const c = mkCanvas(Math.max(2, Math.round(2 * dpr)), Math.max(2, Math.round(L * dpr)));
      const g = c.getContext("2d") as CanvasRenderingContext2D;
      const grad = g.createLinearGradient(0, 0, 0, c.height);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, color);
      g.fillStyle = grad;
      g.fillRect(0, 0, c.width, c.height);
      s = c as CanvasImageSource;
      sprites.set(key, s);
    }
    return s;
  };

  const size = (w: number, h: number, d: number) => {
    W = w;
    H = h;
    dpr = d;
    if (cv) {
      cv.width = Math.round(w * d);
      cv.height = Math.round(h * d);
    }
  };

  // piecewise-linear opacity keyframes (WAAPI interpolates linearly between offsets)
  const ringAlpha = (p: number) => (p < 0.2 ? p / 0.2 : p < 0.75 ? 1 - ((p - 0.2) / 0.55) * 0.1 : 0.9 * (1 - (p - 0.75) / 0.25));
  const streakAlpha = (p: number) => (p < 0.35 ? (p / 0.35) * 0.95 : 0.95 * (1 - (p - 0.35) / 0.65));

  const frame = () => {
    if (!running || !ctx || !plan) return;
    const t = now() - t0;
    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W * dpr, H * dpr);
    let alive = false;

    const { cx, cy, S, ringMax, R, L } = plan;
    for (const r of plan.rings) {
      const lt = t - r.start;
      if (lt < r.dur) alive = true;
      if (lt <= 0 || lt >= r.dur) continue;
      const p = ease(lt / r.dur);
      const a = ringAlpha(p);
      if (a <= 0.003) continue;
      const s = 0.02 + (ringMax - 0.02) * p;
      const rot = ((r.rot + 34 * p) * Math.PI) / 180;
      const cs = Math.cos(rot) * s * dpr;
      const sn = Math.sin(rot) * s * dpr;
      c.setTransform(cs, sn, -sn, cs, cx * dpr, cy * dpr);
      c.globalAlpha = a;
      c.strokeStyle = r.color;
      c.lineWidth = 2;
      c.strokeRect(-S / 2 + 1, -S / 2 + 1, S - 2, S - 2);
    }
    for (const st of plan.streaks) {
      const lt = t - st.start;
      if (lt < st.dur) alive = true;
      if (lt <= 0 || lt >= st.dur) continue;
      const p = ease(lt / st.dur);
      const a = streakAlpha(p);
      if (a <= 0.003) continue;
      const y = R * 0.04 + (R * 1.05 - R * 0.04) * p;
      const sy = 0.05 + (1.4 - 0.05) * p;
      const ang = (st.ang * Math.PI) / 180;
      const co = Math.cos(ang) * dpr;
      const si = Math.sin(ang) * dpr;
      // rotate(ang) · translateY(y) · scaleY(sy), origin at the vanishing point
      c.setTransform(co, si, -si * sy, co * sy, cx * dpr - si * y, cy * dpr + co * y);
      c.globalAlpha = a;
      c.drawImage(sprite(st.color, L), -1, 0, 2, L);
    }
    c.globalAlpha = 1;

    if (alive) raf(frame);
    else {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, W * dpr, H * dpr);
      running = false;
      scope.postMessage({ type: "done" });
    }
  };

  scope.onmessage = (e) => {
    const m = e.data;
    if (m.type === "init") {
      cv = m.canvas;
      ctx = cv.getContext("2d", { alpha: true }) as CanvasRenderingContext2D;
      size(m.w, m.h, m.dpr);
    } else if (m.type === "resize") {
      size(m.w, m.h, m.dpr);
    } else if (m.type === "start") {
      plan = m.plan;
      ease = bezier(...plan.bez);
      // warm the sprite cache before the first frame
      for (const s of plan.streaks) sprite(s.color, plan.L);
      t0 = m.at;
      if (!running) {
        running = true;
        raf(frame);
      }
    }
  };
}

/* ------------------------------------------------------------------------- */
/* Stage: built once, reused for every trip.                                  */
/* ------------------------------------------------------------------------- */
type Stage = {
  root: HTMLDivElement;
  cover: HTMLDivElement;
  canvas: HTMLCanvasElement;
  caption: HTMLDivElement;
  send: (m: Msg, transfer?: Transferable[]) => void;
  onDone: (cb: () => void) => void;
  w: number;
  h: number;
  dpr: number;
};

let stage: Stage | null = null;
let busy = false;
let primed: { next: Theme; plan: Plan; small: boolean } | null = null;

export function isTimeTraveling() {
  return busy;
}

function getStage(): Stage {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (stage) {
    if (stage.w !== w || stage.h !== h || stage.dpr !== dpr) {
      stage.w = w;
      stage.h = h;
      stage.dpr = dpr;
      stage.send({ type: "resize", w, h, dpr });
    }
    return stage;
  }

  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.style.cssText = "position:fixed;inset:0;z-index:250;pointer-events:none;overflow:hidden;contain:strict;";
  const cover = document.createElement("div");
  cover.style.cssText = "position:absolute;left:0;top:0;border-radius:50%;transform:scale(0);will-change:transform,opacity;";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  const caption = document.createElement("div");
  caption.style.cssText =
    "position:absolute;left:0;width:100%;text-align:center;opacity:0;will-change:transform,opacity;" +
    "font-family:var(--font-mono);font-size:11px;letter-spacing:0.32em;text-transform:uppercase;";
  root.append(cover, canvas, caption);

  let doneCb: (() => void) | null = null;
  let send: Stage["send"];

  const canWorker =
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof (canvas as HTMLCanvasElement & { transferControlToOffscreen?: unknown }).transferControlToOffscreen === "function";

  if (canWorker) {
    const src = `(${painter.toString()})(self);`;
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = (e) => {
      if (e.data?.type === "done") doneCb?.();
    };
    send = (m, transfer = []) => worker.postMessage(m, transfer);
    const off = canvas.transferControlToOffscreen();
    send({ type: "init", canvas: off, w, h, dpr }, [off]);
  } else {
    // main-thread fallback: identical drawing code
    const scope = {
      onmessage: null as ((e: { data: Msg }) => void) | null,
      postMessage: (m: unknown) => (m as { type: string }).type === "done" && doneCb?.(),
      requestAnimationFrame: (cb: () => void) => requestAnimationFrame(cb),
    };
    painter(scope);
    send = (m) => scope.onmessage?.({ data: m });
    send({ type: "init", canvas, w, h, dpr });
  }

  stage = { root, cover, canvas, caption, send, onDone: (cb) => (doneCb = cb), w, h, dpr };
  return stage;
}

function makePlan(next: Theme, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.hypot(w, h) / 2 + 8;
  const S = Math.min(w, h) * 0.42;
  const to = PALETTE[next];
  const from = PALETTE[next === "light" ? "dark" : "light"];
  const small = Math.min(w, h) < 700;
  const neutral = "rgba(140,130,118,0.55)";
  const rings: RingSpec[] = [];
  const streaks: StreakSpec[] = [];
  const nIn = small ? 7 : 10;
  for (let i = 0; i < nIn; i++) rings.push({ rot: i * 11, color: i % 3 === 2 ? neutral : from.accent, start: i * T.ringInStagger, dur: T.ringIn });
  const sIn = small ? 22 : 36;
  for (let i = 0; i < sIn; i++)
    streaks.push({ ang: Math.random() * 360, color: i % 4 === 0 ? neutral : from.accent, start: Math.random() * T.streakInSpread, dur: T.streakIn + Math.random() * T.streakInJitter });
  // act 2 is scheduled on the painter's own clock: it flies on time even if the
  // main thread is still busy repainting the page under the portal
  const nOut = small ? 5 : 7;
  for (let i = 0; i < nOut; i++) rings.push({ rot: (i + 3) * 11, color: i % 3 === 1 ? neutral : to.accent, start: FLIP_AT + i * T.ringOutStagger, dur: T.ringOut });
  const sOut = small ? 14 : 24;
  for (let i = 0; i < sOut; i++)
    streaks.push({ ang: Math.random() * 360, color: to.accent, start: FLIP_AT + Math.random() * T.streakOutSpread, dur: T.streakIn + Math.random() * T.streakInJitter });
  const plan: Plan = { cx, cy, S, ringMax: (R * 2.4) / S, R, L: R * 0.42, bez: APPROACH, rings, streaks };
  return { plan, small };
}

/** Warm everything up (worker, canvas, plan) while the pointer approaches the toggle. */
export function prepareTimeTravel(next: Theme) {
  if (busy || typeof document.body.animate !== "function") return;
  const s = getStage();
  if (primed && primed.next === next && primed.plan.cx === s.w / 2 && primed.plan.cy === s.h / 2) return;
  primed = { next, ...makePlan(next, s.w, s.h) };
}

export async function timeTravel(next: Theme): Promise<void> {
  if (busy) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || typeof document.body.animate !== "function") {
    applyTheme(next);
    return;
  }
  busy = true;
  const s = getStage();
  const { plan } = primed && primed.next === next && primed.plan.cx === s.w / 2 && primed.plan.cy === s.h / 2 ? primed : makePlan(next, s.w, s.h);
  primed = null;

  const { w, h } = s;
  const R = plan.R;
  const to = PALETTE[next];
  s.cover.style.left = `${w / 2 - R}px`;
  s.cover.style.top = `${h / 2 - R}px`;
  s.cover.style.width = s.cover.style.height = `${2 * R}px`;
  s.cover.style.background = `radial-gradient(circle, ${to.bg} 0%, ${to.bg} 92%, ${to.accent} 99%, transparent 100%)`;
  s.caption.style.top = `${h / 2 - 28}px`;
  s.caption.style.color = to.fg;
  s.caption.innerHTML = `<div style="opacity:.55">TIME TRAVEL</div><div style="margin-top:10px;font-family:var(--font-display);font-weight:600;font-size:clamp(28px,4vw,46px);letter-spacing:-0.02em;">→ ${next.toUpperCase()} MODE</div>`;

  const painted = new Promise<void>((r) => s.onDone(r));
  document.body.appendChild(s.root);
  // painter clock starts now; WAAPI starts on the next commit (≤1 frame apart)
  s.send({ type: "start", at: performance.timeOrigin + performance.now(), plan });

  const anims: Animation[] = [];
  const play = (node: HTMLElement, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
    const a = node.animate(frames, { fill: "both", ...opts });
    anims.push(a);
    return a;
  };

  let release = () => {};
  try {
    /* ---------- act 1: the rush ---------- */
    const portal = play(s.cover, [{ transform: "scale(0)", opacity: 1 }, { transform: "scale(1)", opacity: 1 }], { duration: T.portal, delay: T.portalDelay, easing: EASE_IN });
    play(s.caption, [{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "scale(1)" }], { duration: T.captionIn, delay: T.captionInDelay, easing: EASE_OUT });
    await portal.finished.catch(() => {});

    /* ---------- the jump: flip palette while fully covered ---------- */
    signal("covered"); // page pauses its own per-frame work
    release = applyTheme(next, { deferRelease: true });

    /* ---------- act 2: arrival ----------
       Started now, these get their start time when the frame with the new palette
       commits, so the reveal can never show old colours. */
    play(s.caption, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.08)" }], { duration: T.captionOut, delay: T.captionOutDelay, easing: EASE_REVEAL });
    const fade = play(s.cover, [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.18)", opacity: 0 }], { duration: T.fade, delay: T.fadeDelay, easing: EASE_REVEAL });
    void fade.ready.then(() => signal("revealing"));

    await Promise.all([fade.finished.catch(() => {}), Promise.race([painted, new Promise((r) => setTimeout(r, 2500))])]);
  } finally {
    anims.forEach((a) => a.cancel());
    s.root.remove();
    busy = false;
    signal("done");
    // un-freezing transitions restyles the page: do it when the browser is idle
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
    if (ric) ric(release, { timeout: 300 });
    else setTimeout(release, 60);
  }
}
