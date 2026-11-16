import { applyTheme, type Theme } from "./theme";

/**
 * TIME TUNNEL: the light/dark mode transition.
 *
 * Square "pixel" rings rush at the viewer from a vanishing point, warp streaks
 * fly outward, a portal in the new mode's colour swallows the screen, the
 * palette flips behind it, then the portal dissolves while a second burst of
 * rings flies past and you "arrive" in the other mode.
 *
 * Built so the page's main thread can't make it stutter:
 * - EVERYTHING that moves (portal, rings, streaks) is painted into ONE canvas by a
 *   Web Worker (OffscreenCanvas). It keeps its own clock and frame loop, so it runs
 *   at full frame rate even while the main thread is busy restyling the whole page
 *   for the new palette. One screen-sized layer, no giant DOM textures (the old DOM
 *   portal alone needed a ~2200px layer that had to be rasterised on the first frame).
 * - The worker says when the portal fully covers the screen; only then does the
 *   page flip its palette. The reveal starts once a frame with the new palette has
 *   been produced, so old colours can never peek through.
 * - The caption is the only DOM part: one small WAAPI (compositor) animation.
 * - The stage (worker, canvas) is built when the browser is idle after load, and
 *   the flight plan is pre-computed, so a click only posts one message.
 * - While the screen is covered the page pauses its own per-frame work (3D logo,
 *   halos) so the palette flip finishes as fast as possible.
 * - No worker/OffscreenCanvas support → the same drawing code runs on the main thread.
 */

const PALETTE = {
  dark: { bg: "#0b0a09", fg: "#f2eee5", accent: "#f4602a" },
  light: { bg: "#f3efe6", fg: "#151311", accent: "#d1440f" },
} as const;

type Bez = [number, number, number, number];
const EASE_IN: Bez = [0.7, 0, 0.84, 0]; // portal rush
const EASE_REVEAL: Bez = [0.33, 1, 0.68, 1]; // gentle out-curve: the reveal glides instead of popping
const APPROACH: Bez = [0.55, 0, 1, 0.45]; // things accelerating toward you
const EASE_OUT_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_REVEAL_CSS = `cubic-bezier(${EASE_REVEAL.join(", ")})`;

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
type RingSpec = { rot: number; color: string; start: number; dur: number };
type StreakSpec = { ang: number; color: string; start: number; dur: number };
type Plan = {
  cx: number;
  cy: number;
  S: number;
  ringMax: number;
  R: number;
  L: number;
  bez: Bez;
  rings: RingSpec[];
  streaks: StreakSpec[];
  portal: { start: number; dur: number; bez: Bez; bg: string; accent: string; accent0: string };
  reveal: { delay: number; dur: number; bez: Bez };
};
type Msg =
  | { type: "init"; canvas: OffscreenCanvas | HTMLCanvasElement; w: number; h: number; dpr: number }
  | { type: "resize"; w: number; h: number; dpr: number }
  | { type: "start"; at: number; plan: Plan }
  | { type: "reveal"; at: number }
  | { type: "stop" };
type Out = { type: "covered" } | { type: "done" };

