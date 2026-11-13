import * as THREE from "three";

/**
 * PIXEL VAULT — the Work Archive hero.
 *
 * Every project image is resampled into a grid of glowing square "pixels"
 * (one GL point each). The grid:
 *  - rains in and assembles on intro,
 *  - dissolves pixel-by-pixel from one project to the next (diagonal sweep),
 *  - sits dimmed until a cursor "lens" reveals true colour and pushes pixels away,
 *  - fires a shockwave on click,
 *  - scatters into depth as the hero scrolls away.
 * When nobody is pointing, an autopilot lens drifts on a Lissajous path so the
 * effect is alive on touch devices and at first glance.
 */

const VERT = /* glsl */ `
uniform float uTime;
uniform float uMix;
uniform float uIntro;
uniform float uScatter;
uniform float uSize;
uniform float uDpr;
uniform float uHover;
uniform float uDim;
uniform float uMotion;
uniform float uLens;
uniform vec2 uMouse;
uniform vec2 uRes;
uniform vec3 uWave;
attribute vec2 aSeed;
attribute vec3 aColA;
attribute vec3 aColB;
varying vec3 vCol;
varying float vAlpha;
varying float vGlow;

void main() {
  vec3 p = position;
  vec2 n = p.xy / uRes;               // -0.5 .. 0.5
  float scale = 1.0;
  float glow = 0.0;

  // ---- project dissolve: diagonal sweep + per-pixel noise ----
  float sweep = clamp((n.x + 0.5) * 0.62 + (0.5 - n.y) * 0.18 + aSeed.x * 0.2, 0.0, 1.0);
  float k = smoothstep(sweep, sweep + 0.08, uMix * 1.1);
  float pop = sin(k * 3.14159265) * uMotion;
  scale += pop * 0.9;
  p.y += pop * uSize * 0.6;
  glow += pop * 0.35;
  vec3 col = mix(aColA, aColB, k);

  // ---- intro: pixel rain assembling into the grid ----
  float ip = clamp(uIntro * 1.7 - (aSeed.y * 0.5 + (n.x + 0.5) * 0.2), 0.0, 1.0);
  float e = 1.0 - pow(1.0 - ip, 3.0);
  vec2 from = vec2(p.x + (aSeed.x - 0.5) * uRes.x * 0.35, p.y + uRes.y * (0.7 + aSeed.y * 0.9));
  p.xy = mix(from, p.xy, e);
  float alpha = smoothstep(0.0, 0.25, ip);

  // ---- cursor lens: repel + reveal ----
  vec2 d = p.xy - uMouse;
  float dist = length(d);
  float R = uLens;
  float f = exp(-(dist * dist) / (R * R)) * uHover;
  vec2 dir = dist > 0.001 ? d / dist : vec2(0.0);
  p.xy += dir * f * R * 0.42 * uMotion;
  scale += f * 0.7;
  float ring = exp(-pow((dist - R * 1.05) / (R * 0.10), 2.0)) * uHover;
  glow += ring * 0.6;

  // ---- click shockwave ----
  if (uWave.z >= 0.0) {
    float wr = uWave.z * 1100.0;
    vec2 wd = p.xy - uWave.xy;
    float wl = length(wd);
    float w = exp(-pow((wl - wr) / 70.0, 2.0)) * exp(-uWave.z * 1.4);
    p.xy += (wl > 0.001 ? wd / wl : vec2(0.0)) * w * 46.0 * uMotion;
    scale += w * 1.4;
    glow += w * 0.8;
  }

  // ---- scanning band + shimmer ----
  float scanY = uRes.y * 0.5 - mod(uTime * 120.0, uRes.y * 1.6);
  float band = exp(-pow((p.y - scanY) / 26.0, 2.0)) * uMotion;
  float tw = 0.92 + 0.08 * sin(uTime * 1.7 + aSeed.x * 40.0) * uMotion;

  // ---- dim mosaic, the lens reveals true colour ----
  float vig = smoothstep(0.95, 0.15, length(n * vec2(1.15, 1.35)));
  col *= mix(uDim, 1.08, f) * tw + band * 0.18;
  alpha *= max(mix(0.16, 1.0, vig), f);

  // ---- scroll scatter ----
  float s = uScatter;
  p.xy += (aSeed - 0.5) * uRes * s * 0.9 + vec2(0.0, s * uRes.y * 0.35 * (0.4 + aSeed.y));
  scale *= 1.0 + s * 2.2 * aSeed.x;
  alpha *= 1.0 - smoothstep(0.2, 0.9, s);

  vCol = col;
  vAlpha = alpha;
  vGlow = glow;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * uDpr * scale * 0.84;
}
`;

const FRAG = /* glsl */ `
varying vec3 vCol;
varying float vAlpha;
varying float vGlow;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float edge = max(abs(c.x), abs(c.y));
  vec3 col = vCol + (0.5 - edge) * 0.06;   // tiny bevel
  col = mix(col, vec3(0.957, 0.376, 0.165), clamp(vGlow, 0.0, 1.0) * 0.6);
  gl_FragColor = vec4(col, vAlpha);
}
`;

