import { describe, expect, it } from "vitest";
import { config } from "../config";
import { WorldState } from "./WorldState";
import {
  DEFAULT_SEA_LEVEL_METERS,
  generateIsland,
  paintIslandSoilDepth,
} from "./terrain/generateIsland";

function landStats(
  elev: Float32Array,
  depth: Float32Array,
  ocean: ReadonlySet<number>,
): { elevStd: number; bedStd: number; land: number } {
  let eSum = 0;
  let eSum2 = 0;
  let bSum = 0;
  let bSum2 = 0;
  let n = 0;
  for (let i = 0; i < elev.length; i++) {
    if (ocean.has(i)) continue;
    const e = elev[i]!;
    const b = e - depth[i]!;
    eSum += e;
    eSum2 += e * e;
    bSum += b;
    bSum2 += b * b;
    n++;
  }
  if (n === 0) return { elevStd: 0, bedStd: 0, land: 0 };
  const eMean = eSum / n;
  const bMean = bSum / n;
  return {
    elevStd: Math.sqrt(Math.max(0, eSum2 / n - eMean * eMean)),
    bedStd: Math.sqrt(Math.max(0, bSum2 / n - bMean * bMean)),
    land: n,
  };
}

describe("generateIsland starting surface", () => {
  it("same seed → identical elevation field (T-001)", () => {
    const a = generateIsland(32, 32, 10, 17);
    const b = generateIsland(32, 32, 10, 17);
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
    const c = generateIsland(32, 32, 10, 18);
    expect(Array.from(a.data)).not.toEqual(Array.from(c.data));
  });

  it("mid sea floods a shoreline and leaves workable land", () => {
    const terrain = generateIsland(48, 48, config.mountainPeak, 42);
    const world = new WorldState(terrain, {
      seaLevel: DEFAULT_SEA_LEVEL_METERS,
    });
    expect(world.oceanCellCount()).toBeGreaterThan(40);
    expect(world.shorelineCellCount()).toBeGreaterThan(20);
    const land = 48 * 48 - world.oceanCellCount();
    expect(land).toBeGreaterThan(200);
  });

  it("soil column absorbs most relief — bedrock is flatter than the surface", () => {
    const size = 48;
    const terrain = generateIsland(size, size, config.mountainPeak, 42);
    const world = new WorldState(terrain, {
      seaLevel: DEFAULT_SEA_LEVEL_METERS,
    });
    // Uniform default depth → bedrock mirrors the hills (the raised-bedrock defect).
    const before = landStats(
      world.terrain.data,
      world.soilDepth.data,
      world.oceanCells,
    );
    expect(before.bedStd).toBeGreaterThan(0.9 * before.elevStd);

    paintIslandSoilDepth(
      world.soilDepth.data,
      world.terrain.data,
      world.width,
      world.height,
      world.oceanCells,
    );
    const after = landStats(
      world.terrain.data,
      world.soilDepth.data,
      world.oceanCells,
    );
    expect(after.bedStd).toBeLessThan(after.elevStd * 0.75);
    expect(after.bedStd).toBeLessThan(before.bedStd);
  });

  it("coast is not a perfect radial circle (asymmetry)", () => {
    const size = 64;
    const sea = DEFAULT_SEA_LEVEL_METERS;
    const elev = generateIsland(size, size, 12, 11).data;
    const cx = (size - 1) * 0.5;
    const cz = (size - 1) * 0.5;
    const radii: number[] = [];
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      let lastLand = 0;
      for (let s = 0; s < size * 0.55; s++) {
        const x = Math.round(cx + Math.cos(ang) * s);
        const z = Math.round(cz + Math.sin(ang) * s);
        if (x < 0 || z < 0 || x >= size || z >= size) break;
        const e = elev[z * size + x]!;
        if (e > sea) lastLand = s;
      }
      radii.push(lastLand);
    }
    const mean = radii.reduce((s, r) => s + r, 0) / radii.length;
    let varSum = 0;
    for (const r of radii) varSum += (r - mean) ** 2;
    const std = Math.sqrt(varSum / radii.length);
    // Perfect circle → ~0 std; warped coast should move.
    expect(std).toBeGreaterThan(0.6);
  });
});
