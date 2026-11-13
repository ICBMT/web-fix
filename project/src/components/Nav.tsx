import { useEffect, useState } from "react";
import { getTheme, onThemeChange, type Theme } from "../lib/theme";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { LOGO_BLACK, LOGO_WHITE } from "../lib/data";
import ThemeToggle from "./ThemeToggle";

export default function Nav({ route, onNavigate }: { route: string; onNavigate: (r: string) => void }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => getTheme());
  const [overDark, setOverDark] = useState(false);

  useEffect(() => onThemeChange(setTheme), []);

  /* In light mode the header drops its difference-blend (which would turn the
     orange brand bits blue on paper) and uses the light palette — except while a
     dark section (e.g. the Work hero) sits under it, where the blend returns. */
  useEffect(() => {
    if (theme !== "light") {
      setOverDark(false);
      return;
    }
    const targets = Array.from(document.querySelectorAll<HTMLElement>("section.theme-dark, [data-nav-dark]"));
    if (!targets.length) {
      setOverDark(false);
      return;
    }
    const under = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? under.add(e.target) : under.delete(e.target)));
        setOverDark(under.size > 0);
      },
      { rootMargin: "0px 0px -93% 0px" } // a thin strip at the top = where the header sits
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [theme, route]);

  const blend = theme === "dark" || overDark;

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
        style={{ background: route === to ? "var(--color-gold)" : "transparent", boxShadow: route === to ? "0 0 10px rgba(var(--gold-rgb),0.9)" : "none" }}
      />
      {children}
    </a>
  );

  return (
    <>
      <header className={`fixed left-0 top-0 z-[80] w-full ${blend ? "theme-dark mix-blend-difference" : ""}`}>
        <div className="flex items-center justify-between px-6 py-5 md:px-10">
          <a href="#/" onClick={go("#/")} className="block">
            <img src={blend ? LOGO_WHITE : LOGO_BLACK} alt="GreePixel" className="h-7 w-auto md:h-8" />
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            <Link to="#/">INDEX</Link>
            <Link to="#/work">WORK ARCHIVE</Link>
            <ThemeToggle />
            <a
              href="mailto:hello@greepixel.com"
              data-magnetic
              className="flex items-center gap-1.5 border border-bone/30 px-4 py-2 font-mono text-[11px] tracking-[0.22em] text-bone transition-colors hover:bg-bone hover:text-ink"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              START A PROJECT <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </nav>
          <div className="flex items-center gap-4 md:hidden">
            <ThemeToggle />
            <button onClick={() => setOpen(true)} className="text-bone" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* mobile menu */}
      <div
        className={`fixed inset-0 z-[95] flex flex-col justify-between bg-ink p-6 transition-all duration-500 md:hidden ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        style={{ background: "var(--color-ink)" }}
      >
        <div className="flex items-center justify-between">
          <img src={LOGO_WHITE} alt="GreePixel" className="logo-on-dark h-6 w-auto" />
          <img src={LOGO_BLACK} alt="" aria-hidden className="logo-on-light h-6 w-auto" />
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
              <span className="font-mono text-xs" style={{ color: "var(--color-gold)", fontFamily: "var(--font-mono)" }}>
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
