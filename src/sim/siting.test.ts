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

  it("berm/dig move soil.depth with elevation (THESIS §2.1 / C-002)", () => {
    const world = new WorldState(generateMountain(24, 24, 6, 2));
    const x = 12;
    const z = 12;
    const elev0 = world.terrain.get(x, z);
    const depth0 = world.soilDepth.get(x, z);
    const bed0 = elev0 - depth0;

    world.raiseBerm(x, z, 1.0);
    const elev1 = world.terrain.get(x, z);
    const depth1 = world.soilDepth.get(x, z);
    expect(elev1 - elev0).toBeCloseTo(depth1 - depth0, 5);
    expect(elev1 - depth1).toBeCloseTo(bed0, 5);

    world.digChannel(x, z, 0.5);
    const elev2 = world.terrain.get(x, z);
    const depth2 = world.soilDepth.get(x, z);
    expect(elev2 - elev1).toBeCloseTo(depth2 - depth1, 5);
    expect(elev2 - depth2).toBeCloseTo(bed0, 5);
  });

  it("brush conserves ΣΔelev = ΣΔdepth across the footprint", () => {
    const world = new WorldState(generateMountain(20, 20, 5, 4));
    const elevBefore = world.terrain.data.slice();
    const depthBefore = world.soilDepth.data.slice();
    world.raiseBerm(10, 10, 0.8);
    let dElev = 0;
    let dDepth = 0;
    for (let i = 0; i < elevBefore.length; i++) {
      dElev += world.terrain.data[i]! - elevBefore[i]!;
      dDepth += world.soilDepth.data[i]! - depthBefore[i]!;
    }
    expect(dElev).toBeCloseTo(dDepth, 5);
    expect(dElev).toBeGreaterThan(0);
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
