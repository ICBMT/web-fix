#!/usr/bin/env node
// Downloads the case-study videos from mill3.studio into src/media/work/.
// src/lib/assets.ts picks them up automatically (import.meta.glob), so after
// running this the Moosehead / COB cards switch from poster image to video.
//
//   npm run fetch:videos          # skip files that already exist
//   npm run fetch:videos -- -f    # force re-download
//
// Sources were found via MILL3's public WordPress media API
// (https://mill3.studio/wp-json/wp/v2/media?search=moosehead).
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../src/media/work");
const FORCE = process.argv.includes("-f") || process.argv.includes("--force");

const VIDEOS = [
  {
    // 960×600, 7s, ~660 KB — Moosehead Lager hero loop
    file: "moosehead.mp4",
    url: "https://mill3.studio/wp-content/uploads/2024/06/MOOSEHEAD_LAGER_1920X1200_v02.mp4",
  },
  {
    // COB Foods homepage loop
    file: "cob.mp4",
    url: "https://mill3.studio/wp-content/uploads/2025/11/COB_HOME_V07-c.mp4",
  },
];

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

async function exists(p) {
  try {
    return (await stat(p)).size > 0;
  } catch {
    return false;
  }
}

async function download({ file, url }) {
  const dest = path.join(OUT_DIR, file);
  if (!FORCE && (await exists(dest))) {
    console.log(`✓ ${file} already present (use -f to re-download)`);
    return true;
  }
  process.stdout.write(`↓ ${file} ← ${url} ... `);
  const res = await fetch(url, { headers: { "User-Agent": UA, Referer: "https://mill3.studio/" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // sanity check: MP4 files carry an "ftyp" box in the first bytes
  if (!buf.subarray(0, 16).toString("latin1").includes("ftyp")) {
    throw new Error("response is not an MP4 file");
  }
  await writeFile(dest, buf);
  console.log(`${(buf.length / 1024).toFixed(0)} KB`);
  return true;
}

await mkdir(OUT_DIR, { recursive: true });
let failed = 0;
for (const v of VIDEOS) {
  try {
    await download(v);
  } catch (err) {
    failed++;
    console.log(`\n✗ ${v.file}: ${err.message}`);
  }
}
if (failed) {
  console.log(`\n${failed} video(s) failed. The site still works — those cards fall back to their poster image.`);
  process.exitCode = 1;
} else {
  console.log("\nDone. Restart `npm run dev` if it is running so Vite picks up the new files.");
}
