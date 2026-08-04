/**
 * Gauntlet Loop capture + measurement harness.
 *
 * Why this lives in the repo: Round 2 (2026-08-04) built an equivalent harness
 * in a session scratchpad instead of committing it. That session ended and the
 * harness was lost, so the next round had to start by rebuilding it. Per the
 * gauntlet-loop skill's Step 5, the durable record belongs in the repo.
 *
 * It drives the real app in headless Chrome, shoots named camera/quality
 * combinations, and reports numbers a rubric can actually be scored against
 * (clipped-white %, clipped-black %, mean RGB per band) rather than adjectives.
 * Rubric item 10 ("no clipped pure-white or pure-black regions") becomes a
 * measurement instead of an opinion.
 *
 * Uses playwright-core against the system Chrome install — deliberately no
 * bundled-browser download, so a clean checkout stays cheap to set up.
 *
 * Usage:
 *   npm run shot                          # all tiers, default camera
 *   npm run shot -- --quality=high        # one tier
 *   npm run shot -- --out=docs/evidence/shots
 *   npm run shot -- --settle=8000         # ms to let the sim/rig settle
 */

import { chromium, type Browser, type Page } from "playwright-core";
import { mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

interface Args {
  base: string;
  out: string;
  settle: number;
  quality: string[];
  width: number;
  height: number;
  probes: Probe[];
}

/** A named patch of the frame to measure, in fractions of width/height. */
interface Probe {
  name: string;
  x: number;
  y: number;
}

/**
 * Default probes exist because bar v2 point 7 — "shallow water is
 * high-saturation cyan and obviously distinct from deep water" — is a
 * *comparison between two regions*, and whole-frame band averages cannot
 * express it. A cold critic measured these by hand and found the shallow band
 * at HSV saturation 0.25 against deep water's 0.61, i.e. the shallow band was
 * the least saturated water in frame, exactly backwards from the references.
 * That is a number worth being able to regenerate in one command.
 *
 * Positions are tuned to the default camera framing. If the camera moves,
 * re-aim them with --probe rather than trusting these.
 */
const DEFAULT_PROBES: Probe[] = [
  { name: "open-sea-far", x: 0.5, y: 0.1 },
  { name: "open-sea-near", x: 0.9, y: 0.62 },
  { name: "shelf-shallow", x: 0.3, y: 0.56 },
  { name: "shoreline", x: 0.47, y: 0.66 },
];

function parseArgs(): Args {
  const get = (k: string): string | undefined =>
    process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
  const q = get("quality");
  // --probe=name:xPct,yPct — repeatable; any use replaces the default set.
  const probeArgs = process.argv
    .filter((a) => a.startsWith("--probe="))
    .map((a) => {
      const [name, coords] = a.slice("--probe=".length).split(":");
      const [x, y] = (coords ?? "").split(",").map(Number);
      if (name === undefined || Number.isNaN(x!) || Number.isNaN(y!)) {
        throw new Error(`Bad --probe (want name:xPct,yPct): ${a}`);
      }
      return { name, x: x!, y: y! };
    });
  return {
    base: get("base") ?? "http://localhost:5173",
    out: get("out") ?? "docs/evidence/shots",
    settle: Number(get("settle") ?? 6000),
    quality: q ? q.split(",") : ["low", "high"],
    width: Number(get("width") ?? 1280),
    height: Number(get("height") ?? 800),
    probes: probeArgs.length > 0 ? probeArgs : DEFAULT_PROBES,
  };
}

function findChrome(): string {
  const explicit = process.env.CHROME_PATH;
  if (explicit && existsSync(explicit)) return explicit;
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      "No Chrome/Chromium found. Set CHROME_PATH=/path/to/chrome, or install Google Chrome.",
    );
  }
  return found;
}

/**
 * Regional pixel stats, measured by decoding the captured PNG inside the page.
 *
 * Deliberately NOT gl.readPixels: the renderer is created without
 * `preserveDrawingBuffer`, so the WebGL backbuffer is cleared once the frame is
 * composited and a readback returns all-zero (measured 2026-08-04 — every band
 * came back 100% clipped-black, which is the tell). The screenshot PNG is
 * captured by the browser compositor and is unaffected, so decode that instead.
 * Bands are top-down here: y=0 is the top of the image = sky.
 */
