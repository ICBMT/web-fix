# GreePixel® — 3D scrollytelling site

React 19 + Vite 7 + Tailwind 4 + Three.js + GSAP/Lenis. Builds to a single
self-contained `dist/index.html` (all media inlined by `vite-plugin-singlefile`).

## Setup

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
