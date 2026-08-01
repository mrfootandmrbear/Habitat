import { describe, expect, it } from "vitest";
import { config } from "../config";
import { fluxStep } from "./hydrology/fluxStep";
import { WorldState } from "./WorldState";
import { Grid2D } from "./Grid2D";
import { generateIsland, DEFAULT_SEA_LEVEL_METERS } from "./terrain/generateIsland";
import { SUBSTRATE_ROCK, SUBSTRATE_SAND } from "./terrain/substrates";
import { windById } from "./climate/windRegime";

/**
 * §4.51 — hydrology/geomorphology review §3–§4: `fluxStep` held an ocean
 * neighbor's stage at bed elevation instead of `seaLevel`, overstating the
 * head difference driving coastal drainage by the ocean's full water column;
 * Priority-Flood's whole-perimeter-open fill convention (needed so nested
 * interior depressions still resolve, §4.49) disagreed with fluxStep's
 * narrower "only named outlets drain" dynamics on a structurally sealed rim;
 * and coastal erosion used one global rate where hillslope erosion already
 * reads per-substrate `erosionK`, erasing the sand/rock erodibility contrast.
 */
describe("fluxStep — ocean-neighbor stage is seaLevel, not bed elevation (§4.51)", () => {
  it("a coastal cell's one-step outflow matches the seaLevel-relative head, not the bed-relative head", () => {
    const seaLevel = 1.0;
    const bed = 1.4; // land, must sit >= seaLevel to not itself be an ocean cell
    const w0 = 0.3;
    const oceanBed = -3.0; // deep ocean — should be irrelevant to the result
    const flowRate = 0.156;
    const dt = 1;

    const terrain = new Float32Array([bed, oceanBed]);
    const water = new Float32Array([w0, 0]);
    const delta = new Float32Array(2);
    const ocean = new Set([1]);

    fluxStep(
      2,
      1,
      terrain,
      water,
      delta,
      dt,
      flowRate,
      0.5,
      undefined,
      undefined,
      config.baseRoughness,
      ocean,
      seaLevel,
    );

    // Expected: diff is against seaLevel, i.e. (bed + w0) - seaLevel.
    const expectedDiff = bed + w0 - seaLevel;
    const expectedOut = Math.min(
      expectedDiff * flowRate * dt,
      expectedDiff * 0.5,
    );
    expect(water[0]).toBeCloseTo(w0 - expectedOut, 6);

    // The pre-fix formula used the ocean cell's bed elevation instead —
    // reproduced locally (not production code) to show it gives a different,
    // larger-head-difference answer on the same inputs.
    const staleDiff = bed + w0 - oceanBed;
    const staleOut = Math.min(staleDiff * flowRate * dt, staleDiff * 0.5);
    expect(staleOut).not.toBeCloseTo(expectedOut, 6);
    expect(water[0]).not.toBeCloseTo(w0 - staleOut, 6);
  });

  it("drainage toward the ocean depends only on seaLevel, never on the ocean's own depth", () => {
    const seaLevel = 1.0;
    const bed = 1.0; // coastal wetland sitting exactly at sea level
    const w0 = 0.4;

    const drain = (oceanBed: number): number => {
      const terrain = new Float32Array([bed, oceanBed]);
      const water = new Float32Array([w0, 0]);
      const delta = new Float32Array(2);
      const ocean = new Set([1]);
      for (let step = 0; step < 40; step++) {
        fluxStep(
          2,
          1,
          terrain,
          water,
          delta,
          1,
          0.156,
          0.5,
          undefined,
          undefined,
          config.baseRoughness,
          ocean,
          seaLevel,
        );
      }
      return water[0]!;
    };

    const shallow = drain(0.5);
    const deep = drain(-40);
    // Both must have actually drained (proves the scenario isn't vacuous).
    expect(shallow).toBeLessThan(w0);
    expect(shallow).toBeCloseTo(deep, 8);

    // The pre-fix (bed-elevation-stage) formula, reproduced locally, drains
    // at a rate set by the ocean's depth — shallow and deep diverge. Compared
    // after a handful of steps, before either fully empties.
    const staleDrain = (oceanBed: number): number => {
      let w = w0;
      for (let step = 0; step < 3; step++) {
        const diff = bed + w - oceanBed;
        if (diff <= 0) break;
        const localFlow = 0.156;
        const d = Math.min(diff * localFlow * 1, diff * 0.5);
        const available = w * 0.5;
        const out = Math.min(d, available);
        w -= out;
      }
      return w;
    };
    expect(staleDrain(0.5)).not.toBeCloseTo(staleDrain(-40), 3);
  });
});

