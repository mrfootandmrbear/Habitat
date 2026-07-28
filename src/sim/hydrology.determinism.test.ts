import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { hashFloat32Buffer } from "./hash";
import { HeightfieldHydrology } from "./hydrology/HeightfieldHydrology";
import { generateMountain } from "./terrain/generateMountain";

/** Golden depth hash for default rain schedule (T-001). Update when physics intentionally changes. */
const GOLDEN_DEPTH_HASH = "93d6ed95";

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
  return hashFloat32Buffer(model.snapshotWaterDepth());
}

function rampTerrain(width: number, height: number, slope: number): Grid2D {
  const terrain = new Grid2D(width, height);
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      terrain.set(x, z, x * slope);
    }
  }
  return terrain;
}

describe("heightfield hydrology (T-001)", () => {
  it("produces identical depth hashes for identical rain schedules", () => {
    const a = runSchedule(config.terrainSeed);
    const b = runSchedule(config.terrainSeed);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}$/);
  });

  it("matches committed golden depth hash (T-001)", () => {
    const hash = runSchedule(config.terrainSeed);
    expect(hash).toBe(GOLDEN_DEPTH_HASH);
  });

  it("moves water downhill into basins (readable pooling)", () => {
    const terrain = generateMountain(48, 48, 12, 7);
    const model = new HeightfieldHydrology(terrain);

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
    expect(model.snapshotWaterDepth().length).toBe(32 * 32);
  });
});

describe("flux scaling (dt and flowRate matter)", () => {
  it("drains faster with higher flowRate on the same ramp", () => {
    const make = (flowRate: number): number => {
      const model = new HeightfieldHydrology(rampTerrain(8, 8, 1), {
        flowRate,
        maxOutflowFraction: 0.5,
      });
      model.setWaterDepth(1, 4, 1);
      model.step(1 / 60);
      return model.getWaterDepth(1, 4);
    };

    const slow = make(0.1);
    const fast = make(10);
    expect(fast).toBeLessThan(slow);
    expect(slow).toBeLessThan(1);
    expect(fast).toBeGreaterThan(0);
  });

  it("drains more in one large dt than one small dt", () => {
    const make = (dt: number): number => {
      const model = new HeightfieldHydrology(rampTerrain(8, 8, 1), {
        flowRate: 2.5,
        maxOutflowFraction: 0.5,
      });
      model.setWaterDepth(1, 4, 1);
      model.step(dt);
      return model.getWaterDepth(1, 4);
    };

    const fine = make(1 / 60);
    const coarse = make(1 / 6);
    expect(coarse).toBeLessThan(fine);
  });

  it("does not ring on a near-flat pond after a tiny perturbation", () => {
    const terrain = new Grid2D(5, 5, 1);
    const model = new HeightfieldHydrology(terrain, {
      flowRate: 2.5,
      maxOutflowFraction: 0.5,
    });
    model.fillWater(1);
    model.setWaterDepth(2, 2, 1 + 1e-6);

    const depths: number[] = [];
    for (let i = 0; i < 8; i++) {
      model.step(1 / 60);
      depths.push(model.getWaterDepth(2, 2));
    }

    for (const d of depths) {
      expect(d).toBeGreaterThan(0.9);
      expect(d).toBeLessThan(1.1);
    }
  });

  it("refines toward similar state when dt is halved (S-009 guard)", () => {
    const run = (dt: number, steps: number): Float32Array => {
      const model = new HeightfieldHydrology(rampTerrain(16, 16, 0.5), {
        flowRate: 2.5,
        maxOutflowFraction: 0.5,
      });
      for (let i = 0; i < steps; i++) {
        model.addRain(0.02 * dt);
        model.step(dt);
      }
      return model.snapshotWaterDepth();
    };

    const coarse = run(1 / 30, 60);
    const fine = run(1 / 60, 120);

    let l1 = 0;
    for (let i = 0; i < coarse.length; i++) {
      l1 += Math.abs(coarse[i]! - fine[i]!);
    }
    const meanAbs = l1 / coarse.length;

    expect(meanAbs).toBeLessThan(0.05);

    let fineSum = 0;
    for (let i = 0; i < fine.length; i++) fineSum += fine[i]!;
    expect(fineSum).toBeGreaterThan(0);
  });
});

describe("T-006 readonly sim view", () => {
  it("WaterStateView has no mutable buffer accessors", () => {
    const terrain = generateMountain(16, 16, 8, 3);
    const model = new HeightfieldHydrology(terrain);
    expect("getWaterDepthBuffer" in model).toBe(false);
    expect("getTerrainHeightBuffer" in model).toBe(false);
  });

  it("snapshotWaterDepth returns a copy", () => {
    const model = new HeightfieldHydrology(new Grid2D(4, 4, 1));
    model.setWaterDepth(1, 1, 0.5);
    const snap = model.snapshotWaterDepth();
    snap[5] = 99;
    expect(model.getWaterDepth(1, 1)).toBe(0.5);
  });
});
