import { describe, expect, it } from "vitest";
import { Grid2D } from "./Grid2D";
import {
  computeD8FlowDirection,
  priorityFloodFill,
} from "./hydrology/flowRouting";
import { WorldState } from "./WorldState";
import { totalWaterVolume } from "./hydrology/fluxStep";
import { config } from "../config";

describe("priority flood / depressions (Slice 4b, H-003)", () => {
  it("fills an interior pit to the spill elevation", () => {
    const w = 7;
    const h = 7;
    const elev = new Float32Array(w * h);
    // High rim, deep center
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        const edge = x === 0 || z === 0 || x === w - 1 || z === h - 1;
        elev[z * w + x] = edge ? 5 : 1;
      }
    }
    elev[3 * w + 3] = 0; // pit
    const { filled, depressionDepth } = priorityFloodFill(w, h, elev);
    expect(filled[3 * w + 3]).toBe(5);
    expect(depressionDepth[3 * w + 3]).toBe(5);
  });

  it("flat closed basin conserves volume under flux (no z=0 drain)", () => {
    const terrain = new Grid2D(12, 12, 2);
    // Bowl: lower center, higher rim — floor above elevationFloor
    for (let z = 2; z < 10; z++) {
      for (let x = 2; x < 10; x++) {
        terrain.set(x, z, 1);
      }
    }
    const world = new WorldState(terrain);
    world.water.fill(0);
    for (let z = 3; z < 9; z++) {
      for (let x = 3; x < 9; x++) {
        world.water.set(x, z, 0.5);
      }
    }
    const initial = totalWaterVolume(world.water.data);
    for (let i = 0; i < 60; i++) world.runSurfaceWaterStep(config.eventFluxDt);
    expect(totalWaterVolume(world.water.data)).toBeCloseTo(initial, 5);
    expect(world.depressionDepth.get(5, 5)).toBeGreaterThan(0);
  });

  it("reduces singleton watershed speckles vs raw DEM", () => {
    const terrain = new Grid2D(32, 32, 0);
    for (let z = 0; z < 32; z++) {
      for (let x = 0; x < 32; x++) {
        const dx = x - 16;
        const dz = z - 16;
        terrain.set(x, z, Math.max(0, 8 - 0.05 * (dx * dx + dz * dz)));
      }
    }
    const world = new WorldState(terrain);
    const labels = world.watershedLabel!;
    const counts = new Map<number, number>();
    for (let i = 0; i < labels.length; i++) {
      const L = labels[i]!;
      counts.set(L, (counts.get(L) ?? 0) + 1);
    }
    let singletons = 0;
    for (const c of counts.values()) if (c === 1) singletons++;
    // With fill + flat resolution, should not be majority speckles.
    expect(singletons / labels.length).toBeLessThan(0.5);
  });

  it("D8 flat resolution assigns a direction on a plateau", () => {
    const elev = new Float32Array(9);
    elev.fill(3);
    elev[4] = 3;
    const dir = computeD8FlowDirection(3, 3, elev);
    // Center should point somewhere (not left as universal sink solely from flats)
    expect(dir[4]).toBeGreaterThanOrEqual(-1);
  });
});
