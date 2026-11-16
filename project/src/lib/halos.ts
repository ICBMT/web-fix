/**
 * TEXT HALOS: soft frosted patches that hug text blocks floating over the 3D logo.
 *
 * Why a separate layer? `backdrop-filter` stops working as soon as any ancestor
 * has opacity < 1 or a filter, and the hero/story text is constantly faded and
 * blurred by the scroll choreography. So each halo lives in one fixed layer
 * between the canvas and the content, and mirrors its text block every frame:
 * position, size and *effective* opacity (the product of the text's own and its
 * ancestors' opacity). The blur therefore always works, and every existing text
 * animation stays exactly as it was.
 *
 * Cost per frame: one rect + a few cached computed-style reads per target, with
 * DOM writes only when values actually change. The loop only runs while the
 * 3D zone is on screen (setRunning).
 */

import { tunnelPaused } from "./tunnelPause";

type Target = {
  el: HTMLElement;
  chain: HTMLElement[]; // el + ancestors up to the page root (for effective opacity)
  halo: HTMLDivElement;
  pad: number;
  shown: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  o: number;
};

export class Halos {
  private layer: HTMLDivElement;
  private targets: Target[] = [];
  private raf = 0;
  private running = false;

  constructor(host: HTMLElement, elements: HTMLElement[], stopAt: HTMLElement) {
    this.layer = document.createElement("div");
    this.layer.className = "halo-layer";
    this.layer.setAttribute("aria-hidden", "true");
    host.appendChild(this.layer);

    for (const el of elements) {
      const chain: HTMLElement[] = [];
      for (let n: HTMLElement | null = el; n && n !== stopAt; n = n.parentElement) chain.push(n);
      const halo = document.createElement("div");
      halo.className = "halo";
      halo.innerHTML = "<i></i><i></i>";
      this.layer.appendChild(halo);
      const pad = Number(el.dataset.haloPad || 0);
      this.targets.push({ el, chain, halo, pad, shown: false, x: NaN, y: NaN, w: NaN, h: NaN, o: NaN });
    }
  }

  setRunning(on: boolean) {
    if (on === this.running) return;
    this.running = on;
    this.layer.style.visibility = on ? "" : "hidden";
    if (on) this.raf = requestAnimationFrame(this.tick);
    else cancelAnimationFrame(this.raf);
  }

  private tick = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);
    if (tunnelPaused()) return; // time tunnel running: skip layout reads + halo updates
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    for (const t of this.targets) {
      // effective opacity + visibility
      let o = 1;
      const cs0 = getComputedStyle(t.el);
      if (cs0.visibility === "hidden" || cs0.display === "none") o = 0;
      else
        for (const n of t.chain) {
          const v = n === t.el ? cs0.opacity : getComputedStyle(n).opacity;
          o *= parseFloat(v);
          if (o < 0.01) break;
        }

      const r = o >= 0.01 ? t.el.getBoundingClientRect() : null;
      const visible = !!r && r.width > 0 && r.bottom > -80 && r.top < vh + 80 && r.right > -80 && r.left < vw + 80;

      if (!visible) {
        if (t.shown) {
          t.halo.style.display = "none";
          t.shown = false;
        }
        continue;
      }
      if (!t.shown) {
        t.halo.style.display = "block";
        t.shown = true;
      }

      // padding scales with the text: tight for labels, generous for headlines
      const p = t.pad || Math.round(Math.min(64, Math.max(18, r!.height * 0.32)));
      const w = Math.round(r!.width + p * 2);
      const h = Math.round(r!.height + p * 2);
      const x = Math.round(r!.left - p);
      const y = Math.round(r!.top - p);
      const oo = Math.round(o * 100) / 100;

      if (w !== t.w || h !== t.h) {
        t.halo.style.width = `${w}px`;
        t.halo.style.height = `${h}px`;
        t.halo.style.setProperty("--hp", `${p}px`);
        t.w = w;
        t.h = h;
      }
      if (x !== t.x || y !== t.y) {
        t.halo.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        t.x = x;
        t.y = y;
      }
      if (oo !== t.o) {
        t.halo.style.opacity = String(oo);
        t.o = oo;
      }
    }
  };

  dispose() {
    this.setRunning(false);
    this.layer.remove();
    this.targets = [];
  }
}
