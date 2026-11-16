import { GLB_URL, LOGO_BLACK, LOGO_WHITE, MEDIA } from "./assets";

export { GLB_URL, LOGO_BLACK, LOGO_WHITE };

export type Studio = "GREEPIXEL";

export const CREDIT = "Created by GreePixel";

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
  /** Pull-quote shown on the story card. */
  note?: string;
  /** "Inside the build" list on the story card. */
  features?: string[];
  /** Decorative glyph floating on the story visual. */
  glyph?: string;
  /** Video work: shows a "Created by GreePixel" credit. */
  credit?: boolean;
};

/** Every "start a project" CTA books a call here. */
export const CALENDLY_URL = "https://calendly.com/abuzer/30min?back=1";

/** Contact details (source: greelogix.com, "Get In Touch"). These, plus Calendly, are the
 *  ONLY links allowed to leave the site — see ALLOWED_LINKS in linkGuard.ts. */
export const CONTACT = {
  email: "contact@greelogix.com",
  emailHref: "mailto:contact@greelogix.com",
  phone: "+92 333 65 27 366",
  phoneHref: "tel:+923336527366",
  whatsapp: "Chat on WhatsApp",
  whatsappHref: "https://wa.me/923336527366",
} as const;

export const STUDIO_LABEL: Record<Studio, string> = {
  GREEPIXEL: "GREEPIXEL®",
};

/** "2023" for archive work, "MOBILE APP" etc. for portfolio work. */
export function projectMeta(p: Project) {
  return p.year ?? (p.kind ?? "").toUpperCase();
}

