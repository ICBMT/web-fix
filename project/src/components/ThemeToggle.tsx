import { useEffect, useId, useState } from "react";
import { getTheme, onThemeChange, type Theme } from "../lib/theme";
import { isTimeTraveling, prepareTimeTravel, timeTravel } from "../lib/timeTunnel";

/**
 * Dark ⇄ light switch for the nav (it sits on the frosted-glass header).
 * Knob slides + spins a full turn while the moon morphs into a sun (and back);
 * every animated property is transform/opacity → compositor-only.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(() => getTheme());
  const [pulse, setPulse] = useState(0);
  const maskId = `tt-moon-${useId().replace(/:/g, "")}`;

  useEffect(() => onThemeChange(setTheme), []);

  const light = theme === "light";

  const toggle = () => {
    if (isTimeTraveling()) return;
    const next: Theme = light ? "dark" : "light";
    setTheme(next); // knob moves instantly; the page follows through the tunnel
    setPulse((p) => p + 1);
    void timeTravel(next);
  };

  // pre-build the tunnel while the pointer approaches, so the click starts instantly
  const prime = () => prepareTimeTravel(light ? "dark" : "light");

  return (
    <button
      onPointerEnter={prime}
      onFocus={prime}
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={light}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      title={light ? "Dark mode" : "Light mode"}
      data-cursor-snap
      className={`theme-toggle group relative h-[30px] w-[58px] shrink-0 rounded-full border ${className}`}
      data-light={light ? "" : undefined}
    >
      {/* warp pulse on press */}
      <span key={pulse} className={`tt-pulse pointer-events-none absolute inset-[-1px] rounded-full border ${pulse ? "tt-pulse-run" : ""}`} style={{ borderColor: "var(--color-bone)" }} />

      {/* stars (dark side) */}
      <span className="tt-stars pointer-events-none absolute inset-0">
        <i style={{ left: 34, top: 8 }} />
        <i style={{ left: 44, top: 15 }} />
        <i style={{ left: 38, top: 20 }} />
      </span>

      {/* knob */}
      <span className="tt-knob pointer-events-none absolute left-[4px] top-[4px] block h-5 w-5">
        <svg viewBox="0 0 24 24" className="h-full w-full overflow-visible" aria-hidden>
          <defs>
            <mask id={maskId}>
              <rect x="-6" y="-6" width="36" height="36" fill="white" />
              <circle className="tt-bite" cx="17" cy="7" r="7" fill="black" />
            </mask>
          </defs>
          <g className="tt-rays" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <line x1="12" y1="0.5" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23.5" />
            <line x1="0.5" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23.5" y2="12" />
            <line x1="3.9" y1="3.9" x2="5.6" y2="5.6" />
            <line x1="18.4" y1="18.4" x2="20.1" y2="20.1" />
            <line x1="3.9" y1="20.1" x2="5.6" y2="18.4" />
            <line x1="18.4" y1="5.6" x2="20.1" y2="3.9" />
          </g>
          <circle className="tt-core" cx="12" cy="12" r="7.5" fill="currentColor" mask={`url(#${maskId})`} />
        </svg>
      </span>
    </button>
  );
}
