// All media lives in src/media and is inlined into the single-file build by
// vite-plugin-singlefile. Work / lab media is collected with import.meta.glob,
// so a missing file can never break the build again: images fall back to a
// branded placeholder and videos are simply optional (cards show the poster).
import { GLB_DATA_URL } from "./glbData";

import whiteLogo from "../media/White.svg?inline";
import blackLogo from "../media/Black.svg?inline";

type GlobMap = Record<string, string>;

const workImages = import.meta.glob<string>("../media/work/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?inline",
  import: "default",
}) as GlobMap;

const workVideos = import.meta.glob<string>("../media/work/*.{mp4,webm}", {
  eager: true,
  query: "?inline",
  import: "default",
}) as GlobMap;

const labImages = import.meta.glob<string>("../media/lab/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?inline",
  import: "default",
}) as GlobMap;

/** Look a file up by its base name (without extension) inside a glob map. */
function pick(map: GlobMap, name: string): string | undefined {
  for (const [path, url] of Object.entries(map)) {
    const base = path.split("/").pop()!.replace(/\.[^.]+$/, "");
    if (base === name) return url;
  }
  return undefined;
}

/** Dark, on-brand SVG placeholder used when an image file is missing. */
function placeholder(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <defs><radialGradient id="g" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#f4602a" stop-opacity="0.22"/><stop offset="1" stop-color="#0b0a09" stop-opacity="0"/></radialGradient></defs>
  <rect width="1600" height="1000" fill="#151311"/><rect width="1600" height="1000" fill="url(#g)"/>
  <rect x="770" y="470" width="60" height="60" fill="#f4602a"/>
  <text x="800" y="600" fill="#f2eee5" fill-opacity="0.55" font-family="monospace" font-size="28" letter-spacing="8" text-anchor="middle">${label.toUpperCase()}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function workMedia(id: string): { img: string; video?: string } {
  return {
    img: pick(workImages, id) ?? placeholder(id),
    video: pick(workVideos, id),
  };
}

function lab(id: string): string {
  return pick(labImages, id) ?? placeholder(id);
}

export const GLB_URL = GLB_DATA_URL;
export const LOGO_WHITE = whiteLogo;
export const LOGO_BLACK = blackLogo;

const WORK_IDS = [
  // GreePixel portfolio
  "jalebi",
  "ad-grants-pilot",
  "on-card",
  "kim-and-co",
  "lairo",
  "find-a-doc",
  "shepherd",
  "deltabook",
  "xpatio",
  "hotcoin",
  "startwise",
  "mts-rescue",
  "gcc-fitness",
  "the-incc",
  // motion work (video)
  "moosehead",
  "cob",
] as const;

export const MEDIA: Record<string, { img: string; video?: string }> = Object.fromEntries(
  WORK_IDS.map((id) => [id, workMedia(id)])
);

const labAiCore = lab("ai-core");
const labAiOrb = lab("ai-orb");
const labUiGlass = lab("ui-glass");
const labTerminal = lab("terminal");
const labWave = lab("webgl-wave");
const labSculpt = lab("sculpt");
const labMobile = lab("mobile-app");
const labDesign = lab("design-system");

/** UI/UX R&D visuals (generated for GreePixel) */
export const LAB: Record<string, { img: string; title: string; tag: string }> = {
  "ai-core": { img: labAiCore, title: "AI Copilots", tag: "CONVERSATIONAL UX" },
  "ai-orb": { img: labAiOrb, title: "Intelligence Fields", tag: "AI ASSISTANT UI" },
  "ui-glass": { img: labUiGlass, title: "Glass Dashboards", tag: "DASHBOARD UI" },
  terminal: { img: labTerminal, title: "Holo Terminal", tag: "DEV TOOL UX" },
  "webgl-wave": { img: labWave, title: "Shader Fields", tag: "MOTION DESIGN" },
  sculpt: { img: labSculpt, title: "Form Studies", tag: "3D UI CRAFT" },
  "mobile-app": { img: labMobile, title: "Mobile Systems", tag: "APP UI KITS" },
  "design-system": { img: labDesign, title: "Component Atoms", tag: "DESIGN SYSTEMS" },
};

/** Service row hover previews — one visual per discipline */
export const SERVICE_PREVIEWS: Record<string, string> = {
  "01": labAiOrb, // UX research
  "02": labUiGlass, // UI design
  "03": labAiCore, // MVP product design
  "04": labTerminal, // SaaS & dashboards
  "05": labMobile, // mobile apps
  "06": labDesign, // design systems
  "07": labWave, // audits & redesigns
  "08": labSculpt, // interaction & 3D
};
