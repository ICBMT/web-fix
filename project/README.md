# GreePixel® — 3D scrollytelling site

React 19 + Vite 7 + Tailwind 4 + Three.js + GSAP/Lenis. Builds to a single
self-contained `dist/index.html` (all media inlined by `vite-plugin-singlefile`).

## Setup

The commands work from either the repo root (a wrapper `package.json` forwards
them into `project/`) or from inside `project/`.

```bash
npm install
npm run fetch:videos   # optional: downloads Moosehead + COB case-study videos from mill3.studio
npm run dev
```

## Media

| Folder | Contents |
| --- | --- |
| `src/media/work/` | Case-study images (`<id>.jpg`) and optional videos (`<id>.mp4`) |
| `src/media/lab/` | Lab / R&D gallery images |
| `src/media/fonts/` | Self-hosted fonts (Anton, Space Grotesk, JetBrains Mono, Silkscreen) |

Media is collected with `import.meta.glob` in `src/lib/assets.ts`, so:

- a missing image shows a branded placeholder instead of breaking the build;
- dropping `<id>.mp4` into `src/media/work/` automatically turns that card into
  a video card (restart `npm run dev` after adding files).

## Troubleshooting

- **`Missing script: "fetch:videos"` / `Failed to load url /src/main.tsx`** — npm
  could not find this project's `package.json` and used one from a parent folder
  instead. Pull the latest branch (it includes a root wrapper) or `cd project`
  first. Also remove any stray `package.json` / `node_modules` from parent
  folders such as `~/Downloads`.
- **`ENOSPC: System limit for number of file watchers reached`** — Vite was
  started from the wrong (too large) folder, see above. If it still happens
  inside `project/`, raise the Linux inotify limit:
  `echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/99-inotify.conf && sudo sysctl --system`
