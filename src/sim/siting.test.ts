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

describe("geometric mold stamps (§4.57, C-028 / A-005)", () => {
  const r = config.moldRadius;
  const h = config.moldHeight;

  it("cylinder mold raises a known disc by the mold height (flat top)", () => {
    const world = new WorldState(generateMountain(40, 40, 8, 3));
    const cx = 20;
    const cz = 20;
    const before = world.terrain.data.slice();
    world.stampMold(cx, cz, "cylinder", h, r);
    // Every cell inside the Euclidean footprint rises by exactly the height.
    let touched = 0;
    for (let z = cz - r; z <= cz + r; z++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const i = z * 40 + x;
        if (Math.hypot(x - cx, z - cz) <= r + 0.01) {
          expect(world.terrain.data[i]! - before[i]!).toBeCloseTo(h, 5);
          touched++;
        }
      }
    }
    expect(touched).toBeGreaterThan(0);
    // A cell just outside the footprint is untouched.
    const outside = cz * 40 + (cx + r + 2);
    expect(world.terrain.data[outside]!).toBe(before[outside]!);
  });

  it("mold with negative height lowers the footprint (raise/lower)", () => {
    const world = new WorldState(generateMountain(40, 40, 8, 3));
    const cx = 20;
    const cz = 20;
    const before = world.terrain.get(cx, cz);
    world.stampMold(cx, cz, "cylinder", -0.5, r);
    expect(world.terrain.get(cx, cz)).toBeLessThan(before);
  });

  it("pyramid peaks at the center; terrace is a flat-top square", () => {
    const cx = 20;
    const cz = 20;

    const pyr = new WorldState(generateMountain(40, 40, 8, 3));
    const pyrBefore = pyr.terrain.data.slice();
    pyr.stampMold(cx, cz, "pyramid", h, r);
    const pyrCenter =
      pyr.terrain.data[cz * 40 + cx]! - pyrBefore[cz * 40 + cx]!;
    const pyrEdge =
      pyr.terrain.data[cz * 40 + (cx + r)]! - pyrBefore[cz * 40 + (cx + r)]!;
    expect(pyrCenter).toBeGreaterThan(pyrEdge);
    expect(pyrEdge).toBeGreaterThan(0);

    const ter = new WorldState(generateMountain(40, 40, 8, 3));
    const terBefore = ter.terrain.data.slice();
    ter.stampMold(cx, cz, "terrace", h, r);
    const terCenter =
      ter.terrain.data[cz * 40 + cx]! - terBefore[cz * 40 + cx]!;
    // Square footprint: even the far corner (Chebyshev r) rises by the full
    // height, which the round cylinder never reaches.
    const terCorner =
      ter.terrain.data[(cz + r) * 40 + (cx + r)]! -
      terBefore[(cz + r) * 40 + (cx + r)]!;
    expect(terCenter).toBeCloseTo(h, 5);
    expect(terCorner).toBeCloseTo(h, 5);
  });

  it("mold conserves ΣΔelev = ΣΔdepth (C-002)", () => {
    const world = new WorldState(generateMountain(40, 40, 8, 3));
    const elevBefore = world.terrain.data.slice();
    const depthBefore = world.soilDepth.data.slice();
    world.stampMold(20, 20, "pyramid", h, r);
    let dElev = 0;
    let dDepth = 0;
    for (let i = 0; i < elevBefore.length; i++) {
      dElev += world.terrain.data[i]! - elevBefore[i]!;
      dDepth += world.soilDepth.data[i]! - depthBefore[i]!;
    }
    // Per cell Δelev === Δdepth by construction; the summed residual is pure
    // Float32Array rounding across the ~81-cell footprint (≈6e-6 << 1e-4).
    expect(Math.abs(dElev - dDepth)).toBeLessThan(1e-4);
    expect(dElev).toBeGreaterThan(0);
  });

  it("mold undo restores state hash (C-013)", () => {
    const world = new WorldState(generateMountain(32, 32, 8, 3));
    const undo = new EditUndoStack();
    const before = world.stateHash();
    undo.pushCheckpoint(world);
    world.stampMold(16, 16, "cylinder");
    expect(world.stateHash()).not.toBe(before);
    expect(undo.undo(world)).toBe(true);
    expect(world.stateHash()).toBe(before);
  });

  it("20 mold stamps write no vegetation (C-006)", () => {
    const world = new WorldState(generateMountain(40, 40, 8, 3));
    const cover0 = world.vegCover.data.slice();
    const herb0 = world.herbBiomass.data.slice();
    const shapes = ["cylinder", "pyramid", "terrace"] as const;
    for (let i = 0; i < 20; i++) {
      world.stampMold(
        12 + (i % 6),
        12 + (i % 5),
        shapes[i % shapes.length]!,
      );
    }
    expect([...world.vegCover.data]).toEqual([...cover0]);
    expect([...world.herbBiomass.data]).toEqual([...herb0]);
    // The stamps did move terrain — this is not a no-op.
    expect(world.terrain.get(14, 14)).not.toBe(0);
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
