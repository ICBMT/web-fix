import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { LOGO_WHITE } from "../lib/data";

export default function Nav({ route, onNavigate }: { route: string; onNavigate: (r: string) => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [route]);

  const go = (r: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    onNavigate(r);
  };

  const Link = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a
      href={to}
      onClick={go(to)}
      className="group relative flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] text-bone/80 transition-colors hover:text-bone"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <span
        className="h-1.5 w-1.5 transition-all duration-300"
        style={{ background: route === to ? "#f4602a" : "transparent", boxShadow: route === to ? "0 0 10px rgba(244,96,42,0.9)" : "none" }}
      />
      {children}
    </a>
  );

  return (
    <>
      <header className="fixed left-0 top-0 z-[80] w-full mix-blend-difference">
        <div className="flex items-center justify-between px-6 py-5 md:px-10">
          <a href="#/" onClick={go("#/")} className="block">
            <img src={LOGO_WHITE} alt="GreePixel" className="h-7 w-auto md:h-8" />
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            <Link to="#/">INDEX</Link>
            <Link to="#/work">WORK ARCHIVE</Link>
            <a
              href="mailto:hello@greepixel.com"
              data-magnetic
              className="flex items-center gap-1.5 border border-bone/30 px-4 py-2 font-mono text-[11px] tracking-[0.22em] text-bone transition-colors hover:bg-bone hover:text-black"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              START A PROJECT <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </nav>
          <button onClick={() => setOpen(true)} className="text-bone md:hidden" aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* mobile menu */}
      <div
        className={`fixed inset-0 z-[95] flex flex-col justify-between bg-ink p-6 transition-all duration-500 md:hidden ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        style={{ background: "#0b0a09" }}
      >
        <div className="flex items-center justify-between">
          <img src={LOGO_WHITE} alt="GreePixel" className="h-6 w-auto" />
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-bone">
            <X className="h-7 w-7" />
          </button>
        </div>
        <nav className="flex flex-col gap-2">
          {[
            ["#/", "INDEX", "01"],
            ["#/work", "WORK ARCHIVE", "02"],
          ].map(([to, label, n]) => (
            <a key={to} href={to} onClick={go(to)} className="font-display flex items-baseline gap-4 text-6xl uppercase text-bone">
              <span className="font-mono text-xs" style={{ color: "#f4602a", fontFamily: "var(--font-mono)" }}>
                {n}
              </span>
              {label}
            </a>
          ))}
          <a href="mailto:hello@greepixel.com" className="font-display mt-4 flex items-baseline gap-4 text-4xl uppercase text-stroke-gold">
            START A PROJECT
          </a>
        </nav>
        <div className="flex items-end justify-between">
          <span className="label">EST. 2019 — LAHORE</span>
          <span className="label label-gold">PIXEL PERFECT</span>
        </div>
      </div>
    </>
  );
}
