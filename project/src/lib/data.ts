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
  /** e.g. "Web app UX" / "Mobile app UI" */
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
  jalebi: { glyph: "◈", note: "Designed to scale from a single outlet to multi-branch chains — without extra clicks.", features: ["Owner & staff user research", "Order flow redesign", "Inventory dashboard UI", "Universal menu builder", "Recipe & supply screens", "Reporting & data visualisation"] },
  "ad-grants-pilot": { glyph: "✦", note: "Every conversation, response and campaign — visible in one calm dashboard.", features: ["Conversation monitoring UI", "No-code response builder", "Analytics dashboard design", "Multi-campaign navigation"] },
  "on-card": { glyph: "◎", note: "One tap replaces the paper card — and remembers everyone you meet.", features: ["Card builder UI", "One-tap NFC share flow", "Lead capture form design", "Contact sorting & search", "CRM export journey", "Engagement analytics screens"] },
  "kim-and-co": { glyph: "▦", note: "Leadership stopped asking for reports. The answer is always on screen.", features: ["Stakeholder workshops", "Product management UI", "Sales analytics dashboards", "Team reporting views"] },
  lairo: { glyph: "♡", note: "A screenshot goes in. A read on the conversation — and your next reply — comes out.", features: ["Screenshot upload flow", "Interest score visualisation", "AI reply suggestion UI", "Conversation insight cards"] },
  "find-a-doc": { glyph: "✚", note: "Booking a doctor now takes less time than describing the symptom.", features: ["Accessible booking flow", "Doctor schedule UI", "Staff management screens", "Specialty search & filters"] },
  shepherd: { glyph: "⬡", note: "The tutor that remembers how you learn — and plans tomorrow's session.", features: ["AI tutor chat UI", "Flashcard & quiz design", "Study plan screens", "Progress streak design", "Daily task UX", "Instant topic help"] },
  deltabook: { glyph: "❧", note: "Four subjects, one guided path — learners always know what comes next.", features: ["Structured lesson UI", "Subject quiz design", "Progress tracking", "Multi-subject navigation"] },
  xpatio: { glyph: "⌂", note: "A hometown, rebuilt inside an app — wherever in the world you land.", features: ["Community page design", "Local & global events", "Job board UX", "Marketplace UI", "Business profiles", "Social feed design"] },
  hotcoin: { glyph: "●", note: "Watch, earn, redeem — a loop simple enough to become a daily habit.", features: ["Video earning flow", "Daily task design", "Progress & streak UI", "Rewards redemption", "Micro-interactions"] },
};

