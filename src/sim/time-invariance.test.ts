import { describe, expect, it } from "vitest";
import { config } from "../config";
import { hashFloat32Buffer } from "./hash";
import { HeightfieldHydrology } from "./hydrology/HeightfieldHydrology";
import { SimClock } from "./SimClock";
import { generateMountain } from "./terrain/generateMountain";

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
  const model = new HeightfieldHydrology(terrain);
  const clock = new SimClock({
    simDt: config.simDt,
    maxStepsPerFrame,
    timeScale,
  });

  let steps = 0;
  while (steps < targetSteps) {
    const { stepsRun } = clock.tick(config.simDt);
    for (let i = 0; i < stepsRun; i++) {
      model.addRain(config.rainPerSecond * config.simDt);
      model.step(config.simDt);
      steps += 1;
      if (steps >= targetSteps) break;
    }
  }

  return {
    hash: hashFloat32Buffer(model.snapshotWaterDepth()),
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

  it("records dropped steps when maxStepsPerFrame is exceeded", () => {
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
  it("hydrology references terrain without cloning when ownTerrain is false", () => {
    const terrain = generateMountain(8, 8, 4, 1);
    const before = terrain.get(2, 2);
    const model = new HeightfieldHydrology(terrain, { ownTerrain: false });
    terrain.set(2, 2, before + 5);
    expect(model.getTerrainHeight(2, 2)).toBe(terrain.get(2, 2));
  });
});
