import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { generateMountain } from "./terrain/generateMountain";
import { SUBSTRATE_SAND } from "./terrain/substrates";
import { WorldState } from "./WorldState";

/**
 * C-006 — sculpting is abundant; scarcity lives in ecological time.
 * Criterion: no per-edit economy; no siting path writes mature ecology (N-001, RC-004).
 */
const ECONOMY_PATTERNS = [
  /editBudget/i,
  /sculptCost/i,
  /sculptCooldown/i,
  /maxEditsPer/i,
  /actionPoints?/i,
  /interventionBudget/i,
  /terrainCredits?/i,
];

function walkTs(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkTs(path, acc);
    else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) acc.push(path);
  }
  return acc;
}

function sumGrid(data: Float32Array): number {
  let s = 0;
  for (let i = 0; i < data.length; i++) s += data[i]!;
  return s;
}

describe("C-006 abundant sculpting (CI promote)", () => {
  it("sim + UI + config source has no per-edit economy counters", () => {
    const simRoot = join(import.meta.dirname);
    const uiRoot = join(import.meta.dirname, "../ui");
    const files = [
      ...walkTs(simRoot),
      ...walkTs(uiRoot),
      join(import.meta.dirname, "../config.ts"),
    ];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const pattern of ECONOMY_PATTERNS) {
        expect(text, `${file} matches ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("100 berm/dig/deposit edits succeed with no rejection and no veg write", () => {
    const world = new WorldState(generateMountain(24, 24, 6, 2));
    const herb0 = sumGrid(world.herbBiomass.data);
    const strand0 = sumGrid(world.strandBiomass.data);
    const binder0 = sumGrid(world.binderBiomass.data);
    const marsh0 = sumGrid(world.marshBiomass.data);
    const shrub0 = sumGrid(world.shrubBiomass.data);
    const cover0 = sumGrid(world.vegCover.data);
    const elev0 = world.terrain.get(12, 12);

    for (let i = 0; i < 40; i++) {
      world.raiseBerm(10 + (i % 5), 10 + (i % 4), 0.15);
    }
    for (let i = 0; i < 30; i++) {
      world.digChannel(8 + (i % 4), 8 + (i % 5), 0.1);
    }
    for (let i = 0; i < 30; i++) {
      world.depositSubstrate(14 + (i % 3), 14 + (i % 3), SUBSTRATE_SAND, 0.12);
    }

    expect(sumGrid(world.herbBiomass.data)).toBe(herb0);
    expect(sumGrid(world.strandBiomass.data)).toBe(strand0);
    expect(sumGrid(world.binderBiomass.data)).toBe(binder0);
    expect(sumGrid(world.marshBiomass.data)).toBe(marsh0);
    expect(sumGrid(world.shrubBiomass.data)).toBe(shrub0);
    expect(sumGrid(world.vegCover.data)).toBe(cover0);
    expect(world.terrain.get(12, 12)).not.toBe(elev0);
  });

  it("heavy sculpting without elapsed time leaves biomass at zero (no mature ecology)", () => {
    const world = new WorldState(generateMountain(20, 20, 5, 3));
    for (let z = 4; z < 16; z += 2) {
      for (let x = 4; x < 16; x += 2) {
        world.raiseBerm(x, z, 0.4);
        world.digChannel(x + 1, z + 1, 0.3);
        world.depositSubstrate(x, z + 1, SUBSTRATE_SAND, 0.25);
      }
    }
    expect(sumGrid(world.herbBiomass.data)).toBe(0);
    expect(sumGrid(world.strandBiomass.data)).toBe(0);
    expect(sumGrid(world.binderBiomass.data)).toBe(0);
    expect(sumGrid(world.marshBiomass.data)).toBe(0);
    expect(sumGrid(world.shrubBiomass.data)).toBe(0);
    expect(sumGrid(world.vegCover.data)).toBe(0);
  });
});
