/**
 * While the time tunnel runs, the page's own per-frame GPU work (3D logo, Pixel
 * Vault, text halos) pauses, so the tunnel never competes with it for the GPU.
 *
 * Why it stays paused through the whole reveal, not just the rush: every tunnel
 * frame repaints the full screen, so the compositor redraws everything under it on
 * every frame as well. The cost scales with screen area, so on laptop / TV-sized
 * viewports a full-screen 3D render on top of that (plus the GPU re-rasterising
 * the page in the new palette) is enough to drop frames. On phones and tablets it
 * isn't. So:
 * - the 3D scenes render ONE frame in the new palette while the screen is fully
 *   covered (logoScene.setLight), then hold still until the tunnel is gone;
 * - cheap, purely decorative CSS loops (halo morph, grain) are frozen via the
 *   `tt-run` class on <html>.
 *
 * Kept in its own tiny module so the 3D scenes don't import the tunnel itself.
 */
export const TUNNEL_EVENT = "gp-tunnel";
export type TunnelPhase = "start" | "covered" | "revealing" | "done";

let phase: TunnelPhase = "done";

if (typeof window !== "undefined") {
  window.addEventListener(TUNNEL_EVENT, (e) => {
    phase = (e as CustomEvent<TunnelPhase>).detail;
    document.documentElement.classList.toggle("tt-run", phase !== "done");
  });
}

/** True from the click until the tunnel has fully faded out. */
export function tunnelPaused() {
  return phase !== "done";
}