function painter(scope: {
  onmessage: ((e: { data: Msg }) => void) | null;
  postMessage: (m: Out) => void;
  requestAnimationFrame?: (cb: () => void) => unknown;
}) {
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  let cv: OffscreenCanvas | HTMLCanvasElement | null = null;
  let dpr = 1;
  let W = 0;
  let H = 0;
  const sprites = new Map<string, CanvasImageSource>();
  let plan: Plan | null = null;
  let t0 = 0;
  let revealAt = -1;
  let coveredSent = false;
  let running = false;
  const now = () => performance.timeOrigin + performance.now();
  const raf = (cb: () => void) => {
    if (typeof scope.requestAnimationFrame === "function") scope.requestAnimationFrame(cb);
    else setTimeout(cb, 16);
  };

  // cubic-bezier easing (same maths as CSS)
  const bezier = (b: Bez) => {
    const [x1, y1, x2, y2] = b;
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
        if (Math.abs(e) < 1e-5) return sy(t);
        const d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      let lo = 0, hi = 1;
      t = x;
      for (let i = 0; i < 24 && Math.abs(sx(t) - x) > 1e-5; i++) {
        if (sx(t) < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return sy(t);
    };
  };
  let eApproach = bezier([0.55, 0, 1, 0.45]);
  let ePortal = bezier([0.7, 0, 0.84, 0]);
  let eReveal = bezier([0.33, 1, 0.68, 1]);

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

  const clear = () => {
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W * dpr, H * dpr);
  };

  // piecewise-linear opacity keyframes (as WAAPI would interpolate them)
  const ringAlpha = (p: number) => (p < 0.2 ? p / 0.2 : p < 0.75 ? 1 - ((p - 0.2) / 0.55) * 0.1 : 0.9 * (1 - (p - 0.75) / 0.25));
  const streakAlpha = (p: number) => (p < 0.35 ? (p / 0.35) * 0.95 : 0.95 * (1 - (p - 0.35) / 0.65));

  // the portal: a disc in the new mode's colour with a soft accent rim
  const portal = (c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, pl: Plan, r: number, a: number) => {
    if (r <= 0.5 || a <= 0.003) return;
    const { cx, cy } = pl;
    const P = pl.portal;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.globalAlpha = a;
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, P.bg);
    g.addColorStop(0.92, P.bg);
    g.addColorStop(0.99, P.accent);
    g.addColorStop(1, P.accent0);
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();
  };

  const frame = () => {
    if (!running || !ctx || !plan) return;
    const T = now();
    const t = T - t0;
    const c = ctx;
    clear();
    let alive = false;
    const pl = plan;
    const { cx, cy, S, ringMax, R, L } = pl;

    /* portal (bottom layer) */
    if (revealAt < 0) {
      alive = true;
      const pp = (t - pl.portal.start) / pl.portal.dur;
      if (pp > 0) portal(c, pl, R * ePortal(Math.min(1, pp)), 1);
      if (pp >= 1 && !coveredSent) {
        coveredSent = true;
        scope.postMessage({ type: "covered" });
      }
    } else {
      const rp = (T - revealAt - pl.reveal.delay) / pl.reveal.dur;
      if (rp < 1) {
        alive = true;
        const e = eReveal(Math.max(0, rp));
        portal(c, pl, R * (1 + 0.18 * e), 1 - e);
      }
    }

    /* rings */
    for (const r of pl.rings) {
      const lt = t - r.start;
      if (lt < r.dur) alive = true;
      if (lt <= 0 || lt >= r.dur) continue;
      const p = eApproach(lt / r.dur);
      const a = ringAlpha(p);
      if (a <= 0.003) continue;
      const s = 0.02 + (ringMax - 0.02) * p;
      const rot = ((r.rot + 34 * p) * Math.PI) / 180;
      const cs = Math.cos(rot) * s * dpr;
      const sn = Math.sin(rot) * s * dpr;
      // rotate(rot) · scale(s) around the vanishing point; the 2px border scales too
      c.setTransform(cs, sn, -sn, cs, cx * dpr, cy * dpr);
      c.globalAlpha = a;
      c.strokeStyle = r.color;
      c.lineWidth = 2;
      c.strokeRect(-S / 2 + 1, -S / 2 + 1, S - 2, S - 2);
    }

    /* warp streaks */
    for (const st of pl.streaks) {
      const lt = t - st.start;
      if (lt < st.dur) alive = true;
      if (lt <= 0 || lt >= st.dur) continue;
      const p = eApproach(lt / st.dur);
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
      clear();
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
      eApproach = bezier(plan.bez);
      ePortal = bezier(plan.portal.bez);
      eReveal = bezier(plan.reveal.bez);
      for (const s of plan.streaks) sprite(s.color, plan.L); // warm the sprite cache
      t0 = m.at;
      revealAt = -1;
      coveredSent = false;
      if (!running) {
        running = true;
        raf(frame);
      }
    } else if (m.type === "reveal") {
      revealAt = m.at;
    } else if (m.type === "stop") {
      running = false;
      clear();
    }
  };
}

/* ------------------------------------------------------------------------- */
/* Stage: built once (at idle), reused for every trip.                        */
/* ------------------------------------------------------------------------- */
type Stage = {
  root: HTMLDivElement;
  caption: HTMLDivElement;
  send: (m: Msg, transfer?: Transferable[]) => void;
  on: (cb: ((m: Out) => void) | null) => void;
  w: number;
  h: number;
  dpr: number;
};

