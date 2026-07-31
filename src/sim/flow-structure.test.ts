import { describe, expect, it } from "vitest";
import { config } from "../config";
import { seaLevelById } from "./climate/seaLevel";
import { Grid2D } from "./Grid2D";
import {
  computeD8Accumulation,
  computeD8FlowDirection,
  computeWatershedLabels,
  type FlowDirection,
} from "./hydrology/flowRouting";
import { generateIsland } from "./terrain/generateIsland";
import { WorldState } from "./WorldState";

function ramp(width: number, height: number, slope: number): Grid2D {
  const t = new Grid2D(width, height);
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) t.set(x, z, -x * slope);
  }
  return t;
}

/** Walks direction pointers from every cell; throws on a cycle (path revisits a cell before reaching a sink). */
function assertNoCycles(
  width: number,
  height: number,
  direction: FlowDirection,
): void {
  const n = width * height;
  const D8_DX = [-1, 0, 1, -1, 1, -1, 0, 1];
  const D8_DZ = [-1, -1, -1, 0, 0, 1, 1, 1];
  for (let start = 0; start < n; start++) {
    let cur = start;
    const seen = new Set<number>();
    for (let step = 0; step <= n; step++) {
      if (seen.has(cur)) {
        throw new Error(`cycle reachable from cell ${start}, at cell ${cur}`);
      }
      seen.add(cur);
      const dir = direction[cur]!;
      if (dir < 0) break;
      const x = cur % width;
      const z = (cur / width) | 0;
      const nx = x + D8_DX[dir]!;
      const nz = z + D8_DZ[dir]!;
      cur = nz * width + nx;
      if (step === n) {
        throw new Error(`cell ${start} never reached a sink within ${n} steps`);
      }
    }
  }
}

/**
 * The pre-fix flat tie-break (hydrology/geomorphology review §1): among
 * non-uphill neighbors, pick steepest drop, ties broken by neighbor index.
 * Reproduced here, not in production code, only to demonstrate the 2-cycle
 * regression this slice closes.
 */
function legacyIndexTieBreakDirection(
  width: number,
  height: number,
  elevation: Float32Array,
): FlowDirection {
  const D8_DX = [-1, 0, 1, -1, 1, -1, 0, 1];
  const D8_DZ = [-1, -1, -1, 0, 0, 1, 1, 1];
  const n = width * height;
  const direction = new Int8Array(n);
  direction.fill(-1);
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const i = z * width + x;
      const h = elevation[i]!;
      let bestScore = -Infinity;
      let bestDir = -1;
      for (let d = 0; d < 8; d++) {
        const nx = x + D8_DX[d]!;
        const nz = z + D8_DZ[d]!;
        if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
        const ni = nz * width + nx;
        const nh = elevation[ni]!;
        if (nh > h) continue;
        const drop = h - nh;
        const score = drop * 1e6 - ni;
        if (score > bestScore) {
          bestScore = score;
          bestDir = d;
        }
      }
      direction[i] = bestDir;
    }
  }
  return direction;
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

describe("flat-routing correctness (hydrology/geomorphology review §1, §4.49)", () => {
  it("a filled lake with a known pour point routes to it, not by neighbor index, and the channel continues past the spill", () => {
    const width = 8;
    const height = 3;
    // Row 1: three tied lake cells (5) → pour point (5→4, a genuine drop) →
    // a monotonically descending channel to the map edge. Rows 0 and 2 are
    // a uniform wall (10) so the lake can only escape through the pour point.
    // eslint-disable-next-line prettier/prettier
    const elev = new Float32Array([
      10, 10, 10, 10, 10, 10, 10, 10,
      10,  5,  5,  5,  4,  3,  2,  1,
      10, 10, 10, 10, 10, 10, 10, 10,
    ]);
    const lake = [9, 10, 11]; // (1,1) (2,1) (3,1)
    const pour = 11; // (3,1) — the only lake cell with a genuinely lower neighbor
    const channel = [12, 13, 14, 15]; // (4,1)..(7,1), 7 is the map edge

    const dir = computeD8FlowDirection(width, height, elev);
    assertNoCycles(width, height, dir);

    // Every lake cell must route deeper into the lake or out through the
    // pour point — never straight to a sink inside the lake.
    for (const i of lake) expect(dir[i]).not.toBe(-1);

    const acc = computeD8Accumulation(width, height, elev, dir);
    // The whole lake accumulates through its pour point...
    expect(acc[pour]!).toBeGreaterThanOrEqual(lake.length);
    // ...and accumulation only grows (never resets) continuing down the
    // channel past the spill — the channel does not terminate in the lake.
    let prev = acc[pour]!;
    for (const i of channel) {
      expect(acc[i]!).toBeGreaterThanOrEqual(prev);
      prev = acc[i]!;
    }
    expect(acc[channel[channel.length - 1]!]!).toBeGreaterThan(acc[pour]!);
  });

  it("the pre-fix index tie-break cycles on this same fixture; the fix does not", () => {
    const width = 3;
    const height = 3;
    // A minimal flat ring around a raised center — every rim cell is tied
    // with its neighbors and has no direct downhill escape except off-grid,
    // which is exactly the shape the review names ("2-cycles on the rim of
    // any interior flat").
    // eslint-disable-next-line prettier/prettier
    const elev = new Float32Array([
      5, 5, 5,
      5, 5, 5,
      5, 5, 5,
    ]);
    const legacy = legacyIndexTieBreakDirection(width, height, elev);
    expect(() => assertNoCycles(width, height, legacy)).toThrow(/cycle/);

    const fixed = computeD8FlowDirection(width, height, elev);
    assertNoCycles(width, height, fixed);
  });

  it("regression: on the default island, land drainage has no cycles and does not explode into one sink per cell", () => {
    const n = config.gridSize;
    const terrain = generateIsland(n, n, config.mountainPeak, config.terrainSeed);
    const world = new WorldState(terrain, {
      seaLevel: seaLevelById("mid").meters,
    });
    world.recomputeFlowStructure();
    const filled = world.filledElevation!;
    const dir = world.flowDirection!;
    const ocean = world.oceanCells;
    const landCells: number[] = [];
    for (let i = 0; i < n * n; i++) if (!ocean.has(i)) landCells.push(i);

    // Core correctness property (review §1): the fixed algorithm never
    // cycles, on real generated terrain, not just a hand-built fixture.
    assertNoCycles(n, n, dir);

    // The old index tie-break does cycle on this same terrain — the bug
    // reproduces outside the synthetic fixture too.
    const legacyDir = legacyIndexTieBreakDirection(n, n, filled);
    expect(() => assertNoCycles(n, n, legacyDir)).toThrow(/cycle/);

    // Land sinks (ocean cells are trivially, correctly their own terminus —
    // excluded here since that's not what "cycle-minted spurious sink"
    // means) should be a small minority of land, not one per cell: a flat
    // routed correctly toward its pour point consolidates to one sink, it
    // doesn't fragment.
    const labels = computeWatershedLabels(n, n, dir);
    const landSinks = new Set(landCells.map((i) => labels[i]!));
    expect(landSinks.size).toBeLessThan(landCells.length * 0.05);
  });
});
