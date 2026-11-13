import { GLB_URL, LOGO_BLACK, LOGO_WHITE, MEDIA } from "./assets";

export { GLB_URL, LOGO_BLACK, LOGO_WHITE };

export type Studio = "GREEPIXEL" | "MILL3" | "MIRAGE";

export type Project = {
  id: string;
  name: string;
  cat: string;
  studio: Studio;
  /** Shown on the card; portfolio projects without a known year show `kind` instead. */
  year?: string;
  /** e.g. "Web platform" / "Mobile app" */
  kind?: string;
  industry?: string;
  desc?: string;
  img: string;
  video?: string;
  tags: string[];
  url?: string;
  hue?: string;
};

/** Where GreePixel portfolio cards link to (source: greelogix.com/portfolio). */
export const PORTFOLIO_URL = "https://greelogix.com/portfolio";

export const STUDIO_LABEL: Record<Studio, string> = {
  GREEPIXEL: "GREEPIXEL®",
  MILL3: "MILL3®",
  MIRAGE: "MIRAGE®",
};

/** "2023" for archive work, "MOBILE APP" etc. for portfolio work. */
export function projectMeta(p: Project) {
  return p.year ?? (p.kind ?? "").toUpperCase();
}

/* ---- GreePixel portfolio (sourced from the GreeLogix portfolio page) ---- */
const portfolio: Project[] = [
  {
    id: "jalebi",
    name: "Jalebi",
    cat: "Restaurant SaaS Platform",
    studio: "GREEPIXEL",
    kind: "Web platform",
    industry: "Food & Hospitality",
    desc: "A full-featured SaaS platform for restaurants to manage inventory, orders, customers and operations — all in one place.",
    img: MEDIA.jalebi.img,
    tags: ["Laravel", "React", "PostgreSQL", "Redis"],
  },
  {
    id: "ad-grants-pilot",
    name: "Ad Grants Pilot",
    cat: "AI Chatbot Admin Panel",
    studio: "GREEPIXEL",
    kind: "Web platform",
    industry: "Non-Profit · AI",
    desc: "A centralised admin panel for managing chatbot flows for non-profit ad campaigns — monitor conversations, configure automated responses, and understand performance at a glance.",
    img: MEDIA["ad-grants-pilot"].img,
    tags: ["Node.js", "OpenAI", "React", "MongoDB"],
  },
  {
    id: "on-card",
    name: "ON Card",
    cat: "Digital Business Card Platform",
    studio: "GREEPIXEL",
    kind: "Mobile app",
    industry: "Networking · FinTech",
    desc: "Create and share digital business cards with NFC support. Track transactions, capture leads and export straight to CRM — all from a tap.",
    img: MEDIA["on-card"].img,
    tags: ["Flutter", "Node.js", "NFC", "Salesforce API"],
  },
  {
    id: "kim-and-co",
    name: "Kim & Co",
    cat: "Internal Product & Sales Tool",
    studio: "GREEPIXEL",
    kind: "Web platform",
    industry: "Internal Tools · Retail",
    desc: "An internal management tool to manage, analyse and optimise products and the sales pipeline — giving leadership real-time visibility into performance.",
    img: MEDIA["kim-and-co"].img,
    tags: ["React", "Laravel", "PostgreSQL", "Chart.js"],
  },
  {
    id: "lairo",
    name: "Lairo",
    cat: "AI Interest Analyzer",
    studio: "GREEPIXEL",
    kind: "Mobile app",
    industry: "AI · Consumer",
    desc: "Upload a screenshot of a conversation and Lairo's AI analyses it to reveal the other person's level of interest — plus smart suggestions on what to reply next.",
    img: MEDIA.lairo.img,
    tags: ["Flutter", "OpenAI Vision", "Python", "FastAPI"],
  },
  {
    id: "find-a-doc",
    name: "Find a Doc",
    cat: "Doctor Appointment Platform",
    studio: "GREEPIXEL",
    kind: "Mobile app",
    industry: "Healthcare",
    desc: "Patients book appointments with specialised doctors. Doctors set their schedule, manage staff and run their practice — one streamlined platform.",
    img: MEDIA["find-a-doc"].img,
    tags: ["Flutter", "Laravel", "MySQL", "Firebase"],
  },
  {
    id: "shepherd",
    name: "Shepherd",
    cat: "AI Tutor & Study App",
    studio: "GREEPIXEL",
    kind: "Mobile app",
    industry: "EdTech · AI",
    desc: "An AI study co-pilot: topic chat, generated study modules, notes, flashcards, summaries and a study calendar.",
    img: MEDIA.shepherd.img,
    tags: ["Flutter", "OpenAI", "Firebase", "Node.js"],
  },
  {
    id: "deltabook",
    name: "DeltaBook",
    cat: "Interactive Learning Platform",
    studio: "GREEPIXEL",
    kind: "Mobile app",
    industry: "EdTech",
    img: MEDIA.deltabook.img,
    tags: ["Flutter", "Firebase", "Node.js", "MongoDB"],
  },
  {
    id: "xpatio",
    name: "Xpatio",
    cat: "Expat Community App",
    studio: "GREEPIXEL",
    kind: "Mobile app",
    industry: "Social · Community",
    img: MEDIA.xpatio.img,
    tags: ["Flutter", "Node.js", "PostgreSQL", "Firebase"],
  },
  {
    id: "hotcoin",
    name: "Hotcoin",
    cat: "Video Rewards App",
    studio: "GREEPIXEL",
    kind: "Mobile app",
    industry: "Entertainment · Rewards",
    img: MEDIA.hotcoin.img,
    tags: ["Flutter", "Node.js", "Firebase", "Stripe"],
  },
];