let stage: Stage | null = null;
let busy = false;
let primed: { next: Theme; plan: Plan } | null = null;

export function isTimeTraveling() {
  return busy;
}

const supported = () => typeof document !== "undefined" && typeof document.body?.animate === "function";
const viewport = () => ({ w: window.innerWidth, h: window.innerHeight, dpr: Math.min(2, window.devicePixelRatio || 1) });

function getStage(): Stage {
  const { w, h, dpr } = viewport();
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
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  const caption = document.createElement("div");
  caption.style.cssText =
    "position:absolute;left:0;width:100%;text-align:center;opacity:0;" +
    "font-family:var(--font-mono);font-size:11px;letter-spacing:0.32em;text-transform:uppercase;";
  root.append(canvas, caption);

  let listener: ((m: Out) => void) | null = null;
  const deliver = (m: Out) => listener?.(m);
  let send: Stage["send"];

  const canWorker =
    typeof Worker !== "undefined" &&
    typeof OffscreenCanvas !== "undefined" &&
    typeof (canvas as HTMLCanvasElement & { transferControlToOffscreen?: unknown }).transferControlToOffscreen === "function";

  let worker: Worker | null = null;
  if (canWorker) {
    try {
      const src = `(${painter.toString()})(self);`;
      const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
      worker = new Worker(url);
      URL.revokeObjectURL(url);
    } catch {
      worker = null; // e.g. a CSP that blocks blob: workers
    }
  }
  if (worker) {
    const wk = worker;
    wk.onmessage = (e) => deliver(e.data as Out);
    send = (m, transfer = []) => wk.postMessage(m, transfer);
    const off = canvas.transferControlToOffscreen();
    send({ type: "init", canvas: off, w, h, dpr }, [off]);
  } else {
    // main-thread fallback: identical drawing code
    const scope = {
      onmessage: null as ((e: { data: Msg }) => void) | null,
      postMessage: (m: Out) => deliver(m),
      requestAnimationFrame: (cb: () => void) => requestAnimationFrame(cb),
    };
    painter(scope);
    send = (m) => scope.onmessage?.({ data: m });
    send({ type: "init", canvas, w, h, dpr });
  }

  stage = { root, caption, send, on: (cb) => (listener = cb), w, h, dpr };
  return stage;
}

