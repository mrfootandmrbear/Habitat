import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { generateIsland, DEFAULT_SEA_LEVEL_METERS } from "./terrain/generateIsland";
import { generateMountain } from "./terrain/generateMountain";
import { totalWaterVolume } from "./hydrology/fluxStep";

describe("Slice 16 island / sea level (C-015)", () => {
  it("absent seaLevel preserves perimeter-outlet mountain behavior", () => {
    const world = new WorldState(generateMountain(24, 24, 6, 3));
    expect(world.seaLevel).toBeUndefined();
    expect(world.oceanCellCount()).toBe(0);
    expect(world.outletCells.size).toBeGreaterThan(0);
  });

  it("seaLevel creates ocean cells and clears perimeter outlets", () => {
    const terrain = generateIsland(32, 32, 10, 5);
    const world = new WorldState(terrain, { seaLevel: DEFAULT_SEA_LEVEL_METERS });
    expect(world.seaLevel).toBe(DEFAULT_SEA_LEVEL_METERS);
    expect(world.oceanCellCount()).toBeGreaterThan(10);
    expect(world.outletCells.size).toBe(0);
    expect(world.shorelineCellCount()).toBeGreaterThan(0);
  });

  it("conserves mass with ocean exchange under rain (H-004)", () => {
    const world = new WorldState(generateIsland(24, 24, 8, 9), {
      seaLevel: DEFAULT_SEA_LEVEL_METERS,
    });
    for (let d = 0; d < 3; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.addRain(config.rainDepthPerEvent * 2);
        world.stepEvent();
      }
    }
    const rel =
      Math.abs(world.waterBalanceResidual()) /
      Math.max(1, world.precipitationLedger);
    expect(rel).toBeLessThan(1e-4);
    expect(world.oceanExchangeLedger).toBeGreaterThan(0);
  });

  it("raising sea level grows ocean fraction (force dial, no cell args)", () => {
    const terrain = generateIsland(32, 32, 10, 11);
    const low = new WorldState(terrain.clone(), { seaLevel: 1.2 });
    const high = new WorldState(terrain.clone(), { seaLevel: 3.5 });
    expect(high.oceanCellCount()).toBeGreaterThan(low.oceanCellCount());
  });

  it("same seed + sea level → identical hash (T-001)", () => {
    const run = () => {
      const w = new WorldState(generateIsland(20, 20, 8, 17), {
        seaLevel: DEFAULT_SEA_LEVEL_METERS,
      });
      for (let i = 0; i < 40; i++) {
        w.addRain(config.rainDepthPerEvent);
        w.stepEvent();
      }
      return w.stateHash();
    };
    expect(run()).toBe(run());
  });

  it("setSeaLevel is global — API has no cell arguments", () => {
    const world = new WorldState(generateIsland(16, 16, 7, 2), {
      seaLevel: 1.5,
    });
    const before = world.oceanCellCount();
    world.setSeaLevel(3);
    expect(world.oceanCellCount()).toBeGreaterThan(before);
    world.setSeaLevel(undefined);
    expect(world.seaLevel).toBeUndefined();
    expect(world.oceanCellCount()).toBe(0);
  });

  it("closed land fixture without sea still conserves (legacy)", () => {
    const world = new WorldState(new Grid2D(8, 8, 1), { closedBoundary: true });
    world.water.fill(0.4);
    const initial = totalWaterVolume(world.water.data);
    for (let i = 0; i < 30; i++) world.runSurfaceWaterStep(config.eventFluxDt);
    expect(Math.abs(totalWaterVolume(world.water.data) - initial)).toBeLessThan(
      1e-9,
    );
    expect(world.oceanExchangeLedger).toBe(0);
  });
});