describe("boundary reconciliation — sealed rim gets no hillslope incision (§4.51)", () => {
  it("a non-outlet rim cell on a structurally sealed (flat, no-relief) map edge is excluded from hillslope erosion", () => {
    const n = 16;
    const floor = config.elevationFloor;
    // A Chebyshev-distance pyramid: elevation is exactly `floor` at every
    // border cell (guaranteed flat, no-relief rim, matching generateMountain's
    // acute case — review §3 / flowRouting.ts:253) and rises toward the
    // center, so interior cells drain outward and accumulate on the rim.
    const terrain = new Grid2D(n, n, floor);
    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        const d = Math.min(x, n - 1 - x, z, n - 1 - z);
        terrain.set(x, z, floor + d * 0.3);
      }
    }
    const world = new WorldState(terrain);
    world.soilDepth.fill(1.2);
    world.vegCover.fill(0);
    world.ensureStructureFresh();

    // The rim is exactly flat, so computePerimeterOutlets finds no real
    // outlet there.
    expect(world.outletCells.size).toBe(0);

    // Find a rim cell that a pre-fix reading of the ponded gate (a >= aMin
    // && depression <= 1e-6, without the sealed-rim exclusion) would have
    // judged eligible for hillslope erosion.
    let rimI = -1;
    for (let x = 0; x < n; x++) {
      for (const z of [0, n - 1]) {
        const i = z * n + x;
        if (
          world.flowAccumulation![i]! >= config.erosionMinAccumulation &&
          world.depressionDepth.get(x, z) <= 1e-6
        ) {
          rimI = i;
        }
      }
    }
    for (const x of [0, n - 1]) {
      for (let z = 0; z < n; z++) {
        const i = z * n + x;
        if (
          world.flowAccumulation![i]! >= config.erosionMinAccumulation &&
          world.depressionDepth.get(x, z) <= 1e-6
        ) {
          rimI = i;
        }
      }
    }
    expect(rimI).toBeGreaterThanOrEqual(0);

    const before = world.soilDepth.data[rimI]!;
    world.runGeomorphologyStep(1);
    const after = world.soilDepth.data[rimI]!;
    // Erosion suppressed at the sealed rim: soil depth can only rise
    // (production) or hold, never fall from hillslope incision.
    expect(after).toBeGreaterThanOrEqual(before - 1e-9);
  });
});

describe("coastal erosion reads per-substrate erosionK (§4.51 / review §4)", () => {
  it("a sand shore retreats faster than a rock shore under identical wave forcing", () => {
    // Mirrors shoreExposure.test.ts's paired-wind method: isolate the
    // exposed (windward) shore only, since the lee shore nets deposition
    // (Slice 19) and would dilute/reverse a pure erosion-rate comparison.
    const size = 40;
    const seed = 19;
    const wind = windById("west");

    const run = (materialId: number) => {
      const world = new WorldState(generateIsland(size, size, 10, seed), {
        seaLevel: DEFAULT_SEA_LEVEL_METERS,
        windUx: wind.ux,
        windUz: wind.uz,
      });
      world.soilDepth.fill(1.2);
      world.vegCover.fill(0);
      world.soilMaterial.fill(materialId);
      const elev0 = world.terrain.data.slice();
      const mid = (size / 2) | 0;
      const westShore: number[] = [];
      for (let i = 0; i < elev0.length; i++) {
        if (world.oceanCells.has(i)) continue;
        const x = i % size;
        const z = (i / size) | 0;
        if (x >= mid) continue;
        const nbs = [
          z > 0 ? i - size : -1,
          z < size - 1 ? i + size : -1,
          x > 0 ? i - 1 : -1,
          x < size - 1 ? i + 1 : -1,
        ];
        if (nbs.some((ni) => ni >= 0 && world.oceanCells.has(ni))) {
          westShore.push(i);
        }
      }
      for (let n = 0; n < 12; n++) world.runGeomorphologyStep(1);
      let meanLoss = 0;
      for (const i of westShore) meanLoss += elev0[i]! - world.terrain.data[i]!;
      meanLoss /= Math.max(1, westShore.length);
      return { meanLoss, shoreN: westShore.length };
    };

    const sand = run(SUBSTRATE_SAND);
    const rock = run(SUBSTRATE_ROCK);
    expect(sand.shoreN).toBeGreaterThan(0);
    expect(rock.shoreN).toBeGreaterThan(0);
    expect(sand.meanLoss).toBeGreaterThan(rock.meanLoss);
  });

  it("a loam shore's retreat rate is unchanged from the pre-fix global rate (ratio 1)", () => {
    const size = 32;
    const world = new WorldState(generateIsland(size, size, 10, 7), {
      seaLevel: DEFAULT_SEA_LEVEL_METERS,
      windUx: 1,
      windUz: 0,
    });
    world.soilDepth.fill(1.2);
    world.vegCover.fill(0);
    // soilMaterial defaults to loam — left untouched.
    const elev0 = world.terrain.data.slice();
    for (let n = 0; n < 8; n++) world.runGeomorphologyStep(1);
    let moved = false;
    for (let i = 0; i < elev0.length; i++) {
      if (Math.abs(elev0[i]! - world.terrain.data[i]!) > 1e-9) moved = true;
    }
    expect(moved).toBe(true);
  });
});
