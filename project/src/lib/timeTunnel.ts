import { applyTheme, type Theme } from "./theme";
import { TUNNEL_EVENT, type TunnelPhase } from "./tunnelPause";

/**
 * TIME TUNNEL: the light/dark mode transition.
 *
 * Square "pixel" rings rush at the viewer from a vanishing point, warp streaks
 * fly outward, a portal in the new mode's colour swallows the screen, the
 * palette flips behind it, then the portal dissolves while a second burst of
 * rings flies past and you "arrive" in the other mode.
 *
 * Performance design (v3):
 * - A Web Worker owns the whole effect: its own clock, its own frame loop and an
 *   OffscreenCanvas whose frames go straight to the display compositor. Nothing the
 *   page's main thread does (restyling for the new palette, React, GSAP) can delay
 *   a tunnel frame.
 * - It draws with WebGL2: ONE full-screen pass for the portal and ONE instanced draw
 *   call for every ring side and warp streak (anti-aliased quads computed in the
 *   shader). A few microseconds of GPU per frame, no CPU rasterising, no textures.
 *   If WebGL2 isn't available, the same scene is drawn with canvas 2D.
 * - Shaders are compiled and the pipeline is warmed up while the browser is idle
 *   after load, and every trip's flight plan is computed ahead of time, so a click
 *   only posts one message.
 * - While it runs, the page pauses its own GPU work (3D logo, Pixel Vault, halos,
 *   decorative CSS loops; see tunnelPause.ts) and resumes it once the tunnel is gone.
 *   The 3D logo paints one frame in the new palette while the screen is covered.
 * - The palette flips only once the worker reports the screen fully covered, and the
 *   reveal starts once a frame with the new palette has been produced, so old
 *   colours never peek through.
 * - The caption is the only DOM part: one small compositor-only WAAPI animation.
 */

type RGBA = [number, number, number, number];
const hex = (h: string, a = 1): RGBA => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
};

const PALETTE = {
  dark: { bg: "#0b0a09", fg: "#f2eee5", accent: "#f4602a" },
  light: { bg: "#f3efe6", fg: "#151311", accent: "#d1440f" },
} as const;
const NEUTRAL: RGBA = [140 / 255, 130 / 255, 118 / 255, 0.55]; // reads on both paper and ink

type Bez = [number, number, number, number];
const EASE_IN: Bez = [0.7, 0, 0.84, 0]; // portal rush
const EASE_REVEAL: Bez = [0.33, 1, 0.68, 1]; // gentle out-curve: the reveal glides instead of popping
const APPROACH: Bez = [0.55, 0, 1, 0.45]; // things accelerating toward you
const EASE_OUT_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_REVEAL_CSS = `cubic-bezier(${EASE_REVEAL.join(", ")})`;

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

const signal = (phase: TunnelPhase) => window.dispatchEvent(new CustomEvent<TunnelPhase>(TUNNEL_EVENT, { detail: phase }));

/* ------------------------------------------------------------------------- */
/* Painter: runs inside the worker (or on the main thread as a last resort).  */
/* MUST stay self-contained: it's serialised with Function#toString.          */
/* ------------------------------------------------------------------------- */
type RingSpec = { rot: number; col: RGBA; start: number; dur: number };
type StreakSpec = { ang: number; col: RGBA; start: number; dur: number };
type Plan = {
  cx: number; // CSS px
  cy: number;
  S: number;
  ringMax: number;
  R: number;
  L: number;
  bez: Bez;
  rings: RingSpec[];
  streaks: StreakSpec[];
  portal: { start: number; dur: number; bez: Bez; bg: RGBA; accent: RGBA };
  reveal: { delay: number; dur: number; bez: Bez };
};
type Msg =
  | { type: "init"; canvas: OffscreenCanvas | HTMLCanvasElement; w: number; h: number; dpr: number }
  | { type: "resize"; w: number; h: number; dpr: number }
  | { type: "start"; at: number; plan: Plan }
  | { type: "reveal"; at: number }
  | { type: "stop" };
