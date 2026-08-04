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
}

function parseArgs(): Args {
  const get = (k: string): string | undefined =>
    process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
  const q = get("quality");
  return {
    base: get("base") ?? "http://localhost:5173",
    out: get("out") ?? "docs/evidence/shots",
    settle: Number(get("settle") ?? 6000),
    quality: q ? q.split(",") : ["low", "high"],
    width: Number(get("width") ?? 1280),
    height: Number(get("height") ?? 800),
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
const measureExpr = (dataUrl: string): string => `(async () => {
  const img = new Image();
  img.src = ${JSON.stringify(dataUrl)};
  await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const buf = ctx.getImageData(0, 0, w, h).data;
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
    return {
      meanRGB: [+(r/n).toFixed(1), +(g/n).toFixed(1), +(b/n).toFixed(1)],
      clippedWhitePct: +(100*cw/n).toFixed(2),
      clippedBlackPct: +(100*cb/n).toFixed(2),
    };
  };
  return { size: [w, h], sky: band(0.0, 0.28), mid: band(0.28, 0.65), ground: band(0.65, 1.0), whole: band(0, 1) };
})()`;

async function shoot(page: Page, args: Args, quality: string): Promise<void> {
  const url = `${args.base}/?quality=${quality}`;
  await page.goto(url, { waitUntil: "load" });
  // The sim + the rig's startup calibration both need real frames to run.
  await page.waitForTimeout(args.settle);

  const file = resolve(args.out, `${quality}.png`);
  const png = await page.screenshot({ path: file });

  const stats = await page.evaluate(measureExpr(`data:image/png;base64,${png.toString("base64")}`));
  console.log(`\n=== quality=${quality} ===`);
  console.log(`  shot: ${file}`);
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
