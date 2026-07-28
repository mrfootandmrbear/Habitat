import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Minimal N-001 guard: no public sim API named or labeled as ecosystem painting.
 * Full A-005 behavioral criterion comes after siting preview exists.
 */
const FORBIDDEN = [
  /paintEcosystem/i,
  /placeWetland/i,
  /placeForest/i,
  /ecosystemPainter/i,
  /paintBiome/i,
];

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkTs(path, acc);
    else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) acc.push(path);
  }
  return acc;
}

describe("register prohibitions (N-001 smoke)", () => {
  it("sim public surface has no ecosystem-painting API names", () => {
    const simRoot = join(import.meta.dirname);
    const files = walkTs(simRoot);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const pattern of FORBIDDEN) {
        expect(text, `${file} matches ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