/* ---- GreePixel portfolio (sourced from the GreeLogix portfolio page) ---- */
const portfolio: Project[] = [
  {
    id: "jalebi",
    name: "Jalebi",
    cat: "Restaurant SaaS UX/UI Design",
    studio: "GREEPIXEL",
    kind: "Web app UX",
    industry: "Food & Hospitality",
    desc: "End-to-end UX and UI design for a restaurant SaaS platform — we mapped how owners, chefs and cashiers really work, then designed one calm system for inventory, orders, customers and operations.",
    img: MEDIA.jalebi.img,
    tags: ["SaaS UX", "Dashboard UI", "Design System", "Figma"],
  },
  {
    id: "ad-grants-pilot",
    name: "Ad Grants Pilot",
    cat: "AI Chatbot Dashboard Design",
    studio: "GREEPIXEL",
    kind: "Web app UX",
    industry: "Non-Profit · AI",
    desc: "An admin dashboard designed for non-profit teams running AI chatbot ad campaigns — clear conversation monitoring, simple response setup and performance insights at a glance.",
    img: MEDIA["ad-grants-pilot"].img,
    tags: ["AI UX", "Admin Dashboard", "Data Viz", "Figma"],
  },
  {
    id: "on-card",
    name: "ON Card",
    cat: "Digital Business Card App Design",
    studio: "GREEPIXEL",
    kind: "Mobile app UI",
    industry: "Networking · FinTech",
    desc: "Mobile app UX and UI for creating and sharing NFC digital business cards — a one-tap sharing flow, effortless lead capture and CRM export, designed around real networking moments.",
    img: MEDIA["on-card"].img,
    tags: ["Mobile UI", "NFC UX", "iOS & Android", "Prototyping"],
  },
  {
    id: "kim-and-co",
    name: "Kim & Co",
    cat: "Internal Sales Dashboard UX",
    studio: "GREEPIXEL",
    kind: "Web app UX",
    industry: "Internal Tools · Retail",
    desc: "UX/UI design for an internal product and sales tool — we turned scattered spreadsheets into clear dashboards that give leadership real-time visibility into performance.",
    img: MEDIA["kim-and-co"].img,
    tags: ["Dashboard UX", "Data Viz", "B2B", "Figma"],
  },
  {
    id: "lairo",
    name: "Lairo",
    cat: "AI App UX & UI Design",
    studio: "GREEPIXEL",
    kind: "Mobile app UI",
    industry: "AI · Consumer",
    desc: "Mobile UI for an AI app that reads a conversation screenshot and reveals the other person's level of interest — designed so complex AI analysis feels simple, friendly and instant.",
    img: MEDIA.lairo.img,
    tags: ["AI UX", "Mobile UI", "Consumer App", "Prototyping"],
  },
  {
    id: "find-a-doc",
    name: "Find a Doc",
    cat: "Healthcare App UX Design",
    studio: "GREEPIXEL",
    kind: "Mobile app UI",
    industry: "Healthcare",
    desc: "Patient and doctor app UX for booking specialist appointments — an accessible booking flow for patients, plus schedule, staff and practice screens for doctors.",
    img: MEDIA["find-a-doc"].img,
    tags: ["Healthcare UX", "Mobile UI", "Accessibility", "Figma"],
  },
  {
    id: "shepherd",
    name: "Shepherd",
    cat: "AI Tutor App UI Design",
    studio: "GREEPIXEL",
    kind: "Mobile app UI",
    industry: "EdTech · AI",
    desc: "UI/UX design for an AI study co-pilot — topic chat, generated study modules, notes, flashcards, summaries and a study calendar, designed to keep learners focused and coming back.",
    img: MEDIA.shepherd.img,
    tags: ["EdTech UX", "AI UX", "Mobile UI", "Gamification"],
  },
  {
    id: "deltabook",
    name: "DeltaBook",
    cat: "E-Learning App UX Design",
    studio: "GREEPIXEL",
    kind: "Mobile app UI",
    industry: "EdTech",
    desc: "Interactive learning app design with a guided path through four subjects — structured lessons, quizzes and progress tracking that always show learners what comes next.",
    img: MEDIA.deltabook.img,
    tags: ["EdTech UX", "Mobile UI", "Learning Design", "Figma"],
  },
  {
    id: "xpatio",
    name: "Xpatio",
    cat: "Community App UX/UI Design",
    studio: "GREEPIXEL",
    kind: "Mobile app UI",
    industry: "Social · Community",
    desc: "UX and UI design for an expat community app — community pages, events, jobs, a marketplace and a social feed, organised into one navigation that feels like home.",
    img: MEDIA.xpatio.img,
    tags: ["Social UX", "Mobile UI", "Information Architecture", "Figma"],
  },
  {
    id: "hotcoin",
    name: "Hotcoin",
    cat: "Rewards App UI Design",
    studio: "GREEPIXEL",
    kind: "Mobile app UI",
    industry: "Entertainment · Rewards",
    desc: "Mobile UI for a video rewards app — a watch, earn and redeem loop with gamified progress and smooth micro-interactions, designed to become a daily habit.",
    img: MEDIA.hotcoin.img,
    tags: ["Gamification", "Mobile UI", "Motion", "Prototyping"],
  },
  {
    id: "startwise",
    name: "Startwise",
    cat: "AI SaaS Workspace UX Design",
    studio: "GREEPIXEL",
    kind: "Web app UX",
    industry: "SaaS · AI",
    desc: "Product design for a multi-tenant SaaS workspace for entrepreneurs, investors, mentors and accelerators — AI business-plan and pitch flows, an investor CRM, a mentor marketplace and subscription UX.",
    note: "From first idea to investor meeting — the plan, the pitch and the people, in one clear workspace.",
    features: ["Multi-tenant information architecture", "AI business-plan flow", "AI pitch builder UI", "Investor CRM design", "Mentor marketplace + booking", "Credit & subscription UX"],
    glyph: "✶",
    img: MEDIA.startwise.img,
    tags: ["SaaS UX", "AI UX", "Design System"],
  },
  {
    id: "mts-rescue",
    name: "MTS",
    cat: "EdTech Product Redesign",
    studio: "GREEPIXEL",
    kind: "Web + mobile UX",
    industry: "Education · EdTech",
    desc: "An education platform stuck in limbo with a previous vendor of 70+ engineers — we audited the UX, redesigned the core student and teacher journeys and helped the team take them live.",
    note: "Dead → Live. What a 70-engineer vendor couldn't ship, a senior team redesigned and launched.",
    features: ["UX audit of the stalled product", "Student journey redesign", "Teacher dashboard redesign", "Unified design system", "Web + mobile app UI"],
    glyph: "✷",
    img: MEDIA["mts-rescue"].img,
    tags: ["UX Audit", "Redesign", "EdTech UX", "Design System", "Web + Mobile"],
  },
  {
    id: "gcc-fitness",
    name: "GCC Fitness",
    cat: "Fitness Marketplace UX Design",
    studio: "GREEPIXEL",
    kind: "Mobile app UI",
    industry: "Fitness · Wellness",
    desc: "A three-sided fitness marketplace designed for clients, trainers and admins — workout and meal subscriptions, payments, real-time chat and fully bilingual English / Arabic (RTL) interfaces.",
    note: "Clients, trainers and admins — three sides, one marketplace, two languages, zero confusion.",
    features: ["Client mobile app UI", "Trainer dashboard", "Admin dashboard", "Subscription & checkout UX", "Real-time chat UI", "OTP sign-in flow", "English / Arabic RTL layouts"],
    glyph: "⬢",
    img: MEDIA["gcc-fitness"].img,
    tags: ["Marketplace UX", "RTL Design", "Mobile UI", "Dashboard UI", "Shadcn UI"],
  },
  {
    id: "the-incc",
    name: "The INCC",
    cat: "Social Network UX/UI Design",
    studio: "GREEPIXEL",
    kind: "Mobile app UI",
    industry: "Social · Media",
    desc: "We joined The INCC (The Inccubator) mid-development to evolve its social experience across the Flutter and iOS apps and the admin dashboard — new social features designed to fit the live product.",
    note: "Joined mid-flight and kept it flying — new features, nothing that was live broke.",
    features: ["Social feature design", "Flutter + iOS app UI", "Admin dashboard UX", "Design consistency audit", "Integration-safe user flows"],
    glyph: "◉",
    img: MEDIA["the-incc"].img,
    tags: ["Social UX", "Mobile UI", "Product Design", "Figma"],
  },
];

