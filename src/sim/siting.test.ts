import { describe, expect, it } from "vitest";
import { totalWaterVolume } from "./hydrology/fluxStep";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";
import { worldToGrid } from "../ui/siting";

describe("terrain siting (Slice 5b, A-005)", () => {
  it("raiseBerm increases terrain elevation owned by WorldState", () => {
    const world = new WorldState(generateMountain(32, 32, 8, 3));
    const before = world.terrain.get(16, 16);
    world.raiseBerm(16, 16);
    expect(world.terrain.get(16, 16)).toBeGreaterThan(before);
    expect(world.hydrologyModel.getTerrainHeight(16, 16)).toBe(
      world.terrain.get(16, 16),
    );
  });

  it("digChannel lowers terrain without cloning", () => {
    const world = new WorldState(generateMountain(32, 32, 8, 3));
    const before = world.terrain.get(12, 12);
    world.digChannel(12, 12);
    expect(world.terrain.get(12, 12)).toBeLessThan(before);
  });

  it("recomputes flow structure after a berm", () => {
    const world = new WorldState(generateMountain(24, 24, 6, 5));
    const before = world.flowAccumulation!.slice();
    world.raiseBerm(8, 8, 2);
    world.ensureStructureFresh();
    const after = world.flowAccumulation!;
    let changed = false;
    for (let i = 0; i < before.length; i++) {
      if (before[i] !== after[i]) {
        changed = true;
        break;
      }
    }
    expect(changed).toBe(true);
  });

  it("preserves water volume after dig on a closed wet basin", () => {
    const world = new WorldState(generateMountain(16, 16, 4, 1));
    world.water.fill(0.2);
    const initial = totalWaterVolume(world.water.data);
    world.digChannel(8, 8);
    for (let i = 0; i < 20; i++) world.stepEvent();
    expect(totalWaterVolume(world.water.data)).toBeLessThanOrEqual(
      initial + 1e-3,
    );
  });
});

describe("worldToGrid (siting pick)", () => {
  it("maps center of world to mid grid", () => {
    const cell = worldToGrid(0, 0, 96, 96, 48);
    expect(cell).not.toBeNull();
    expect(cell!.x).toBe(48);
    expect(cell!.z).toBe(48);
  });
});
