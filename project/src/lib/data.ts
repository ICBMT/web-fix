import { GLB_URL, LOGO_WHITE, MEDIA } from "./assets";

export { GLB_URL, LOGO_WHITE };

export type Project = {
  id: string;
  name: string;
  cat: string;
  studio: "MILL3" | "MIRAGE";
  year: string;
  img: string;
  video?: string;
  tags: string[];
  hue?: string;
};

export const projects: Project[] = [
  {
    id: "moosehead",
    name: "Moosehead",
    cat: "E-Commerce Experience",
    studio: "MILL3",
    year: "2023",
    img: MEDIA.moosehead.img,
    video: MEDIA.moosehead.video,
    tags: ["Web Experience", "Shopify", "Motion"],
  },
  {
    id: "difc",
    name: "DIFC — 4th Edition",
    cat: "Projection Mapping Film",
    studio: "MIRAGE",
    year: "2025",
    img: MEDIA.difc.img,
    tags: ["3D Motion", "Live Event", "Dubai"],
  },
  {
    id: "margiela",
    name: "Maison Margiela",
    cat: "Immersive 3D Garden",
    studio: "MIRAGE",
    year: "2024",
    img: MEDIA.margiela.img,
    tags: ["Immersive", "Luxury", "WebGL"],
  },
  {
    id: "cob",
    name: "COB Foods",
    cat: "Brand Site / WebGL",
    studio: "MILL3",
    year: "2024",
    img: MEDIA.cob.img,
    video: MEDIA.cob.video,
    tags: ["Art Direction", "WebGL", "CPG"],
  },
  {
    id: "renault",
    name: "Renault Trucks",
    cat: "3D Virtual City",
    studio: "MIRAGE",
    year: "2024",
    img: MEDIA.renault.img,
    tags: ["Real-time 3D", "Configurator", "B2B"],
  },
  {
    id: "omnicell",
    name: "Omnicell Explorer",
    cat: "Interactive Product 3D",
    studio: "MIRAGE",
    year: "2025",
    img: MEDIA.omnicell.img,
    tags: ["Interactive", "Healthcare", "3D"],
  },
  {
    id: "gsoft",
    name: "GSoft",
    cat: "Corporate Platform",
    studio: "MILL3",
    year: "2021",
    img: MEDIA.gsoft.img,
    tags: ["Platform", "SaaS", "Branding"],
  },
  {
    id: "ubisoft",
    name: "Ubisoft — Assassin's Creed",
    cat: "Campaign Experience",
    studio: "MIRAGE",
    year: "2023",
    img: MEDIA.ubisoft.img,
    tags: ["Gaming", "Campaign", "3D"],
  },
  {
    id: "ventriloc",
    name: "Ventriloc",
    cat: "Product Site",
    studio: "MILL3",
    year: "2023",
    img: MEDIA.ventriloc.img,
    tags: ["Web Design", "Motion", "Startup"],
  },
  {
    id: "tasmim",
    name: "Tasmim",
    cat: "Design Platform",
    studio: "MIRAGE",
    year: "2024",
    img: MEDIA.tasmim.img,
    tags: ["Product", "MENA", "UI/UX"],
  },
  {
    id: "amourliquide",
    name: "Amour Liquide",
    cat: "E-Commerce / Brand",
    studio: "MILL3",
    year: "2023",
    img: MEDIA.amourliquide.img,
    tags: ["E-Commerce", "Fragrance", "Culture"],
  },
  {
    id: "sopra",
    name: "Sopra Banking",
    cat: "Live Event 3D World",
    studio: "MIRAGE",
    year: "2023",
    img: MEDIA.sopra.img,
    tags: ["Live Event", "Fintech", "3D"],
  },
  {
    id: "basehabitation",
    name: "Base Habitation",
    cat: "Digital Platform",
    studio: "MILL3",
    year: "2024",
    img: MEDIA.basehabitation.img,
    tags: ["Editorial", "Housing", "Platform"],
  },
  {
    id: "caisse",
    name: "Caisse des Dépôts",
    cat: "Real-time 3D Village",
    studio: "MIRAGE",
    year: "2024",
    img: MEDIA.caisse.img,
    tags: ["Real-time 3D", "Public", "Paris"],
  },
  {
    id: "jinns",
    name: "Jinns",
    cat: "Campaign & Billboard",
    studio: "MIRAGE",
    year: "2023",
    img: MEDIA.jinns.img,
    tags: ["Campaign", "Beverage", "OOH"],
  },
  {
    id: "biotherm",
    name: "Biotherm",
    cat: "Campaign Visual System",
    studio: "MIRAGE",
    year: "2024",
    img: MEDIA.biotherm.img,
    tags: ["Beauty", "Campaign", "CGI"],
  },
];

export const chapters = [
  {
    k: "01",
    title: ["PIXEL", "BY PIXEL"],
    accent: "CRAFT",
    body: "We build software the way pixels build pictures — deliberately, unit by unit, until a product appears that feels inevitable. Nothing accidental. Nothing wasted.",
    meta: "METHOD / ASSEMBLY",
  },
  {
    k: "02",
    title: ["AI THAT", "SHIPS"],
    accent: "MIND",
    body: "Agents, RAG pipelines and automation hardened for real data and real security reviews. Prototypes are cheap — we deliver intelligence that survives production.",
    meta: "CAPABILITY / INTELLIGENCE",
  },
  {
    k: "03",
    title: ["DESIGN ×", "ENGINEERING"],
    accent: "RIGOR",
    body: "Figma systems engineers can actually build. 3D worlds that run at 60fps. No static-mockup drift, no rework loops — design and code in the same sprint.",
    meta: "CAPABILITY / CRAFT",
  },
  {
    k: "04",
    title: ["SENIOR", "ONLY."],
    accent: "PROOF",
    body: "150+ products shipped for clients across the US, UK, UAE and Australia. No junior hand-offs, no black box — you talk directly to the people building it.",
    meta: "PROMISE / DELIVERY",
  },
];

export const services = [
  { n: "01", t: "AI Products & Automation", d: "Agents, chatbots and workflow automation that survive real users.", tags: ["OpenAI", "Python", "Node.js"] },
  { n: "02", t: "Immersive 3D & WebGL", d: "Real-time 3D worlds, product configurators and projection films.", tags: ["Three.js", "Blender", "GLSL"] },
  { n: "03", t: "MVP Development", d: "Idea to revenue-ready in 4–8 weeks. Weekly demos, senior-only team.", tags: ["Laravel", "React", "Flutter"] },
  { n: "04", t: "Custom Web Apps", d: "SaaS platforms, dashboards and internal tools architected to scale.", tags: ["React", "PostgreSQL", "AWS"] },
  { n: "05", t: "Mobile Apps", d: "Cross-platform builds with native-grade polish and clean pipelines.", tags: ["Flutter", "React Native"] },
  { n: "06", t: "UI/UX Design", d: "Design systems engineers can build. Zero drift, zero rework loops.", tags: ["Figma", "Systems"] },
  { n: "07", t: "QA & Hardening", d: "We audit and production-harden AI-generated codebases.", tags: ["E2E", "Security", "Audit"] },
  { n: "08", t: "Dedicated Teams", d: "Senior engineers embedded in your team — no recruiting overhead.", tags: ["Remote", "Embedded"] },
];

export const stats = [
  { v: 150, suffix: "+", label: "Products shipped worldwide" },
  { v: 16, suffix: "", label: "Archived case studies below" },
  { v: 8, suffix: "", label: "Countries served remotely" },
  { v: 4, suffix: "h", label: "Response time, guaranteed" },
];
