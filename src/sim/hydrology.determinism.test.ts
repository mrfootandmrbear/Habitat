import { describe, expect, it } from "vitest";
import { config } from "../config";
import { hashFloat32Buffer } from "./hash";
import { HeightfieldHydrology } from "./hydrology/HeightfieldHydrology";
import { generateMountain } from "./terrain/generateMountain";

function runSchedule(seed: number): string {
  const terrain = generateMountain(
    config.gridSize,
    config.gridSize,
    config.mountainPeak,
    seed,
  );
  const model = new HeightfieldHydrology(terrain);
  for (let i = 0; i < config.determinismSteps; i++) {
    model.addRain(config.rainPerSecond * config.simDt);
    model.step(config.simDt);
  }
  return hashFloat32Buffer(model.getWaterDepthBuffer());
}

describe("heightfield hydrology (T-001)", () => {
  it("produces identical depth hashes for identical rain schedules", () => {
    const a = runSchedule(config.terrainSeed);
    const b = runSchedule(config.terrainSeed);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });

  it("moves water downhill into basins (readable pooling)", () => {
    const terrain = generateMountain(48, 48, 12, 7);
    const model = new HeightfieldHydrology(terrain);

    // Find a local basin cell (lower than most of its neighbors' terrain).
    let basinX = 0;
    let basinZ = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let z = 2; z < 46; z++) {
      for (let x = 2; x < 46; x++) {
        const h = model.getTerrainHeight(x, z);
        const neigh =
          model.getTerrainHeight(x + 1, z) +
          model.getTerrainHeight(x - 1, z) +
          model.getTerrainHeight(x, z + 1) +
          model.getTerrainHeight(x, z - 1);
        const score = h * 4 - neigh;
        if (score < bestScore) {
          bestScore = score;
          basinX = x;
          basinZ = z;
        }
      }
    }

    for (let i = 0; i < 180; i++) {
      model.addRain(0.03 * config.simDt);
      model.step(config.simDt);
    }

    const basinDepth = model.getWaterDepth(basinX, basinZ);
    const peakDepth = model.getWaterDepth(24, 24);
    expect(basinDepth).toBeGreaterThan(0);
    expect(basinDepth).toBeGreaterThan(peakDepth);
  });

  it("runs headlessly without a renderer", () => {
    const terrain = generateMountain(32, 32, 8, 1);
    const model = new HeightfieldHydrology(terrain);
    model.addRain(0.1);
    model.step(config.simDt);
    expect(model.getWaterDepthBuffer().length).toBe(32 * 32);
  });
});