/* ---- Studio archive (MILL3 × Studio Mirage) — kept: video work + remaining slots ---- */
const archive: Project[] = [
  {
    id: "moosehead",
    name: "Moosehead",
    cat: "E-Commerce Experience",
    studio: "MILL3",
    year: "2023",
    img: MEDIA.moosehead.img,
    video: MEDIA.moosehead.video,
    tags: ["Web Experience", "Shopify", "Motion"],
    url: "https://mill3.studio/en/projects/moosehead/",
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
    url: "https://cobfoods.com/",
  },
  {
    id: "sopra",
    name: "Sopra Banking",
    cat: "Live Event 3D World",
    studio: "MIRAGE",
    year: "2023",
    img: MEDIA.sopra.img,
    tags: ["Live Event", "Fintech", "3D"],
    url: "https://studiomirage.io/works/sopra-banking",
  },
  {
    id: "caisse",
    name: "Caisse des Dépôts",
    cat: "Real-time 3D Village",
    studio: "MIRAGE",
    year: "2024",
    img: MEDIA.caisse.img,
    tags: ["Real-time 3D", "Public", "Paris"],
    url: "https://studiomirage.io/works/caisse-des-depots",
  },
  {
    id: "jinns",
    name: "Jinns",
    cat: "Campaign & Billboard",
    studio: "MIRAGE",
    year: "2023",
    img: MEDIA.jinns.img,
    tags: ["Campaign", "Beverage", "OOH"],
    url: "https://studiomirage.io/works/jinns",
  },
  {
    id: "biotherm",
    name: "Biotherm",
    cat: "Campaign Visual System",
    studio: "MIRAGE",
    year: "2024",
    img: MEDIA.biotherm.img,
    tags: ["Beauty", "Campaign", "CGI"],
    url: "https://studiomirage.io/works/biotherm",
  },
];

for (const p of portfolio) p.url ??= PORTFOLIO_URL;

export const projects: Project[] = [...portfolio, ...archive];

export const PORTFOLIO_IDS = portfolio.map((p) => p.id);
export const ARCHIVE_IDS = archive.filter((p) => p.id !== "moosehead").map((p) => p.id);

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
  { v: 16, suffix: "", label: "Case studies below" },
  { v: 8, suffix: "", label: "Countries served remotely" },
  { v: 4, suffix: "h", label: "Response time, guaranteed" },
];