/* Story-card extras (note, "inside the build", glyph), from the GreeLogix portfolio data. */
const STORY: Record<string, Pick<Project, "note" | "features" | "glyph">> = {
  jalebi: { glyph: "◈", note: "Built to scale from single outlets to multi-branch chains.", features: ["Supply management", "Universal menu", "Smarter inventory", "Smarter orders", "Intelligent recipes", "Insightful reporting"] },
  "ad-grants-pilot": { glyph: "✦", note: "Every conversation, response and campaign — visible in one calm dashboard.", features: ["Conversation monitoring", "Automated response config", "Performance analytics", "Multi-campaign management"] },
  "on-card": { glyph: "◎", note: "One tap replaces the paper card — and remembers everyone you meet.", features: ["Save & sort contacts", "Lead capture form", "Export to Salesforce / CRM", "NFC card (Ion NFC)", "ROI tracking on networking", "Engagement analytics"] },
  "kim-and-co": { glyph: "▦", note: "Leadership stopped asking for reports. The answer is always on screen.", features: ["Product management", "Sales analytics", "Performance dashboards", "Team reporting"] },
  lairo: { glyph: "♡", note: "A screenshot goes in. A read on the conversation — and your next reply — comes out.", features: ["Screenshot analysis", "Interest level scoring", "AI reply suggestions", "Conversation insights"] },
  "find-a-doc": { glyph: "✚", note: "Booking a doctor now takes less time than describing the symptom.", features: ["Patient appointment booking", "Doctor schedule management", "Staff management", "Specialisation search"] },
  shepherd: { glyph: "⬡", note: "The tutor that remembers how you learn — and plans tomorrow's session.", features: ["AI-powered tutor", "Flashcards & quizzes", "Study plans", "Progress streaks", "Daily task management", "Instant topic help"] },
  deltabook: { glyph: "❧", note: "Four subjects, one guided path — learners always know what comes next.", features: ["Structured lessons", "Subject quizzes", "Progress tracking", "Multi-subject support"] },
  xpatio: { glyph: "⌂", note: "A hometown, rebuilt inside an app — wherever in the world you land.", features: ["Community pages", "Local & global events", "Job board", "Marketplace", "Business profiles", "Social feed"] },
  hotcoin: { glyph: "●", note: "Watch, earn, redeem — a loop simple enough to become a daily habit.", features: ["Video-based coin earning", "Daily tasks", "Progress tracking", "Rewards redemption", "Smooth UX"] },
};

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
  {
    id: "startwise",
    name: "Startwise",
    cat: "AI Startup Workspace",
    studio: "GREEPIXEL",
    kind: "Web platform",
    industry: "SaaS · AI",
    desc: "A multi-tenant SaaS workspace for entrepreneurs, investors, mentors, PMs and accelerators — AI business-plan and pitch generation, investor CRM, a mentor marketplace with Google Meet, and credit-based subscriptions.",
    note: "From first idea to investor meeting — the plan, the pitch and the people in one workspace.",
    features: ["Multi-tenant workspaces", "AI business-plan generation", "AI pitch generation", "Investor CRM", "Mentor marketplace + Google Meet", "Credit-based subscriptions"],
    glyph: "✶",
    img: MEDIA.startwise.img,
    tags: ["SaaS", "AI", "Google Meet"],
  },
  {
    id: "mts-rescue",
    name: "MTS",
    cat: "EdTech Platform Rescue",
    studio: "GREEPIXEL",
    kind: "Web + mobile",
    industry: "Education · EdTech",
    desc: "An education platform stuck in development limbo with a previous vendor of 70+ engineers — we took it over, stabilised the codebase, shipped the core student and teacher experience, and made the client happy.",
    note: "Dead → Live. What a 70-engineer vendor couldn't ship, a senior team did.",
    features: ["Takeover from a stalled vendor", "Codebase stabilised", "Core student experience", "Core teacher experience", "React Native app + Angular web"],
    glyph: "✷",
    img: MEDIA["mts-rescue"].img,
    tags: ["React Native", "Angular", "Laravel", "PHP", "MySQL"],
  },
  {
    id: "gcc-fitness",
    name: "GCC Fitness",
    cat: "Trainer & Client Marketplace",
    studio: "GREEPIXEL",
    kind: "Mobile app",
    industry: "Fitness · Wellness",
    desc: "A three-sided fitness marketplace backend: mobile API, trainer dashboard and admin dashboard — dual workout and meal subscriptions, MyFatoorah, Firebase, SMS OTP, Reverb chat, and English / Arabic.",
    note: "Clients, trainers and admins — three sides, one marketplace, two languages.",
    features: ["Mobile API", "Trainer dashboard", "Admin dashboard", "Workout + meal subscriptions", "MyFatoorah payments", "Reverb real-time chat", "SMS OTP + Firebase", "English / Arabic"],
    glyph: "⬢",
    img: MEDIA["gcc-fitness"].img,
    tags: ["Laravel 12", "Inertia", "React", "TypeScript", "Shadcn UI"],
  },
  {
    id: "the-incc",
    name: "The INCC",
    cat: "Multi-Platform Social Network",
    studio: "GREEPIXEL",
    kind: "Mobile app",
    industry: "Social · Media",
    desc: "We joined The INCC (The Inccubator) during ongoing development and continued its Laravel backend, Flutter and iOS apps and admin dashboard — adding social features and keeping third-party integrations stable.",
    note: "Joined mid-flight and kept it flying — new features, nothing that was live broke.",
    features: ["Laravel backend", "Flutter + iOS apps", "Admin dashboard", "New social features", "Stable third-party integrations"],
    glyph: "◉",
    img: MEDIA["the-incc"].img,
    tags: ["Laravel 10", "PHP", "MySQL", "Laravel Passport", "Flutter"],
  },
];

/* ---- Motion work (video), created by GreePixel ---- */
const archive: Project[] = [
  {
    id: "moosehead",
    name: "Moosehead",
    cat: "E-Commerce Experience",
    studio: "GREEPIXEL",
    credit: true,
    year: "2023",
    img: MEDIA.moosehead.img,
    video: MEDIA.moosehead.video,
    tags: ["Web Experience", "Shopify", "Motion"],
  },
  {
    id: "cob",
    name: "COB Foods",
    cat: "Brand Site / WebGL",
    studio: "GREEPIXEL",
    credit: true,
    year: "2024",
    img: MEDIA.cob.img,
    video: MEDIA.cob.video,
    tags: ["Art Direction", "WebGL", "CPG"],
  },
];

for (const p of portfolio) Object.assign(p, { ...STORY[p.id], ...p });

export const projects: Project[] = [...portfolio, ...archive];

export const PORTFOLIO_IDS = portfolio.map((p) => p.id);
export const VIDEO_IDS = archive.map((p) => p.id);

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
