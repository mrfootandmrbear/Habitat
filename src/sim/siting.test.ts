import { describe, expect, it } from "vitest";
import { config } from "../config";
import { totalWaterVolume } from "./hydrology/fluxStep";
import { EditUndoStack } from "./sessionPersist";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";
import { worldToGrid } from "../ui/siting";

function footprintVariance(
  world: WorldState,
  cx: number,
  cz: number,
  radius: number,
): number {
  const elevs: number[] = [];
  for (let z = cz - radius; z <= cz + radius; z++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (!world.terrain.inBounds(x, z)) continue;
      if (Math.hypot(x - cx, z - cz) > radius + 0.01) continue;
      elevs.push(world.terrain.get(x, z));
    }
  }
  if (elevs.length === 0) return 0;
  const mean = elevs.reduce((a, b) => a + b, 0) / elevs.length;
  let sumSq = 0;
  for (const e of elevs) sumSq += (e - mean) * (e - mean);
  return sumSq / elevs.length;
}

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
    const world = new WorldState(generateMountain(16, 16, 4, 1), {
      closedBoundary: true,
    });
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

  it("shovel footprint moves more cells than bucket (C-028 / §4.55)", () => {
    const bucketR = config.sitingBrushRadii.bucket;
    const shovelR = config.sitingBrushRadii.shovel;
    expect(shovelR).toBeGreaterThan(bucketR);
    expect(bucketR).toBe(config.sitingBrushRadius);

    const countTouched = (radius: number): number => {
      const world = new WorldState(generateMountain(32, 32, 8, 3));
      const before = world.terrain.data.slice();
      world.raiseBerm(16, 16, 0.5, radius);
      let n = 0;
      for (let i = 0; i < before.length; i++) {
        if (world.terrain.data[i]! !== before[i]!) n++;
      }
      return n;
    };
    expect(countTouched(shovelR)).toBeGreaterThan(countTouched(bucketR));
  });

  it("shovel still conserves ΣΔelev = ΣΔdepth (C-002)", () => {
    const world = new WorldState(generateMountain(32, 32, 8, 3));
    const elevBefore = world.terrain.data.slice();
    const depthBefore = world.soilDepth.data.slice();
    world.raiseBerm(16, 16, 0.8, config.sitingBrushRadii.shovel);
    let dElev = 0;
    let dDepth = 0;
    for (let i = 0; i < elevBefore.length; i++) {
      dElev += world.terrain.data[i]! - elevBefore[i]!;
      dDepth += world.soilDepth.data[i]! - depthBefore[i]!;
    }
    expect(dElev).toBeCloseTo(dDepth, 5);
    expect(dElev).toBeGreaterThan(0);
  });

  it("flatten lowers local elev variance (C-028 / §4.56 trowel)", () => {
    const world = new WorldState(generateMountain(32, 32, 8, 3));
    const cx = 16;
    const cz = 16;
    const r = config.sitingBrushRadii.bucket;
    // Seed a peaked berm so the footprint has measurable relief.
    world.raiseBerm(cx, cz, 2.0, r);
    const before = footprintVariance(world, cx, cz, r);
    expect(before).toBeGreaterThan(0.01);
    world.flattenTerrain(cx, cz, r);
    const after = footprintVariance(world, cx, cz, r);
    expect(after).toBeLessThan(before * 0.5);
  });

  it("flatten conserves ΣΔelev = ΣΔdepth (C-002)", () => {
    const world = new WorldState(generateMountain(32, 32, 8, 3));
    world.raiseBerm(16, 16, 1.5, config.sitingBrushRadii.bucket);
    const elevBefore = world.terrain.data.slice();
    const depthBefore = world.soilDepth.data.slice();
    world.flattenTerrain(16, 16, config.sitingBrushRadii.bucket);
    let dElev = 0;
    let dDepth = 0;
    for (let i = 0; i < elevBefore.length; i++) {
      dElev += world.terrain.data[i]! - elevBefore[i]!;
      dDepth += world.soilDepth.data[i]! - depthBefore[i]!;
    }
    expect(dElev).toBeCloseTo(dDepth, 5);
  });

  it("flatten undo restores state hash (C-013)", () => {
    const world = new WorldState(generateMountain(24, 24, 6, 2));
    world.raiseBerm(12, 12, 1.2);
    const undo = new EditUndoStack();
    const before = world.stateHash();
    undo.pushCheckpoint(world);
    world.flattenTerrain(12, 12);
    expect(world.stateHash()).not.toBe(before);
    expect(undo.undo(world)).toBe(true);
    expect(world.stateHash()).toBe(before);
  });

  it("flatten does not write vegetation (C-006)", () => {
    const world = new WorldState(generateMountain(24, 24, 6, 2));
    world.raiseBerm(12, 12, 1.5);
    const cover0 = world.vegCover.data.slice();
    const herb0 = world.herbBiomass.data.slice();
    world.flattenTerrain(12, 12);
    expect([...world.vegCover.data]).toEqual([...cover0]);
    expect([...world.herbBiomass.data]).toEqual([...herb0]);
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