/* ---- Motion work (product films), created by GreePixel ---- */
const archive: Project[] = [
  {
    id: "agp-film",
    name: "Ad Grants Pilot",
    cat: "AI Chatbot Dashboard Design",
    studio: "GREEPIXEL",
    credit: true,
    kind: "Product film",
    img: MEDIA["agp-film"].img,
    video: MEDIA["agp-film"].video,
    tags: ["Product Film", "Dashboard UI", "Motion Design"],
  },
  {
    id: "jalebi-film",
    name: "Jalebi",
    cat: "Restaurant SaaS UX/UI Design",
    studio: "GREEPIXEL",
    credit: true,
    kind: "Product film",
    img: MEDIA["jalebi-film"].img,
    video: MEDIA["jalebi-film"].video,
    tags: ["Product Film", "SaaS UI", "Motion Design"],
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
    body: "We design interfaces the way pixels build pictures — deliberately, unit by unit, until every screen feels obvious. No guesswork. No wasted clicks.",
    meta: "METHOD / UI CRAFT",
  },
  {
    k: "02",
    title: ["UX THAT", "CONVERTS"],
    accent: "RESEARCH",
    body: "User research, journey maps and usability testing turn assumptions into evidence. We design the flows that lift sign-ups, retention and revenue.",
    meta: "CAPABILITY / UX RESEARCH",
  },
  {
    k: "03",
    title: ["DESIGN ×", "SYSTEMS"],
    accent: "RIGOR",
    body: "Figma design systems, tokens and component libraries developers can ship without guessing. One source of truth, zero design drift, faster releases.",
    meta: "CAPABILITY / DESIGN SYSTEMS",
  },
  {
    k: "04",
    title: ["SENIOR", "ONLY."],
    accent: "PROOF",
    body: "150+ digital products designed for clients across the US, UK, UAE and Australia. No junior hand-offs — you work directly with your designers.",
    meta: "PROMISE / DELIVERY",
  },
];

export const services = [
  { n: "01", t: "UX Research & Strategy", d: "Interviews, analytics and usability tests that reveal what users need.", tags: ["Interviews", "Testing"] },
  { n: "02", t: "UI Design", d: "Pixel-perfect interfaces with clear hierarchy and accessible contrast.", tags: ["Figma", "WCAG"] },
  { n: "03", t: "MVP Product Design", d: "Idea to clickable, investor-ready prototype in 4–8 weeks.", tags: ["Prototyping", "Sprints"] },
  { n: "04", t: "SaaS & Dashboard UX", d: "Complex data made calm: dashboards, admin panels and B2B workflows.", tags: ["SaaS", "Data Viz", "B2B"] },
  { n: "05", t: "Mobile App Design", d: "iOS and Android app UI that feels native, fast and thumb-friendly.", tags: ["iOS", "Android"] },
  { n: "06", t: "Design Systems", d: "Tokens, components and docs developers can build. Zero drift.", tags: ["Figma", "Tokens"] },
  { n: "07", t: "UX Audits & Redesigns", d: "We audit live products and redesign the friction out of them.", tags: ["Heuristics", "Accessibility"] },
  { n: "08", t: "Interaction & 3D Design", d: "Micro-interactions, motion and WebGL moments that make brands memorable.", tags: ["Motion", "WebGL"] },
];

export const stats = [
  { v: 150, suffix: "+", label: "Products designed worldwide" },
  { v: 16, suffix: "", label: "Case studies below" },
  { v: 8, suffix: "", label: "Countries served remotely" },
  { v: 4, suffix: "h", label: "Response time, guaranteed" },
];
