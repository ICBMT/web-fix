/**
 * Link guard — only the site's own links work, plus an exact allow-list
 * (Calendly booking + the GreeLogix contact links: email, phone, WhatsApp).
 *
 * Any link that would leave the site (another domain, mailto:, tel:, …) is
 * silently neutralised. Nothing is removed or restyled, so the site looks and
 * hovers exactly the same; the browser just never navigates away.
 *
 * Blocks: click, Ctrl/⌘/Shift-click, middle-click, keyboard Enter, dragging a
 * link to the tab bar, the right-click "open in new tab" menu, and window.open().
 */

import { CALENDLY_URL, CONTACT } from "./data";

/** The ONLY links allowed to leave the site: booking a call + the contact links.
 *  Everything else (other domains, other mailto:/tel:, …) is blocked. */
const ALLOWED_LINKS = [CALENDLY_URL, CONTACT.emailHref, CONTACT.phoneHref, CONTACT.whatsappHref];

const normalise = (u: URL) => (u.protocol === "mailto:" || u.protocol === "tel:" ? u.protocol + decodeURIComponent(u.pathname).toLowerCase() : u.origin + u.pathname.replace(/\/+$/, ""));
const ALLOWED = new Set(ALLOWED_LINKS.map((h) => normalise(new URL(h))));

function isInternal(href: string | null | undefined): boolean {
  if (!href) return true; // <a> without href does nothing anyway
  const raw = href.trim();
  if (raw === "" || raw.startsWith("#")) return true; // hash routes: #/, #/work …
  let url: URL;
  try {
    url = new URL(raw, window.location.href);
  } catch {
    return false;
  }
  if ((url.protocol === "https:" || url.protocol === "mailto:" || url.protocol === "tel:") && ALLOWED.has(normalise(url))) return true;
  // same protocol + host = the site itself (also works when opened from file://)
  return url.protocol === window.location.protocol && url.host === window.location.host;
}

function externalAnchor(e: Event): HTMLAnchorElement | SVGAElement | null {
  const path = typeof e.composedPath === "function" ? e.composedPath() : [];
  const start = (path[0] ?? e.target) as Element | null;
  const a = start && typeof start.closest === "function" ? (start.closest("a[href], area[href]") as HTMLAnchorElement | null) : null;
  if (!a) return null;
  const href = a.getAttribute("href") ?? (a as unknown as SVGAElement).href?.baseVal;
  return isInternal(href) ? null : a;
}

let installed = false;

export function installLinkGuard() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const block = (e: Event) => {
    if (externalAnchor(e)) e.preventDefault();
  };

  // capture phase on window → runs before anything else can navigate
  window.addEventListener("click", block, true);
  window.addEventListener("auxclick", block, true); // middle-click
  window.addEventListener("dragstart", block, true); // drag link to tab bar / desktop
  window.addEventListener("contextmenu", block, true); // "open link in new tab"

  // programmatic escapes
  const nativeOpen = window.open.bind(window);
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    if (url !== undefined && url !== null && !isInternal(String(url))) return null;
    return nativeOpen(url as string, target, features);
  }) as typeof window.open;
}
