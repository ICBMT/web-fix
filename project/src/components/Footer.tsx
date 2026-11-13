import { ArrowUp, ArrowUpRight } from "lucide-react";
import { getLenis } from "../lib/core";
import { LOGO_BLACK, LOGO_WHITE } from "../lib/data";
import Marquee from "./Marquee";

export default function Footer({ onNavigate }: { onNavigate: (r: string) => void }) {
  const toTop = () => {
    getLenis()?.scrollTo(0, { duration: 1.6 });
  };

  return (
    <footer className="relative border-t" style={{ borderColor: "rgba(var(--bone-rgb),0.09)", background: "var(--color-ink)" }}>
      <Marquee
        items={["LET'S BUILD SOMETHING RARE", "GREEPIXEL®", "PIXEL BY PIXEL", "LET'S BUILD SOMETHING RARE", "GREEPIXEL®", "PIXEL BY PIXEL"]}
        duration={26}
        className="border-b py-6 md:py-8"
        textClass="font-display text-[clamp(2.2rem,6vw,5rem)] uppercase leading-none"
      />

      <div className="grid gap-10 px-6 py-14 md:grid-cols-12 md:px-10 md:py-20">
        <div className="md:col-span-5">
          <span className="label label-gold">NEXT STEP</span>
          <a href="mailto:hello@greepixel.com" className="group mt-5 block" data-cursor="SAY HI" data-magnetic>
            <span className="font-display gtg block text-[clamp(3rem,7vw,6rem)] uppercase leading-[0.9] text-stroke transition-all duration-500">
              Have a brief?
            </span>
            <span className="font-display mt-1 flex items-center gap-3 text-[clamp(3rem,7vw,6rem)] uppercase leading-[0.9] text-bone transition-colors duration-500 group-hover:text-gold" style={{ ["--tw-text-opacity" as string]: 1 }}>
              Let's build
              <ArrowUpRight className="h-[0.7em] w-[0.7em] transition-transform duration-500 group-hover:-translate-y-2 group-hover:translate-x-2" style={{ color: "var(--color-gold)" }} />
            </span>
          </a>
          <a href="mailto:hello@greepixel.com" className="label mt-6 inline-block border-b border-transparent pb-1 transition-colors hover:border-gold" style={{ color: "rgba(var(--bone-rgb),0.75)" }}>
            hello@greepixel.com
          </a>
        </div>

        <div className="md:col-span-2">
          <span className="label">SITEMAP</span>
          <ul className="mt-5 space-y-3">
            <li>
              <a href="#/" onClick={(e) => { e.preventDefault(); onNavigate("#/"); }} className="text-sm text-bone/75 transition-colors hover:text-gold">
                Index
              </a>
            </li>
            <li>
              <a href="#/work" onClick={(e) => { e.preventDefault(); onNavigate("#/work"); }} className="text-sm text-bone/75 transition-colors hover:text-gold">
                Work Archive
              </a>
            </li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <span className="label">STUDIOS</span>
          <ul className="mt-5 space-y-3">
            <li>
              <a href="https://mill3.studio/en/" target="_blank" rel="noreferrer" className="text-sm text-bone/75 transition-colors hover:text-gold">
                MILL3 (MTL)
              </a>
            </li>
            <li>
              <a href="https://studiomirage.io/" target="_blank" rel="noreferrer" className="text-sm text-bone/75 transition-colors hover:text-gold">
                Studio Mirage (PAR/DXB)
              </a>
            </li>
          </ul>
        </div>

        <div className="flex flex-col items-start justify-between gap-8 md:col-span-3 md:items-end">
          <button
            onClick={toTop}
            data-cursor="TOP"
            data-magnetic
            className="group flex h-16 w-16 items-center justify-center border border-bone/20 transition-colors hover:border-gold"
            aria-label="Back to top"
          >
            <ArrowUp className="h-5 w-5 text-bone transition-all duration-500 group-hover:-translate-y-1 group-hover:text-gold" />
          </button>
          <div className="md:text-right">
            <span className="label block">31.5204° N, 74.3587° E</span>
            <span className="label mt-2 block">SENIOR TEAM · WORLDWIDE</span>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10">
        <img src={LOGO_WHITE} alt="GreePixel" className="logo-on-dark w-full opacity-[0.14]" />
        <img src={LOGO_BLACK} alt="" aria-hidden className="logo-on-light w-full opacity-[0.12]" />
      </div>

      <div className="flex flex-col gap-2 border-t px-6 py-5 md:flex-row md:items-center md:justify-between md:px-10" style={{ borderColor: "rgba(var(--bone-rgb),0.09)" }}>
        <span className="label">© 2026 GREEPIXEL® — ALL RIGHTS RESERVED</span>
        <span className="label" style={{ color: "rgba(var(--gold-rgb),0.75)" }}>
          FORGED FROM MILL3 × STUDIO MIRAGE
        </span>
        <span className="label">BUILT PIXEL BY PIXEL</span>
      </div>
    </footer>
  );
}
