import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export function initScroll() {
  if (lenis) return lenis;
  lenis = new Lenis({
    duration: 1.25,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.4,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function getLenis() {
  return lenis;
}

export function lockScroll(locked: boolean) {
  if (!lenis) return;
  if (locked) lenis.stop();
  else lenis.start();
}

export function scrollTop(immediate = true) {
  lenis?.scrollTo(0, { immediate, force: true });
  window.scrollTo(0, 0);
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

/** Split an element's text into per-line masked spans (`split-line > span`). */
export function splitLines(el: HTMLElement) {
  const raw = el.innerHTML.split(/<br\s*\/?>/i);
  el.innerHTML = raw
    .map((line) => `<span class="split-line"><span>${line}</span></span>`)
    .join("");
  return Array.from(el.querySelectorAll<HTMLSpanElement>(".split-line > span"));
}

/** Split text into per-character masked spans for stagger reveals. */
export function splitChars(el: HTMLElement) {
  const text = el.textContent ?? "";
  el.setAttribute("aria-label", text);
  el.innerHTML = "";
  const spans: HTMLSpanElement[] = [];
  for (const ch of text) {
    const wrap = document.createElement("span");
    wrap.className = "char-wrap";
    wrap.setAttribute("aria-hidden", "true");
    const inner = document.createElement("span");
    inner.textContent = ch === " " ? " " : ch;
    wrap.appendChild(inner);
    el.appendChild(wrap);
    spans.push(inner);
  }
  return spans;
}

export { gsap, ScrollTrigger };
