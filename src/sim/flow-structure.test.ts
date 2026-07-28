import { describe, expect, it } from "vitest";
import { Grid2D } from "./Grid2D";
import {
  computeD8Accumulation,
  computeD8FlowDirection,
  computeWatershedLabels,
} from "./hydrology/flowRouting";
import { WorldState } from "./WorldState";

function ramp(width: number, height: number, slope: number): Grid2D {
  const t = new Grid2D(width, height);
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) t.set(x, z, -x * slope);
  }
  return t;
}

describe("flow structure (Slice 3, H-002, W-002)", () => {
  it("every cell has accumulation >= 1 and channels exceed 1 on a slope", () => {
    const terrain = ramp(12, 12, 0.5);
    const dir = computeD8FlowDirection(12, 12, terrain.data);
    const acc = computeD8Accumulation(12, 12, terrain.data, dir);
    let maxAcc = 0;
    for (let i = 0; i < acc.length; i++) {
      expect(acc[i]!).toBeGreaterThanOrEqual(1);
      if (acc[i]! > maxAcc) maxAcc = acc[i]!;
    }
    expect(maxAcc).toBeGreaterThan(1);
  });

  it("partitions cells into watershed labels that cover the grid", () => {
    const terrain = ramp(10, 10, 0.3);
    const dir = computeD8FlowDirection(10, 10, terrain.data);
    const labels = computeWatershedLabels(10, 10, dir);
    const seen = new Set<number>();
    for (let i = 0; i < labels.length; i++) seen.add(labels[i]!);
    expect(seen.size).toBeGreaterThan(0);
    expect(labels.length).toBe(100);
  });

  it("WorldState recomputes structure from terrain", () => {
    const world = new WorldState(ramp(16, 16, 0.4));
    world.recomputeFlowStructure();
    const acc = world.flowAccumulation;
    expect(acc).toBeDefined();
    let maxAcc = 0;
    for (let i = 0; i < acc!.length; i++) {
      if (acc![i]! > maxAcc) maxAcc = acc![i]!;
    }
    expect(maxAcc).toBeGreaterThan(1);
  });
});
