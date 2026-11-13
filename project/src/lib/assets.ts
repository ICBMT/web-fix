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
  <defs><radialGradient id="g" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#e95925" stop-opacity="0.22"/><stop offset="1" stop-color="#0a0a0b" stop-opacity="0"/></radialGradient></defs>
  <rect width="1600" height="1000" fill="#121214"/><rect width="1600" height="1000" fill="url(#g)"/>
  <rect x="770" y="470" width="60" height="60" fill="#e95925"/>
  <text x="800" y="600" fill="#edeae0" fill-opacity="0.55" font-family="monospace" font-size="28" letter-spacing="8" text-anchor="middle">${label.toUpperCase()}</text>
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
  "moosehead",
  "cob",
  "difc",
  "margiela",
  "renault",
  "omnicell",
  "gsoft",
  "ubisoft",
  "ventriloc",
  "tasmim",
  "amourliquide",
  "sopra",
  "basehabitation",
  "caisse",
  "jinns",
  "biotherm",
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

/** AI / product-design R&D visuals (generated for GreePixel) */
export const LAB: Record<string, { img: string; title: string; tag: string }> = {
  "ai-core": { img: labAiCore, title: "Neural Cores", tag: "AGENT PIPELINES" },
  "ai-orb": { img: labAiOrb, title: "Intelligence Fields", tag: "RAG SYSTEMS" },
  "ui-glass": { img: labUiGlass, title: "Glass Dashboards", tag: "PRODUCT UI" },
  terminal: { img: labTerminal, title: "Holo Terminal", tag: "CODE AUDITS" },
  "webgl-wave": { img: labWave, title: "Shader Fields", tag: "GLSL R&D" },
  sculpt: { img: labSculpt, title: "Form Studies", tag: "3D CRAFT" },
  "mobile-app": { img: labMobile, title: "Mobile Systems", tag: "FLUTTER / RN" },
  "design-system": { img: labDesign, title: "Component Atoms", tag: "DESIGN SYSTEMS" },
};

/** Service row hover previews — one visual per capability */
export const SERVICE_PREVIEWS: Record<string, string> = {
  "01": labAiCore,
  "02": labWave,
  "03": labDesign,
  "04": labTerminal,
  "05": labMobile,
  "06": labUiGlass,
  "07": labAiOrb,
  "08": labSculpt,
};
