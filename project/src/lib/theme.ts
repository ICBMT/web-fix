/** Theme state — dark is the default; the choice persists in localStorage. */
export type Theme = "dark" | "light";

const KEY = "gp-theme";
const EVENT = "gp-themechange";
const META = { dark: "#0b0a09", light: "#f3efe6" } as const;

export function getTheme(): Theme {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

/** Flip the palette in one go. Colour transitions are frozen for two frames so
 *  hundreds of hover-transitions don't all animate at once. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.classList.toggle("light", theme === "light");
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META[theme]);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: theme }));
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
}

export function onThemeChange(cb: (theme: Theme) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<Theme>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
