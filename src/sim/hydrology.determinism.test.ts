import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { hashFloat32Buffer } from "./hash";
import { fluxStep, totalWaterVolume } from "./hydrology/fluxStep";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";

/** Golden depth hash for default rain schedule (T-001). Update when physics intentionally changes. */
const GOLDEN_DEPTH_HASH = "3010b0ef";

function makeWorld(
  terrain: Grid2D,
  options?: {
    flowRate?: number;
    maxOutflowFraction?: number;
    closedBoundary?: boolean;
  },
): WorldState {
  return new WorldState(terrain, options);
}

function runSchedule(seed: number): string {
  const terrain = generateMountain(
    config.gridSize,
    config.gridSize,
    config.mountainPeak,
    seed,
  );
  const world = makeWorld(terrain);
  for (let i = 0; i < config.determinismSteps; i++) {
    world.addRain(config.rainDepthPerEvent);
    world.stepEvent();
  }
  return hashFloat32Buffer(world.water.data);
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
    const world = makeWorld(generateMountain(48, 48, 12, 7));
    const model = world.hydrologyModel;

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
      world.addRain(config.rainDepthPerEvent * 0.4);
      world.stepEvent();
    }

    const basinDepth = model.getWaterDepth(basinX, basinZ);
    const peakDepth = model.getWaterDepth(24, 24);
    expect(basinDepth).toBeGreaterThan(0);
    expect(basinDepth).toBeGreaterThan(peakDepth);
  });

  it("runs headlessly without a renderer", () => {
    const world = makeWorld(generateMountain(32, 32, 8, 1));
    world.addRain(0.1);
    world.stepEvent();
    expect(world.water.data.length).toBe(32 * 32);
  });
});

describe("flux scaling (dt and flowRate matter)", () => {
  it("drains faster with higher flowRate on the same ramp", () => {
    const make = (flowRate: number): number => {
      const world = makeWorld(rampTerrain(8, 8, 1), {
        flowRate,
        maxOutflowFraction: 0.5,
      });
      world.water.set(1, 4, 1);
      world.stepEvent(1 / 60);
      return world.hydrologyModel.getWaterDepth(1, 4);
    };

    const slow = make(0.1);
    const fast = make(10);
    expect(fast).toBeLessThan(slow);
    expect(slow).toBeLessThan(1);
    expect(fast).toBeGreaterThan(0);
  });

  it("drains more in one large dt than one small dt", () => {
    const make = (dt: number): number => {
      const world = makeWorld(rampTerrain(8, 8, 1), {
        flowRate: 2.5,
        maxOutflowFraction: 0.5,
      });
      world.water.set(1, 4, 1);
      world.stepEvent(dt);
      return world.hydrologyModel.getWaterDepth(1, 4);
    };

    const fine = make(1 / 60);
    const coarse = make(1 / 6);
    expect(coarse).toBeLessThan(fine);
  });

  it("does not ring on a near-flat pond after a tiny perturbation", () => {
    const world = makeWorld(new Grid2D(5, 5, 1), {
      flowRate: 2.5,
      maxOutflowFraction: 0.5,
    });
    world.water.fill(1);
    world.water.set(2, 2, 1 + 1e-6);

    const depths: number[] = [];
    for (let i = 0; i < 8; i++) {
      world.stepEvent(1 / 60);
      depths.push(world.hydrologyModel.getWaterDepth(2, 2));
    }

    for (const d of depths) {
      expect(d).toBeGreaterThan(0.9);
      expect(d).toBeLessThan(1.1);
    }
  });

  it("refines toward similar state when dt is halved (S-009 guard)", () => {
    const run = (dt: number, steps: number): Float32Array => {
      const world = makeWorld(rampTerrain(16, 16, 0.5), {
        flowRate: 2.5,
        maxOutflowFraction: 0.5,
      });
      for (let i = 0; i < steps; i++) {
        world.addRain(0.02 * dt);
        world.stepEvent(dt);
      }
      return new Float32Array(world.water.data);
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
    const world = makeWorld(generateMountain(16, 16, 8, 3));
    const model = world.hydrologyModel;
    expect("getWaterDepthBuffer" in model).toBe(false);
    expect("getTerrainHeightBuffer" in model).toBe(false);
  });

  it("snapshotWaterDepth returns a copy", () => {
    const world = makeWorld(new Grid2D(4, 4, 1));
    world.water.set(1, 1, 0.5);
    const snap = world.hydrologyModel.snapshotWaterDepth();
    snap[5] = 99;
    expect(world.hydrologyModel.getWaterDepth(1, 1)).toBe(0.5);
  });
});

describe("Slice 2 hydrology infrastructure", () => {
  it("conserves water on a closed basin with no-flow edges", () => {
    const world = makeWorld(new Grid2D(8, 8, 1), { closedBoundary: true });
    world.water.fill(0.5);
    const initial = totalWaterVolume(world.water.data);

    for (let i = 0; i < 40; i++) {
      world.stepEvent(1 / 60);
    }

    expect(totalWaterVolume(world.water.data)).toBeCloseTo(initial, 5);
    expect(world.boundaryOutflowLedger).toBe(0);
  });

  it("drains mountain spill through perimeter outlets", () => {
    const world = makeWorld(generateMountain(24, 24, 6, 3));
    expect(world.outletCells.size).toBeGreaterThan(0);
    world.water.fill(0.3);
    for (let i = 0; i < 200; i++) world.stepEvent();
    expect(world.boundaryOutflowLedger).toBeGreaterThan(0);
    expect(totalWaterVolume(world.water.data)).toBeLessThan(0.3 * 24 * 24);
  });

  it("drains faster on a steep ramp than a shallow ramp", () => {
    const runTopCell = (slope: number): number => {
      const world = makeWorld(rampTerrain(12, 12, slope), {
        flowRate: 2.5,
        maxOutflowFraction: 0.5,
      });
      world.water.set(2, 6, 1);
      for (let i = 0; i < 30; i++) world.stepEvent(1 / 60);
      return world.hydrologyModel.getWaterDepth(2, 6);
    };

    const steepRemaining = runTopCell(2);
    const shallowRemaining = runTopCell(0.2);
    expect(steepRemaining).toBeLessThan(shallowRemaining);
  });

  it("does not drain flat ponds through map edges (regression)", () => {
    const terrain = new Grid2D(6, 6, 10);
    const water = new Float32Array(36);
    water.fill(1);
    const delta = new Float32Array(36);

    fluxStep(6, 6, terrain.data, water, delta, 1 / 60, 2.5, 0.5);

    expect(totalWaterVolume(water)).toBeCloseTo(36, 4);
  });
});