const rgba0 = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0)`;
};

function makePlan(next: Theme, w: number, h: number): Plan {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.hypot(w, h) / 2 + 8; // half-diagonal: a disc this big covers everything
  const S = Math.min(w, h) * 0.42;
  const to = PALETTE[next];
  const from = PALETTE[next === "light" ? "dark" : "light"];
  const small = Math.min(w, h) < 700;
  const neutral = "rgba(140,130,118,0.55)"; // reads on both paper and ink
  const rings: RingSpec[] = [];
  const streaks: StreakSpec[] = [];
  const nIn = small ? 7 : 10;
  for (let i = 0; i < nIn; i++) rings.push({ rot: i * 11, color: i % 3 === 2 ? neutral : from.accent, start: i * T.ringInStagger, dur: T.ringIn });
  const sIn = small ? 22 : 36;
  for (let i = 0; i < sIn; i++)
    streaks.push({ ang: Math.random() * 360, color: i % 4 === 0 ? neutral : from.accent, start: Math.random() * T.streakInSpread, dur: T.streakIn + Math.random() * T.streakInJitter });
  // act 2 runs on the painter's own clock: it flies on time even if the main
  // thread is still busy repainting the page under the portal
  const nOut = small ? 5 : 7;
  for (let i = 0; i < nOut; i++) rings.push({ rot: (i + 3) * 11, color: i % 3 === 1 ? neutral : to.accent, start: FLIP_AT + i * T.ringOutStagger, dur: T.ringOut });
  const sOut = small ? 14 : 24;
  for (let i = 0; i < sOut; i++)
    streaks.push({ ang: Math.random() * 360, color: to.accent, start: FLIP_AT + Math.random() * T.streakOutSpread, dur: T.streakIn + Math.random() * T.streakInJitter });
  return {
    cx, cy, S, ringMax: (R * 2.4) / S, R, L: R * 0.42, bez: APPROACH, rings, streaks,
    portal: { start: T.portalDelay, dur: T.portal, bez: EASE_IN, bg: to.bg, accent: to.accent, accent0: rgba0(to.accent) },
    reveal: { delay: T.fadeDelay, dur: T.fade, bez: EASE_REVEAL },
  };
}

const planFits = (p: { next: Theme; plan: Plan } | null, next: Theme, s: Stage) => !!p && p.next === next && p.plan.cx === s.w / 2 && p.plan.cy === s.h / 2;

/** Warm everything up (worker, canvas, plan) — called at idle and when the pointer reaches the toggle. */
export function prepareTimeTravel(next: Theme) {
  if (busy || !supported()) return;
  const s = getStage();
  if (planFits(primed, next, s)) return;
  primed = { next, plan: makePlan(next, s.w, s.h) };
}

type IdleWin = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
const idle = (cb: () => void, timeout = 1500) => {
  const ric = (window as IdleWin).requestIdleCallback;
  if (ric) ric(cb, { timeout });
  else setTimeout(cb, 200);
};

/** Build the stage while the browser has nothing better to do (after load). */
export function warmTimeTravel(next: () => Theme) {
  if (!supported()) return;
  idle(() => prepareTimeTravel(next()), 4000);
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export async function timeTravel(next: Theme): Promise<void> {
  if (busy) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !supported()) {
    applyTheme(next);
    return;
  }
  busy = true;
  const s = getStage();
  const plan = planFits(primed, next, s) ? primed!.plan : makePlan(next, s.w, s.h);
  primed = null;

  const { h } = s;
  const to = PALETTE[next];
  s.caption.style.top = `${h / 2 - 28}px`;
  s.caption.style.color = to.fg;
  s.caption.innerHTML = `<div style="opacity:.55">TIME TRAVEL</div><div style="margin-top:10px;font-family:var(--font-display);font-weight:600;font-size:clamp(28px,4vw,46px);letter-spacing:-0.02em;">→ ${next.toUpperCase()} MODE</div>`;

  let onCovered: () => void = () => {};
  let onDone: () => void = () => {};
  const covered = new Promise<void>((r) => (onCovered = r));
  const painted = new Promise<void>((r) => (onDone = r));
  s.on((m) => (m.type === "covered" ? onCovered() : onDone()));

  document.body.appendChild(s.root);
  // painter clock starts now; the caption's WAAPI clock starts on the next commit (≤1 frame apart)
  s.send({ type: "start", at: performance.timeOrigin + performance.now(), plan });

  const anims: Animation[] = [];
  const play = (frames: Keyframe[], opts: KeyframeAnimationOptions) => {
    const a = s.caption.animate(frames, { fill: "both", ...opts });
    anims.push(a);
    return a;
  };
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  let release = () => {};
  try {
    /* ---------- act 1: the rush (all painted by the worker) ---------- */
    play([{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "scale(1)" }], { duration: T.captionIn, delay: T.captionInDelay, easing: EASE_OUT_CSS });
    await Promise.race([covered, wait(FLIP_AT + 900)]);

    /* ---------- the jump: flip palette while fully covered ---------- */
    signal("covered"); // page pauses its own per-frame work
    release = applyTheme(next, { deferRelease: true });
    // two frames: the first produces the new palette, the second starts after it was committed
    await nextFrame();
    await nextFrame();

    /* ---------- act 2: arrival ---------- */
    s.send({ type: "reveal", at: performance.timeOrigin + performance.now() });
    signal("revealing");
    play([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.08)" }], { duration: T.captionOut, delay: T.captionOutDelay, easing: EASE_REVEAL_CSS });

    await Promise.race([painted, wait(T.fadeDelay + T.fade + T.ringOut + 1500)]);
  } finally {
    s.send({ type: "stop" });
    s.on(null);
    anims.forEach((a) => a.cancel());
    s.root.remove();
    busy = false;
    signal("done");
    // un-freezing transitions restyles the page: do it when the browser is idle,
    // then pre-plan the trip back so the next click is instant as well
    idle(() => {
      release();
      idle(() => prepareTimeTravel(next === "light" ? "dark" : "light"), 3000);
    }, 600);
  }
}