type Stats = { frames: number; ms: number; worst: number; slow: number };
type Out = { type: "ready"; backend: string } | { type: "covered" } | { type: "done"; stats: Stats };

function painter(scope: {
  onmessage: ((e: { data: Msg }) => void) | null;
  postMessage: (m: Out) => void;
  requestAnimationFrame?: (cb: () => void) => unknown;
}) {
  const FLOATS = 11; // per quad: cx, cy, halfLen, halfWidth, cos, sin, r, g, b, a, gradient
  const MAX_QUADS = 256;
  const quads = new Float32Array(MAX_QUADS * FLOATS);
  let nq = 0;
  // portal of the current frame (device px)
  const disc = { on: false, x: 0, y: 0, r: 0, a: 0 };

  let cv: OffscreenCanvas | HTMLCanvasElement | null = null;
  let W = 0; // device px
  let H = 0;
  let dpr = 1;
  let plan: Plan | null = null;
  let t0 = 0;
  let revealAt = -1;
  let coveredSent = false;
  let running = false;
  // frame pacing of the current trip (debug: window.__gpTunnel)
  let fN = 0, fFirst = 0, fLast = 0, fWorst = 0, fSlow = 0;
  const now = () => performance.timeOrigin + performance.now();
  const raf = (cb: () => void) => {
    if (typeof scope.requestAnimationFrame === "function") scope.requestAnimationFrame(cb);
    else setTimeout(cb, 16);
  };

  /* ---------- easing (same maths as CSS cubic-bezier) ---------- */
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

  /* ---------- backend: WebGL2 ---------- */
  type GL = WebGL2RenderingContext;
  let gl: GL | null = null;
  let progQ: WebGLProgram | null = null;
  let progD: WebGLProgram | null = null;
  let vaoQ: WebGLVertexArrayObject | null = null;
  let vaoD: WebGLVertexArrayObject | null = null;
  let instBuf: WebGLBuffer | null = null;
  const uQ: Record<string, WebGLUniformLocation | null> = {};
  const uD: Record<string, WebGLUniformLocation | null> = {};
  let bgD: RGBA = [0, 0, 0, 1];
  let acD: RGBA = [1, 0.4, 0.2, 1];

  const QUAD_VS = `#version 300 es
layout(location=0) in vec2 a_corner;
layout(location=1) in vec4 a_geo;   // centre xy, half length, half width (device px)
layout(location=2) in vec2 a_rot;   // cos, sin of the length axis
layout(location=3) in vec4 a_col;   // straight-alpha colour
layout(location=4) in float a_grad; // 1: alpha ramps 0 -> 1 along the length
uniform vec2 u_res;
out vec2 v_l; out vec2 v_h; out vec4 v_col; out float v_grad;
void main() {
  vec2 h = a_geo.zw;
  vec2 l = a_corner * (h + 1.0);    // 1px apron for anti-aliasing
  vec2 p = a_geo.xy + vec2(l.x * a_rot.x - l.y * a_rot.y, l.x * a_rot.y + l.y * a_rot.x);
  v_l = l; v_h = h; v_col = a_col; v_grad = a_grad;
  vec2 c = p / u_res * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}`;
  const QUAD_FS = `#version 300 es
precision highp float;
in vec2 v_l; in vec2 v_h; in vec4 v_col; in float v_grad;
out vec4 o;
void main() {
  vec2 d = v_h + 0.5 - abs(v_l);
  vec2 cov = clamp(min(d, 2.0 * v_h), 0.0, 1.0);   // analytic coverage, thin-line safe
  float a = v_col.a * cov.x * cov.y;
  if (v_grad > 0.5) a *= clamp(v_l.x / max(v_h.x, 0.001) * 0.5 + 0.5, 0.0, 1.0);
  o = vec4(v_col.rgb * a, a);
}`;
  const DISC_VS = `#version 300 es
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  gl_Position = vec4(p, 0.0, 1.0);
}`;
  const DISC_FS = `#version 300 es
precision highp float;
uniform vec2 u_c; uniform float u_r; uniform float u_a; uniform vec3 u_bg; uniform vec3 u_ac;
out vec4 o;
void main() {
  float d = length(gl_FragCoord.xy - u_c);
  float t = d / u_r;
  vec3 col = mix(u_bg, u_ac, clamp((t - 0.92) / 0.07, 0.0, 1.0));      // soft accent rim
  float a = t < 0.99 ? 1.0 : clamp((1.0 - t) / 0.01, 0.0, 1.0);
  a = min(a, clamp(u_r - d + 0.5, 0.0, 1.0)) * u_a;                     // crisp edge when small
  o = vec4(col * a, a);
}`;

  const compile = (g: GL, vs: string, fs: string) => {
    const mk = (type: number, src: string) => {
      const s = g.createShader(type)!;
      g.shaderSource(s, src);
      g.compileShader(s);
      return s;
    };
    const p = g.createProgram()!;
    g.attachShader(p, mk(g.VERTEX_SHADER, vs));
    g.attachShader(p, mk(g.FRAGMENT_SHADER, fs));
    g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error("tunnel shader: " + g.getProgramInfoLog(p));
    return p;
  };

  const initGL = (g: GL) => {
    progQ = compile(g, QUAD_VS, QUAD_FS);
    progD = compile(g, DISC_VS, DISC_FS);
    uQ.res = g.getUniformLocation(progQ, "u_res");
    for (const k of ["c", "r", "a", "bg", "ac"]) uD[k] = g.getUniformLocation(progD, "u_" + k);

    vaoQ = g.createVertexArray();
    g.bindVertexArray(vaoQ);
    const cornerBuf = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, cornerBuf);
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
    g.enableVertexAttribArray(0);
    g.vertexAttribPointer(0, 2, g.FLOAT, false, 0, 0);
    instBuf = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, instBuf);
    g.bufferData(g.ARRAY_BUFFER, quads.byteLength, g.DYNAMIC_DRAW);
    const stride = FLOATS * 4;
    const attr = (loc: number, size: number, offset: number) => {
      g.enableVertexAttribArray(loc);
      g.vertexAttribPointer(loc, size, g.FLOAT, false, stride, offset * 4);
      g.vertexAttribDivisor(loc, 1);
    };
    attr(1, 4, 0);
    attr(2, 2, 4);
    attr(3, 4, 6);
    attr(4, 1, 10);
    g.bindVertexArray(null);
    vaoD = g.createVertexArray();

    g.disable(g.DEPTH_TEST);
    g.enable(g.BLEND);
    g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA); // premultiplied
    g.clearColor(0, 0, 0, 0);
  };

  const drawGL = () => {
    const g = gl!;
    g.viewport(0, 0, W, H);
    g.clear(g.COLOR_BUFFER_BIT);
    if (disc.on) {
      g.useProgram(progD);
      g.bindVertexArray(vaoD);
      g.uniform2f(uD.c, disc.x, H - disc.y); // gl_FragCoord is bottom-up
      g.uniform1f(uD.r, disc.r);
      g.uniform1f(uD.a, disc.a);
      g.uniform3f(uD.bg, bgD[0], bgD[1], bgD[2]);
      g.uniform3f(uD.ac, acD[0], acD[1], acD[2]);
      // only shade the pixels the disc can touch (it starts as a dot in the middle)
      const x0 = Math.max(0, Math.floor(disc.x - disc.r - 2));
      const y0 = Math.max(0, Math.floor(H - disc.y - disc.r - 2));
      const x1 = Math.min(W, Math.ceil(disc.x + disc.r + 2));
      const y1 = Math.min(H, Math.ceil(H - disc.y + disc.r + 2));
      if (x1 > x0 && y1 > y0) {
        g.enable(g.SCISSOR_TEST);
        g.scissor(x0, y0, x1 - x0, y1 - y0);
        g.drawArrays(g.TRIANGLES, 0, 3);
        g.disable(g.SCISSOR_TEST);
      }
    }
    if (nq) {
      g.useProgram(progQ);
      g.bindVertexArray(vaoQ);
      g.uniform2f(uQ.res, W, H);
      g.bindBuffer(g.ARRAY_BUFFER, instBuf);
      g.bufferSubData(g.ARRAY_BUFFER, 0, quads, 0, nq * FLOATS);
      g.drawArraysInstanced(g.TRIANGLE_STRIP, 0, 4, nq);
    }
  };

  /* ---------- backend: canvas 2D (fallback, same scene) ---------- */
  let c2: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  const css = (r: number, g: number, b: number, a = 1) => `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
  const draw2D = () => {
    const c = c2!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.clearRect(0, 0, W, H);
    if (disc.on && disc.r > 0.5) {
      const g = c.createRadialGradient(disc.x, disc.y, 0, disc.x, disc.y, disc.r);
      g.addColorStop(0, css(bgD[0], bgD[1], bgD[2]));
      g.addColorStop(0.92, css(bgD[0], bgD[1], bgD[2]));
      g.addColorStop(0.99, css(acD[0], acD[1], acD[2]));
      g.addColorStop(1, css(acD[0], acD[1], acD[2], 0));
      c.globalAlpha = disc.a;
      c.fillStyle = g;
      c.beginPath();
      c.arc(disc.x, disc.y, disc.r, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < nq; i++) {
      const o = i * FLOATS;
      const [x, y, hl, hw, co, si, r, g, b, a, grad] = quads.subarray(o, o + FLOATS);
      c.setTransform(co, si, -si, co, x, y);
      c.globalAlpha = a;
      if (grad > 0.5) {
        const lg = c.createLinearGradient(-hl, 0, hl, 0);
        lg.addColorStop(0, css(r, g, b, 0));
        lg.addColorStop(1, css(r, g, b, 1));
        c.fillStyle = lg;
      } else c.fillStyle = css(r, g, b);
      c.fillRect(-hl, -Math.max(hw, 0.5), 2 * hl, 2 * Math.max(hw, 0.5));
    }
  };

  /* ---------- scene ---------- */
  const quad = (x: number, y: number, hl: number, hw: number, co: number, si: number, col: RGBA, a: number, grad: number) => {
    if (nq >= MAX_QUADS) return;
    const o = nq++ * FLOATS;
    quads[o] = x; quads[o + 1] = y; quads[o + 2] = hl; quads[o + 3] = hw;
    quads[o + 4] = co; quads[o + 5] = si;
    quads[o + 6] = col[0]; quads[o + 7] = col[1]; quads[o + 8] = col[2]; quads[o + 9] = col[3] * a;
    quads[o + 10] = grad;
  };
  // piecewise-linear opacity keyframes (as the original WAAPI version interpolated them)
  const ringAlpha = (p: number) => (p < 0.2 ? p / 0.2 : p < 0.75 ? 1 - ((p - 0.2) / 0.55) * 0.1 : 0.9 * (1 - (p - 0.75) / 0.25));
  const streakAlpha = (p: number) => (p < 0.35 ? (p / 0.35) * 0.95 : 0.95 * (1 - (p - 0.35) / 0.65));

  const build = (Tnow: number) => {
    const pl = plan!;
    const t = Tnow - t0;
    const k = dpr;
    const cx = pl.cx * k;
    const cy = pl.cy * k;
    let alive = false;
    nq = 0;

    /* portal */
    disc.on = false;
    if (revealAt < 0) {
      alive = true;
      const pp = (t - pl.portal.start) / pl.portal.dur;
      if (pp > 0) Object.assign(disc, { on: true, x: cx, y: cy, r: pl.R * k * ePortal(Math.min(1, pp)), a: 1 });
      if (pp >= 1 && !coveredSent) {
        coveredSent = true;
        scope.postMessage({ type: "covered" });
      }
    } else {
      const rp = (Tnow - revealAt - pl.reveal.delay) / pl.reveal.dur;
      if (rp < 1) {
        alive = true;
        const e = eReveal(Math.max(0, rp));
        Object.assign(disc, { on: true, x: cx, y: cy, r: pl.R * k * (1 + 0.18 * e), a: 1 - e });
      }
    }

    /* pixel rings: squares growing toward the viewer (2px border scales with them) */
    const half = pl.S / 2;
    for (const r of pl.rings) {
      const lt = t - r.start;
      if (lt < r.dur) alive = true;
      if (lt <= 0 || lt >= r.dur) continue;
      const p = eApproach(lt / r.dur);
      const a = ringAlpha(p);
      if (a <= 0.003) continue;
      const s = (0.02 + (pl.ringMax - 0.02) * p) * k;
      const th = ((r.rot + 34 * p) * Math.PI) / 180;
      for (let side = 0; side < 4; side++) {
        const ang = th + (side * Math.PI) / 2;
        const nx = Math.cos(ang);
        const ny = Math.sin(ang);
        const d = (half - 1) * s;
        // top/bottom sides span the full width, left/right stop short: no doubled corners
        const hl = (side % 2 === 0 ? half - 2 : half) * s;
        quad(cx + nx * d, cy + ny * d, hl, s, -ny, nx, r.col, a, 0);
      }
    }

    /* warp streaks: rotate(ang) translateY(y) scaleY(sy) from the vanishing point */
    for (const st of pl.streaks) {
      const lt = t - st.start;
      if (lt < st.dur) alive = true;
      if (lt <= 0 || lt >= st.dur) continue;
      const p = eApproach(lt / st.dur);
      const a = streakAlpha(p);
      if (a <= 0.003) continue;
      const y = (pl.R * 0.04 + (pl.R * 1.05 - pl.R * 0.04) * p) * k;
      const len = pl.L * (0.05 + 1.35 * p) * k;
      const ang = (st.ang * Math.PI) / 180;
      const dx = -Math.sin(ang);
      const dy = Math.cos(ang);
      const m = y + len / 2;
      quad(cx + dx * m, cy + dy * m, len / 2, k, dx, dy, st.col, a, 1);
    }
    return alive;
  };

  const clearAll = () => {
    nq = 0;
    disc.on = false;
    if (gl) drawGL();
    else if (c2) draw2D();
  };

  const frame = () => {
    if (!running || !plan) return;
    const tn = now();
    if (fN) {
      const d = tn - fLast;
      if (d > fWorst) fWorst = d;
      if (d > 25) fSlow++;
    } else fFirst = tn;
    fN++;
    fLast = tn;
    const alive = build(tn);
    if (gl) drawGL();
    else if (c2) draw2D();
    if (alive) raf(frame);
    else {
      clearAll();
      running = false;
      scope.postMessage({ type: "done", stats: { frames: fN, ms: Math.round(fLast - fFirst), worst: Math.round(fWorst), slow: fSlow } });
    }
  };

  const size = (w: number, h: number, d: number) => {
    dpr = d;
    W = Math.max(1, Math.round(w * d));
    H = Math.max(1, Math.round(h * d));
    if (cv) {
      cv.width = W;
      cv.height = H;
    }
  };

  scope.onmessage = (e) => {
    const m = e.data;
    if (m.type === "init") {
      cv = m.canvas;
      size(m.w, m.h, m.dpr);
      let backend = "2d";
      try {
        const g = cv.getContext("webgl2", {
          alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
          preserveDrawingBuffer: false, powerPreference: "default",
        }) as GL | null;
        if (g) {
          initGL(g);
          gl = g;
          backend = "webgl2";
        }
      } catch {
        gl = null;
      }
      if (!gl) c2 = cv.getContext("2d", { alpha: true }) as CanvasRenderingContext2D;
      // warm-up: run the whole pipeline once (shader compile + first draw) now, not on the first click
      nq = 0;
      quad(1, 1, 1, 1, 1, 0, [0, 0, 0, 0], 0, 1);
      Object.assign(disc, { on: true, x: 0, y: 0, r: 1, a: 0 });
      if (gl) drawGL();
      else if (c2) draw2D();
      clearAll();
      scope.postMessage({ type: "ready", backend });
    } else if (m.type === "resize") {
      size(m.w, m.h, m.dpr);
    } else if (m.type === "start") {
      plan = m.plan;
      eApproach = bezier(plan.bez);
      ePortal = bezier(plan.portal.bez);
      eReveal = bezier(plan.reveal.bez);
      bgD = plan.portal.bg;
      acD = plan.portal.accent;
      t0 = m.at;
      revealAt = -1;
      coveredSent = false;
      if (!running) {
        fN = fWorst = fSlow = 0;
        running = true;
        raf(frame);
      }
    } else if (m.type === "reveal") {
      revealAt = m.at;
    } else if (m.type === "stop") {
      running = false;
      clearAll();
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
  backend: string;
};

let stage: Stage | null = null;
let busy = false;
let primed: { next: Theme; plan: Plan } | null = null;

export function isTimeTraveling() {
  return busy;
}
/** Which renderer the tunnel ended up with ("webgl2" / "2d" / "main-2d"); handy for debugging. */
export function tunnelBackend() {
  return stage?.backend ?? "none";
}

const supported = () => typeof document !== "undefined" && typeof document.body?.animate === "function";

/** Canvas resolution: crisp up to 2x, but never more than ~2.4M pixels. Every tunnel
 *  frame is full-screen, so on laptop / 4K / TV screens the pixel count is what costs;
 *  the soft rings and streaks look the same at this budget (the compositor upscales). */
const viewport = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  let dpr = Math.min(2, window.devicePixelRatio || 1);
  const MAX_PX = 2_400_000;
  if (w * h * dpr * dpr > MAX_PX) dpr = Math.sqrt(MAX_PX / (w * h));
  return { w, h, dpr: Math.round(dpr * 100) / 100 };
};

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
  const st = { root, caption, w, h, dpr, backend: "pending" } as Stage;
  const deliver = (m: Out) => {
    if (m.type === "ready") {
      st.backend = m.backend;
      root.dataset.backend = m.backend; // visible in devtools: which renderer the tunnel uses
    }
    else listener?.(m);
  };

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
    st.send = (m, transfer = []) => wk.postMessage(m, transfer);
    const off = canvas.transferControlToOffscreen();
    st.send({ type: "init", canvas: off, w, h, dpr }, [off]);
  } else {
    // last resort: identical scene on the main thread
    const scope = {
      onmessage: null as ((e: { data: Msg }) => void) | null,
      postMessage: (m: Out) => deliver(m.type === "ready" ? { type: "ready", backend: "main-" + m.backend } : m),
      requestAnimationFrame: (cb: () => void) => requestAnimationFrame(cb),
    };
    painter(scope);
    st.send = (m) => scope.onmessage?.({ data: m });
    st.send({ type: "init", canvas, w, h, dpr });
  }

  st.on = (cb) => (listener = cb);
  stage = st;
  return stage;
}

function makePlan(next: Theme, w: number, h: number): Plan {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.hypot(w, h) / 2 + 8; // half-diagonal: a disc this big covers everything
  const S = Math.min(w, h) * 0.42;
  const to = PALETTE[next];
  const from = PALETTE[next === "light" ? "dark" : "light"];
  const toAc = hex(to.accent);
  const fromAc = hex(from.accent);
  const small = Math.min(w, h) < 700;
  const rings: RingSpec[] = [];
  const streaks: StreakSpec[] = [];
  const nIn = small ? 7 : 10;
  for (let i = 0; i < nIn; i++) rings.push({ rot: i * 11, col: i % 3 === 2 ? NEUTRAL : fromAc, start: i * T.ringInStagger, dur: T.ringIn });
  const sIn = small ? 22 : 36;
  for (let i = 0; i < sIn; i++)
    streaks.push({ ang: Math.random() * 360, col: i % 4 === 0 ? NEUTRAL : fromAc, start: Math.random() * T.streakInSpread, dur: T.streakIn + Math.random() * T.streakInJitter });
  // act 2 runs on the painter's own clock: it flies on time even if the main
  // thread is still busy repainting the page under the portal
  const nOut = small ? 5 : 7;
  for (let i = 0; i < nOut; i++) rings.push({ rot: (i + 3) * 11, col: i % 3 === 1 ? NEUTRAL : toAc, start: FLIP_AT + i * T.ringOutStagger, dur: T.ringOut });
  const sOut = small ? 14 : 24;
  for (let i = 0; i < sOut; i++)
    streaks.push({ ang: Math.random() * 360, col: toAc, start: FLIP_AT + Math.random() * T.streakOutSpread, dur: T.streakIn + Math.random() * T.streakInJitter });
  return {
    cx, cy, S, ringMax: (R * 2.4) / S, R, L: R * 0.42, bez: APPROACH, rings, streaks,
    portal: { start: T.portalDelay, dur: T.portal, bez: EASE_IN, bg: hex(to.bg), accent: toAc },
    reveal: { delay: T.fadeDelay, dur: T.fade, bez: EASE_REVEAL },
  };
}

const planFits = (p: { next: Theme; plan: Plan } | null, next: Theme, s: Stage) => !!p && p.next === next && p.plan.cx === s.w / 2 && p.plan.cy === s.h / 2;

/** Warm everything up (worker, shaders, plan): called at idle and when the pointer reaches the toggle. */
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

/** Build the stage and compile the shaders while the browser has nothing better to do. */
export function warmTimeTravel(next: () => Theme) {
  if (!supported()) return;
  idle(() => prepareTimeTravel(next()), 4000);
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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

  const to = PALETTE[next];
  s.caption.style.top = `${s.h / 2 - 28}px`;
  s.caption.style.color = to.fg;
  s.caption.innerHTML = `<div style="opacity:.55">TIME TRAVEL</div><div style="margin-top:10px;font-family:var(--font-display);font-weight:600;font-size:clamp(28px,4vw,46px);letter-spacing:-0.02em;">→ ${next.toUpperCase()} MODE</div>`;

  let onCovered: () => void = () => {};
  let onDone: () => void = () => {};
  const covered = new Promise<void>((r) => (onCovered = r));
  const painted = new Promise<void>((r) => (onDone = r));
  s.on((m) => {
    if (m.type === "covered") onCovered();
    else if (m.type === "done") {
      // debugging aid: `__gpTunnel` in the console shows the renderer and how the last trip paced
      (window as Window & { __gpTunnel?: unknown }).__gpTunnel = { backend: s.backend, viewport: `${s.w}x${s.h}@${s.dpr}`, ...m.stats };
      onDone();
    }
  });

  document.body.appendChild(s.root);
  signal("start"); // page parks its own GPU work for the duration
  s.send({ type: "start", at: performance.timeOrigin + performance.now(), plan });

  const anims: Animation[] = [];
  const play = (frames: Keyframe[], opts: KeyframeAnimationOptions) => {
    const a = s.caption.animate(frames, { fill: "both", ...opts });
    anims.push(a);
  };

  let release = () => {};
  try {
    /* ---------- act 1: the rush (all painted by the worker) ---------- */
    play([{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "scale(1)" }], { duration: T.captionIn, delay: T.captionInDelay, easing: EASE_OUT_CSS });
    await Promise.race([covered, wait(FLIP_AT + 900)]);

    /* ---------- the jump: flip palette while fully covered ---------- */
    signal("covered");
    release = applyTheme(next, { deferRelease: true });
    // three frames: the first produces the new palette, the second starts once it was
    // committed, and the third can only start once it was rasterised (the next commit
    // waits for that). Big screens need the most raster time; revealing earlier would
    // make the GPU re-rasterise the page in the middle of the fade.
    await nextFrame();
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
    release(); // no-op on modern browsers (transitions were finished in place)
    // pre-plan the trip back so the next click is instant as well
    idle(() => prepareTimeTravel(next === "light" ? "dark" : "light"), 3000);
  }
}
