/** Theme state — dark is the default; the choice persists in localStorage. */
export type Theme = "dark" | "light";

const KEY = "gp-theme";
const EVENT = "gp-themechange";
const META = { dark: "#0b0a09", light: "#f3efe6" } as const;

export function getTheme(): Theme {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

const canFinishTransitions = () => typeof CSSTransition !== "undefined" && typeof document.getAnimations === "function";

/** Snap every colour transition the flip just started straight to its end state,
 *  so hundreds of hover-transitions don't all animate at once. Only the elements that
 *  actually started a transition are touched (no second whole-page restyle). The
 *  theme toggle keeps its own knob animation. */
function finishFlipTransitions() {
  for (const a of document.getAnimations()) {
    if (!(a instanceof CSSTransition)) continue;
    const target = (a.effect as KeyframeEffect | null)?.target;
    if (target && target.closest(".theme-toggle")) continue;
    a.finish();
  }
}

/** Flip the palette in one go.
 *  Returns a `release` callback for API compatibility: on modern browsers there is
 *  nothing to release (transitions are finished in place). Older browsers fall back
 *  to freezing transitions with a class; then `release` un-freezes them, by default
 *  two frames later, or whenever you call it with `{ deferRelease: true }`. */
export function applyTheme(theme: Theme, opts: { deferRelease?: boolean } = {}): () => void {
  const root = document.documentElement;
  const finish = canFinishTransitions();
  if (!finish) root.classList.add("theme-switching");
  root.classList.toggle("light", theme === "light");
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META[theme]);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: theme }));
  if (finish) {
    finishFlipTransitions();
    return () => {};
  }
  const release = () => root.classList.remove("theme-switching");
  if (!opts.deferRelease) requestAnimationFrame(() => requestAnimationFrame(release));
  return release;
}

export function onThemeChange(cb: (theme: Theme) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<Theme>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
