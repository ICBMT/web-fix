/**
 * While the time tunnel runs, the page's own per-frame GPU work (3D logo, Pixel
 * Vault, text halos) pauses, so the tunnel never competes with it for the GPU and
 * the palette flip finishes as fast as possible. Work resumes the moment the new
 * palette starts to be revealed.
 *
 * Kept in its own tiny module so the 3D scenes don't import the tunnel itself.
 */
export const TUNNEL_EVENT = "gp-tunnel";
export type TunnelPhase = "start" | "covered" | "revealing" | "done";

let paused = false;

if (typeof window !== "undefined") {
  window.addEventListener(TUNNEL_EVENT, (e) => {
    const phase = (e as CustomEvent<TunnelPhase>).detail;
    paused = phase === "start" || phase === "covered";
  });
}

/** True while the tunnel is rushing in or the screen is fully covered. */
export function tunnelPaused() {
  return paused;
}