export type VaultOptions = {
  images: string[];
  onChange?: (index: number) => void;
  onProgress?: (p: number) => void;
  reducedMotion?: boolean;
};

const INTERVAL = 5.2; // seconds per project
const TRANSITION = 1.7; // dissolve duration
const INTRO = 2.6;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = THREE.MathUtils.damp;

export class PixelVault {
  private canvas: HTMLCanvasElement;
  private opts: VaultOptions;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000);
  private mat: THREE.ShaderMaterial;
  private geo: THREE.BufferGeometry | null = null;
  private points: THREE.Points | null = null;
  private imgs: (HTMLImageElement | null)[] = [];
  private samples: Float32Array[] = [];
  private cols = 0;
  private rows = 0;
  private tile = 10;
  private w = 0;
  private h = 0;

  private cur = 0;
  private next = -1;
  private mixT = 0;
  private autoT = 0;
  private introT = 0;
  private introStarted = false;
  private waveStart = -1;
  private scatter = 0;

  private mouse = { x: 0, y: 0, tx: 0, ty: 0, hover: 0, thover: 0 };
  private lastPointer = -10;

  private clock = new THREE.Clock();
  private raf = 0;
  private running = true;
  private disposed = false;
  private ro: ResizeObserver;

  constructor(canvas: HTMLCanvasElement, opts: VaultOptions) {
    this.canvas = canvas;
    this.opts = opts;
    // throws if WebGL is unavailable — caller falls back to a static image
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uMix: { value: 0 },
        uIntro: { value: 0 },
        uScatter: { value: 0 },
        uSize: { value: 10 },
        uDpr: { value: this.renderer.getPixelRatio() },
        uHover: { value: 0 },
        uDim: { value: 0.56 },
        uMotion: { value: opts.reducedMotion ? 0 : 1 },
        uLens: { value: 150 },
        uMouse: { value: new THREE.Vector2() },
        uRes: { value: new THREE.Vector2(1, 1) },
        uWave: { value: new THREE.Vector3(0, 0, -1) },
      },
    });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
  }

  async init() {
    this.imgs = await Promise.all(
      this.opts.images.map(
        (src) =>
          new Promise<HTMLImageElement | null>((resolve) => {
            const img = new Image();
            img.decoding = "async";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
          })
      )
    );
    if (this.disposed) return;
    this.resize(true);
    if (this.opts.reducedMotion) this.introT = 1;
    this.clock.start();
    this.loop();
  }

  /** Kick off the pixel-rain intro (call once the page loader is gone). */
  start() {
    this.introStarted = true;
  }

  get count() {
    return this.opts.images.length;
  }

  goTo(i: number) {
    const n = this.count;
    const target = ((i % n) + n) % n;
    if (target === this.cur || this.next !== -1) return;
    this.next = target;
    this.mixT = 0;
    this.autoT = 0;
    this.writeColors("aColB", this.samples[target]);
    this.opts.onChange?.(target);
  }

  advance() {
    this.goTo(this.cur + 1);
  }

  pointer(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.tx = clientX - r.left - this.w / 2;
    this.mouse.ty = this.h / 2 - (clientY - r.top);
    this.mouse.thover = 1;
    this.lastPointer = this.clock.elapsedTime;
  }

  leave() {
    this.lastPointer = -10;
  }

  shockwave(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    (this.mat.uniforms.uWave.value as THREE.Vector3).set(clientX - r.left - this.w / 2, this.h / 2 - (clientY - r.top), 0);
    this.waveStart = this.clock.elapsedTime;
  }

  setScatter(p: number) {
    this.scatter = p;
  }

  setRunning(running: boolean) {
    this.running = running;
    if (running) this.clock.getDelta();
  }

  /* ------------------------------------------------------------------ */

  private resize(force = false) {
    if (this.disposed) return;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    if (!force && w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.left = -w / 2;
    this.camera.right = w / 2;
    this.camera.top = h / 2;
    this.camera.bottom = -h / 2;
    this.camera.updateProjectionMatrix();

    // pixel size by viewport; cap total count for weak GPUs
    let tile = w >= 1280 ? 11 : w >= 768 ? 10 : 8;
    while ((w / tile) * (h / tile) > 22000) tile += 1;
    const cols = Math.ceil(w / tile);
    const rows = Math.ceil(h / tile);
    const u = this.mat.uniforms;
    u.uRes.value.set(w, h);
    u.uSize.value = tile;
    u.uLens.value = Math.max(110, Math.min(190, w * 0.11));

    if (force || cols !== this.cols || rows !== this.rows || tile !== this.tile || !this.geo) {
      this.tile = tile;
      this.cols = cols;
      this.rows = rows;
      this.build();
    } else {
      this.layoutPositions();
    }
  }

  private build() {
    const count = this.cols * this.rows;
    if (this.points) {
      this.scene.remove(this.points);
      this.geo?.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const seeds = new Float32Array(count * 2);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 2));
    geo.setAttribute("aColA", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute("aColB", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this.geo = geo;
    this.layoutPositions();

    this.samples = this.imgs.map((img) => this.sample(img));
    this.writeColors("aColA", this.samples[this.cur]);
    this.writeColors("aColB", this.samples[this.next === -1 ? this.cur : this.next]);

    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  private layoutPositions() {
    if (!this.geo) return;
    const pos = this.geo.getAttribute("position") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const { cols, rows, tile, w, h } = this;
    // centre the grid on the canvas
    const ox = -w / 2 + (w - cols * tile) / 2;
    const oy = h / 2 - (h - rows * tile) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (r * cols + c) * 3;
        arr[i] = ox + (c + 0.5) * tile;
        arr[i + 1] = oy - (r + 0.5) * tile;
        arr[i + 2] = 0;
      }
    }
    pos.needsUpdate = true;
  }

  /** Cover-fit an image into a cols×rows colour grid. */
  private sample(img: HTMLImageElement | null): Float32Array {
    const { cols, rows } = this;
    const out = new Float32Array(cols * rows * 3);
    const cv = document.createElement("canvas");
    cv.width = cols;
    cv.height = rows;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    if (!ctx) return out;
    ctx.fillStyle = "#151311";
    ctx.fillRect(0, 0, cols, rows);
    if (img && img.naturalWidth) {
      // two-step downscale keeps colours clean instead of aliased
      const mid = document.createElement("canvas");
      const s1 = Math.max((cols * 4) / img.naturalWidth, (rows * 4) / img.naturalHeight);
      mid.width = Math.max(1, Math.round(img.naturalWidth * Math.min(1, s1)));
      mid.height = Math.max(1, Math.round(img.naturalHeight * Math.min(1, s1)));
      const mctx = mid.getContext("2d")!;
      mctx.imageSmoothingQuality = "high";
      mctx.drawImage(img, 0, 0, mid.width, mid.height);
      const scale = Math.max(cols / mid.width, rows / mid.height);
      const dw = mid.width * scale;
      const dh = mid.height * scale;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(mid, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
    }
    const data = ctx.getImageData(0, 0, cols, rows).data;
    for (let i = 0, j = 0; i < out.length; i += 3, j += 4) {
      // a touch of contrast so the mosaic reads as "lit"
      out[i] = Math.min(1, Math.pow(data[j] / 255, 1.08) * 1.06);
      out[i + 1] = Math.min(1, Math.pow(data[j + 1] / 255, 1.08) * 1.06);
      out[i + 2] = Math.min(1, Math.pow(data[j + 2] / 255, 1.08) * 1.06);
    }
    return out;
  }

  private writeColors(name: "aColA" | "aColB", src?: Float32Array) {
    if (!this.geo || !src) return;
    const attr = this.geo.getAttribute(name) as THREE.BufferAttribute;
    (attr.array as Float32Array).set(src);
    attr.needsUpdate = true;
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (!this.running || !this.geo) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const u = this.mat.uniforms;
    const m = this.mouse;

    // autopilot lens when idle — keeps the hero alive on touch / before first move
    const idle = t - this.lastPointer > 2.4;
    if (idle) {
      m.tx = Math.sin(t * 0.37) * this.w * 0.3;
      m.ty = Math.sin(t * 0.53 + 1.3) * this.h * 0.22;
      m.thover = this.introT >= 1 ? 0.8 : 0;
    }
    const follow = idle ? 1.6 : 9;
    m.x = damp(m.x, m.tx, follow, dt);
    m.y = damp(m.y, m.ty, follow, dt);
    m.hover = damp(m.hover, m.thover, 4, dt);
    u.uMouse.value.set(m.x, m.y);
    u.uHover.value = m.hover;
    u.uTime.value = t;

    // intro
    if (this.introStarted && this.introT < 1) this.introT = Math.min(1, this.introT + dt / INTRO);
    u.uIntro.value = this.introT;

    // shockwave
    const wave = u.uWave.value as THREE.Vector3;
    wave.z = this.waveStart < 0 ? -1 : t - this.waveStart;
    if (wave.z > 3) this.waveStart = -1;

    // dissolve to next project
    if (this.next !== -1) {
      this.mixT = Math.min(1, this.mixT + dt / TRANSITION);
      u.uMix.value = easeInOut(this.mixT);
      if (this.mixT >= 1) {
        this.cur = this.next;
        this.next = -1;
        this.writeColors("aColA", this.samples[this.cur]);
        u.uMix.value = 0;
      }
    } else if (this.introT >= 1) {
      this.autoT += dt;
      if (this.autoT >= INTERVAL) this.advance();
    }
    this.opts.onProgress?.(this.next !== -1 ? 1 : Math.min(1, this.autoT / INTERVAL));

    u.uScatter.value = damp(u.uScatter.value, this.scatter, 8, dt);

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.geo?.dispose();
    this.mat.dispose();
    this.renderer.dispose();
  }
}
