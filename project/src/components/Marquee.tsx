import { Fragment, useEffect, useRef } from "react";
import { gsap } from "../lib/core";

/**
 * Velocity-reactive marquee: base drift + scroll velocity accelerates it.
 * `duration` = seconds for one full loop at rest.
 */
export default function Marquee({
  items,
  className = "",
  textClass = "",
  duration = 30,
  reverse = false,
}: {
  items: string[];
  className?: string;
  textClass?: string;
  duration?: number;
  reverse?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let x = 0;
    let half = track.scrollWidth / 2;
    let visible = true;
    let lastY = window.scrollY;
    let vel = 0;
    let lastT = performance.now();

    const ro = new ResizeObserver(() => {
      half = track.scrollWidth / 2;
    });
    ro.observe(track);

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: "100px" });
    io.observe(track);

    const loop = () => {
      if (!visible || half <= 0) {
        lastT = performance.now();
        lastY = window.scrollY;
        return;
      }
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      const y = window.scrollY;
      const instVel = dt > 0 ? (y - lastY) / dt : 0;
      lastY = y;
      vel += (instVel - vel) * 0.12;

      const base = half / duration; // px per second at rest
      const boost = Math.min(Math.abs(vel) * 0.35, base * 6);
      const dir = reverse ? 1 : -1;
      x += (base + boost) * dt * dir;

      // wrap into [-half, 0]
      let xm = x % half;
      if (xm > 0) xm -= half;
      track.style.transform = `translate3d(${xm}px,0,0)`;
    };

    gsap.ticker.add(loop);
    return () => {
      gsap.ticker.remove(loop);
      ro.disconnect();
      io.disconnect();
    };
  }, [duration, reverse]);

  const chunk = (ariaHidden: boolean) => (
    <div key={ariaHidden ? "b" : "a"} aria-hidden={ariaHidden} className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <Fragment key={i}>
          <span className={`whitespace-nowrap px-6 md:px-10 ${textClass}`}>{item}</span>
          <span className="inline-block h-2.5 w-2.5 shrink-0" style={{ background: i % 2 ? "#f4602a" : "rgba(242,238,229,0.35)" }} />
        </Fragment>
      ))}
    </div>
  );

  return (
    <div className={`overflow-hidden ${className}`}>
      <div ref={trackRef} className="flex w-max will-change-transform">
        {chunk(false)}
        {chunk(true)}
      </div>
    </div>
  );
}
