import { describe, expect, it } from "vitest";
import { config } from "../config";
import { hashFloat32Buffer } from "./hash";
import { generateMountain } from "./terrain/generateMountain";
import { SimClock } from "./SimClock";
import { WorldState } from "./WorldState";
import { Grid2D } from "./Grid2D";

function runWithTimeScale(
  timeScale: number,
  targetSteps: number,
  maxStepsPerFrame: number,
): { hash: string; dropped: number } {
  const terrain = generateMountain(
    config.gridSize,
    config.gridSize,
    config.mountainPeak,
    config.terrainSeed,
  );
  const world = new WorldState(terrain);
  const clock = new SimClock({
    simDt: config.simDt,
    maxStepsPerFrame,
    timeScale,
  });

  let steps = 0;
  while (steps < targetSteps) {
    const { stepsRun } = clock.tick(config.simDt);
    for (let i = 0; i < stepsRun; i++) {
      world.addRain(config.rainDepthPerEvent);
      world.stepEvent();
      steps += 1;
      if (steps >= targetSteps) break;
    }
  }

  return {
    hash: hashFloat32Buffer(world.water.data),
    dropped: clock.getDroppedSteps(),
  };
}

describe("time-rate invariance (S-009)", () => {
  it("identical outcome hash at 1× and 4× time scale for the same sim steps", () => {
    const steps = config.determinismSteps;
    const at1x = runWithTimeScale(1, steps, config.maxStepsPerFrame);
    const at4x = runWithTimeScale(4, steps, config.maxStepsPerFrame);
    expect(at1x.hash).toBe(at4x.hash);
    expect(at1x.hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("records timeDebt when maxStepsPerFrame is exceeded", () => {
    const result = runWithTimeScale(64, 30, 1);
    expect(result.dropped).toBeGreaterThan(0);
  });

  it("pause (timeScale 0) runs zero sim steps per tick", () => {
    const clock = new SimClock({
      simDt: config.simDt,
      maxStepsPerFrame: config.maxStepsPerFrame,
      timeScale: 0,
    });
    const { stepsRun } = clock.tick(1);
    expect(stepsRun).toBe(0);
  });
});

describe("WorldState terrain ownership", () => {
  it("hydrology reads terrain owned by WorldState without cloning", () => {
    const terrain = generateMountain(8, 8, 4, 1);
    const world = new WorldState(terrain);
    const before = terrain.get(2, 2);
    terrain.set(2, 2, before + 5);
    expect(world.hydrologyModel.getTerrainHeight(2, 2)).toBe(terrain.get(2, 2));
  });
});

describe("field registry (SIMULATION_MODEL §3)", () => {
  it("registers Slice 2 fields and hashes deterministically", () => {
    const world = new WorldState(generateMountain(16, 16, 8, 2));
    const ids = world.registry.list().map((f) => f.id);
    expect(ids).toEqual([
      "clock.eventStepsSinceDaily",
      "clock.simMinutes",
      "depression.depth",
      "ledger.boundaryOutflow",
      "ledger.et",
      "ledger.infiltration",
      "ledger.precipitation",
      "soil.depth",
      "soil.infiltrationCapacity",
      "soil.moisture",
      "surface.roughness",
      "terrain.elevation",
      "veg.cover",
      "veg.infiltrationContribution",
      "water.surfaceDepth",
    ]);

    world.addRain(0.01);
    const h1 = world.stateHash();
    const h2 = world.stateHash();
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{8}$/);
  });

  it("updates precipitation ledger when rain is added", () => {
    const world = new WorldState(new Grid2D(4, 4, 1));
    world.addRain(0.05);
    expect(world.precipitationLedger).toBeCloseTo(0.05 * 16, 6);
  });
});
