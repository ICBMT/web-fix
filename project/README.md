# GreePixel® — 3D scrollytelling site

React 19 + Vite 7 + Tailwind 4 + Three.js + GSAP/Lenis. Builds to a single
self-contained `dist/index.html` (all media inlined by `vite-plugin-singlefile`).

## Setup

The commands work from either the repo root (a wrapper `package.json` forwards
them into `project/`) or from inside `project/`.

```bash
npm install
npm run dev
```

## Media

| Folder | Contents |
| --- | --- |
| `src/media/work/` | Case-study images (`<id>.jpg`) and optional videos (`<id>.mp4`), e.g. the product films `agp-film.mp4` / `jalebi-film.mp4` |
| `src/media/lab/` | Lab / R&D gallery images |
| `src/media/fonts/` | Self-hosted fonts (Schibsted Grotesk — PP Mori look-alike, Geist Mono, Silkscreen — OFL) |

Media is collected with `import.meta.glob` in `src/lib/assets.ts`, so:

- a missing image shows a branded placeholder instead of breaking the build;
- dropping `<id>.mp4` into `src/media/work/` automatically turns that card into
  a video card (restart `npm run dev` after adding files).

## Troubleshooting

- **`Missing script` / `Failed to load url /src/main.tsx`** — npm
  could not find this project's `package.json` and used one from a parent folder
  instead. Pull the latest branch (it includes a root wrapper) or `cd project`
  first. Also remove any stray `package.json` / `node_modules` from parent
  folders such as `~/Downloads`.
- **`ENOSPC: System limit for number of file watchers reached`** — Vite was
  started from the wrong (too large) folder, see above. If it still happens
  inside `project/`, raise the Linux inotify limit:
  `echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/99-inotify.conf && sudo sysctl --system`

## SEO / GEO

The site is set up for **https://greepixel.com** (deploy `dist/` to the domain root).

- `index.html` — title, description, canonical, Open Graph / Twitter cards (`og-image.jpg`, 1200×630), geo meta (Lahore, PK-PB) and JSON-LD: ProfessionalService/Organization (founded 2019, Lahore, English/Urdu/Arabic, price range `$$`, 8 services), WebSite, WebPage and an ItemList of the 14 case studies. A `<noscript>` summary covers crawlers that don't run JavaScript.
- `public/robots.txt` — open to all crawlers, AI answer engines named explicitly, points to the sitemap.
- `public/sitemap.xml` — the site URL (the Work page lives at `/#/work`, which search engines treat as the same URL).
- `public/llms.txt` — plain-language studio summary for AI assistants.
- `public/site.webmanifest`, `favicon-48.png`, `favicon.svg`, `apple-touch-icon.png`, `icon-512.png`, `logo.png` — icons and the logo referenced by the structured data.

After launch: add the domain in Google Search Console and Bing Webmaster Tools, and submit `https://greepixel.com/sitemap.xml`.
