import { describe, expect, it } from "vitest";
import { config } from "../config";
import { hashFloat32Buffer } from "./hash";
import { generateMountain } from "./terrain/generateMountain";
import { SimClock, type SimClockOptions } from "./SimClock";
import { WorldState } from "./WorldState";
import { Grid2D } from "./Grid2D";
import {
  stepsPerWallSecond,
  sustainableRates,
  timeScaleFor,
} from "../ui/timeRates";

function runWithTimeScale(
  timeScale: number,
  targetSteps: number,
  maxStepsPerFrame: number,
): string {
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

  return hashFloat32Buffer(world.water.data);
}

describe("time-rate invariance (S-009)", () => {
  it("identical outcome hash at 1× and 4× time scale for the same sim steps", () => {
    const steps = config.determinismSteps;
    const at1x = runWithTimeScale(1, steps, config.maxStepsPerFrame);
    const at4x = runWithTimeScale(4, steps, config.maxStepsPerFrame);
    expect(at1x).toBe(at4x);
    expect(at1x).toMatch(/^[0-9a-f]{8}$/);
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

/**
 * Slice L1 — SIMULATION_MODEL §6.4. Surplus beyond the per-frame ceiling is
 * owed, not discarded; only debt past the spiral-of-death guard is abandoned.
 */
describe("time debt is deferred, not dropped (SIM §6.4)", () => {
  const makeClock = (over: Partial<SimClockOptions> = {}): SimClock =>
    new SimClock({
      simDt: config.simDt,
      maxStepsPerFrame: config.maxStepsPerFrame,
      maxDebtSteps: config.maxTimeDebtSteps,
      timeScale: 1,
      ...over,
    });

  it("delivers every demanded step at the fastest offered rate", () => {
    const fastest = sustainableRates().at(-1)!;
    const clock = makeClock({ timeScale: timeScaleFor(fastest) });
    const frames = 600;
    const wallDt = 1 / 60;

    let stepsRun = 0;
    for (let f = 0; f < frames; f++) stepsRun += clock.tick(wallDt).stepsRun;

    const demanded = (stepsPerWallSecond(fastest) * frames) / 60;
    // Within one frame of slack: the tail of the accumulator is still owed.
    expect(demanded - stepsRun).toBeLessThanOrEqual(
      config.maxStepsPerFrame + 1,
    );
    expect(demanded - stepsRun).toBeGreaterThanOrEqual(0);
    expect(clock.getDroppedSteps()).toBe(0);
  });

  it("pays back a stalled frame instead of discarding it", () => {
    const clock = makeClock({ timeScale: 16 });
    // One 50 ms frame (main.ts clamps wallDt there) demands 48 steps; the
    // ceiling runs 16 and the other 32 stay owed.
    const stalled = clock.tick(0.05);
    expect(stalled.stepsRun).toBe(config.maxStepsPerFrame);
    expect(stalled.timeDebt).toBe(32);
    expect(stalled.droppedSteps).toBe(0);

    // Idle wall time afterwards: the debt is worked off, not forgotten.
    let paid = 0;
    for (let f = 0; f < 10; f++) paid += clock.tick(0).stepsRun;
    expect(paid).toBe(32);
    expect(clock.getTimeDebt()).toBe(0);
    expect(clock.getDroppedSteps()).toBe(0);
  });

  it("total steps run equals steps demanded once the debt is paid", () => {
    const clock = makeClock({ timeScale: 16 });
    const wallDt = 1 / 60;
    const frames = 240;

    let stepsRun = 0;
    for (let f = 0; f < frames; f++) stepsRun += clock.tick(wallDt).stepsRun;
    // Drain whatever is still owed.
    for (let f = 0; f < 64; f++) stepsRun += clock.tick(0).stepsRun;

    expect(stepsRun).toBe(16 * frames);
    expect(clock.getDroppedSteps()).toBe(0);
  });

  it("abandons only debt past the guard, and says so", () => {
    // 64× is four times the per-frame ceiling — unpayable by construction.
    const clock = makeClock({ timeScale: 64 });
    for (let f = 0; f < 30; f++) clock.tick(1 / 60);

    expect(clock.getDroppedSteps()).toBeGreaterThan(0);
    expect(clock.getTimeDebt()).toBeLessThanOrEqual(config.maxTimeDebtSteps);
  });

  it("the guard still bounds worst-case frame cost", () => {
    const clock = makeClock({ timeScale: 1024 });
    for (let f = 0; f < 20; f++) {
      expect(clock.tick(0.05).stepsRun).toBeLessThanOrEqual(
        config.maxStepsPerFrame,
      );
    }
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
      "climate.airTemperature",
      "climate.cloudWater",
      "climate.precipPhase",
      "clock.daysSinceAnnual",
      "clock.daysSinceDecadal",
      "clock.daysSinceSeasonal",
      "clock.eventStepsSinceDaily",
      "clock.simMinutes",
      "depression.depth",
      "et.actual",
      "et.potential",
      "fire.burning",
      "fire.fuelLoad",
      "fire.intensity",
      "fire.scar",
      "groundwater.storage",
      "habitat.binderSuitability",
      "habitat.crustSuitability",
      "habitat.limitingFactor",
      "habitat.limitingGap",
      "habitat.marshSuitability",
      "habitat.shrubSuitability",
      "habitat.strandSuitability",
      "habitat.suitability",
      "ledger.boundaryOutflow",
      "ledger.et",
      "ledger.fuelConsumed",
      "ledger.infiltration",
      "ledger.oceanExchange",
      "ledger.openWaterEvaporation",
      "ledger.precipitation",
      "ledger.shoreErosion",
      "ledger.soilEvaporation",
      "ledger.transpiration",
      "light.insolation",
      "light.understory",
      "shore.exposure",
      "shore.intertidal",
      "shore.longshore",
      "soil.depth",
      "soil.infiltrationCapacity",
      "soil.material",
      "soil.moisture",
      "soil.salinity",
      "surface.roughness",
      "terrain.elevation",
      "veg.biomass.binder",
      "veg.biomass.crust",
      "veg.biomass.herb",
      "veg.biomass.marsh",
      "veg.biomass.shrub",
      "veg.biomass.strand",
      "veg.cover",
      "veg.establishment.binder",
      "veg.establishment.crust",
      "veg.establishment.herb",
      "veg.establishment.marsh",
      "veg.establishment.shrub",
      "veg.establishment.strand",
      "veg.infiltrationContribution",
      "veg.leafAreaIndex",
      "veg.seedBank.binder",
      "veg.seedBank.crust",
      "veg.seedBank.herb",
      "veg.seedBank.marsh",
      "veg.seedBank.shrub",
      "veg.seedBank.strand",
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