const measureExpr = (dataUrl: string, probes: Probe[]): string => `(async () => {
  const img = new Image();
  img.src = ${JSON.stringify(dataUrl)};
  await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const buf = ctx.getImageData(0, 0, w, h).data;
  // HSV saturation of a mean colour. Bar v2 talks about saturation directly
  // ("high-saturation cyan", "clearly chromatic, not near-neutral"), so report
  // it rather than leaving every reader to derive it from RGB. blue/red is
  // kept alongside because the sky/water work has been tracked in those terms.
  const sat = (R, G, B) => {
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    return mx === 0 ? 0 : (mx - mn) / mx;
  };
  const stats = (r, g, b, n, cw, cb) => {
    const R = r/n, G = g/n, B = b/n;
    return {
      meanRGB: [+R.toFixed(1), +G.toFixed(1), +B.toFixed(1)],
      saturation: +sat(R, G, B).toFixed(3),
      blueOverRed: +(B / Math.max(R, 0.01)).toFixed(3),
      clippedWhitePct: +(100*cw/n).toFixed(2),
      clippedBlackPct: +(100*cb/n).toFixed(2),
    };
  };
  const band = (lo, hi) => {
    let r = 0, g = 0, b = 0, n = 0, cw = 0, cb = 0;
    for (let y = Math.floor(h * lo); y < Math.floor(h * hi); y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, R = buf[i], G = buf[i+1], B = buf[i+2];
        r += R; g += G; b += B; n++;
        if (R >= 250 && G >= 250 && B >= 250) cw++;
        if (R <= 5 && G <= 5 && B <= 5) cb++;
      }
    }
    if (n === 0) return null;
    return stats(r, g, b, n, cw, cb);
  };
  // Named patches — a 15x15 box, big enough to average out ripple noise and
  // small enough to stay inside one water band.
  const probeAt = (px, py) => {
    const cx = Math.round(w * px), cy = Math.round(h * py);
    let r = 0, g = 0, b = 0, n = 0, cw = 0, cb = 0;
    for (let y = Math.max(0, cy-7); y <= Math.min(h-1, cy+7); y++) {
      for (let x = Math.max(0, cx-7); x <= Math.min(w-1, cx+7); x++) {
        const i = (y * w + x) * 4, R = buf[i], G = buf[i+1], B = buf[i+2];
        r += R; g += G; b += B; n++;
        if (R >= 250 && G >= 250 && B >= 250) cw++;
        if (R <= 5 && G <= 5 && B <= 5) cb++;
      }
    }
    return stats(r, g, b, n, cw, cb);
  };
  const probes = {};
  for (const p of ${JSON.stringify(probes)}) probes[p.name] = probeAt(p.x, p.y);
  // Vertical profile down the image centre — the thing that settles "is that
  // pale band actually the sky, and does it have a gradient at all?"
  const column = [];
  const cx = Math.floor(w * 0.5);
  for (let f = 0; f <= 1.0001; f += 0.05) {
    const y = Math.min(h - 1, Math.floor(h * f));
    let r = 0, g = 0, b = 0;
    for (let x = cx - 8; x <= cx + 8; x++) {
      const i = (y * w + x) * 4;
      r += buf[i]; g += buf[i+1]; b += buf[i+2];
    }
    const n = 17;
    column.push({ yPct: +(f*100).toFixed(0), rgb: [Math.round(r/n), Math.round(g/n), Math.round(b/n)] });
  }
  return { size: [w, h], sky: band(0.0, 0.28), mid: band(0.28, 0.65), ground: band(0.65, 1.0), whole: band(0, 1), probes, column };
})()`;

async function shoot(page: Page, args: Args, quality: string): Promise<void> {
  const url = `${args.base}/?quality=${quality}`;
  await page.goto(url, { waitUntil: "load" });
  // The sim + the rig's startup calibration both need real frames to run.
  await page.waitForTimeout(args.settle);

  const file = resolve(args.out, `${quality}.png`);
  const png = await page.screenshot({ path: file });

  const stats = (await page.evaluate(
    measureExpr(`data:image/png;base64,${png.toString("base64")}`, args.probes),
  )) as Record<string, unknown>;
  console.log(`\n=== quality=${quality} ===`);
  console.log(`  shot: ${file}`);

  // Compact summary first — the JSON below is complete but nobody reads a
  // column profile to answer "did saturation move".
  const line = (label: string, s: Record<string, unknown> | null): void => {
    if (!s) return;
    const rgb = (s.meanRGB as number[]).map((v) => String(v).padStart(5)).join(",");
    console.log(
      `  ${label.padEnd(15)} rgb(${rgb})  sat ${String(s.saturation).padEnd(5)}` +
        `  b/r ${String(s.blueOverRed).padEnd(5)}` +
        `  clip ${s.clippedWhitePct}%W ${s.clippedBlackPct}%B`,
    );
  };
  for (const b of ["sky", "mid", "ground", "whole"]) {
    line(b, stats[b] as Record<string, unknown> | null);
  }
  for (const [name, s] of Object.entries(stats.probes as Record<string, never>)) {
    line(`probe:${name}`, s);
  }
  console.log(JSON.stringify(stats, null, 2));
}

async function main(): Promise<void> {
  const args = parseArgs();
  mkdirSync(args.out, { recursive: true });

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      executablePath: findChrome(),
      // SwiftShader keeps this reproducible on machines with no GPU (CI, containers).
      args: ["--use-gl=angle", "--enable-unsafe-swiftshader", "--hide-scrollbars"],
    });
    const page = await browser.newPage({
      viewport: { width: args.width, height: args.height },
      deviceScaleFactor: 1,
    });
    const logs: string[] = [];
    page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
    page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

    for (const q of args.quality) await shoot(page, args, q);

    const rig = logs.filter((l) => l.includes("[rig]"));
    if (rig.length > 0) console.log(`\n=== rig calibration ===\n${[...new Set(rig)].join("\n")}`);
    const errs = logs.filter((l) => l.startsWith("[pageerror]") || l.startsWith("[error]"));
    if (errs.length > 0) console.log(`\n=== page errors ===\n${[...new Set(errs)].join("\n")}`);
  } finally {
    await browser?.close();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
