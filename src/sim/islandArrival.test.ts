import { describe, expect, it } from "vitest";
import { config } from "../config";
import {
  eligibleRichness,
  overseasSeedPressure,
  seedPressureAt,
  shoreDistanceField,
} from "./habitat/arrivalComposition";
import { computeOceanCells, computeShorelineCells } from "./hydrology/fluxStep";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";

/** Disk island: elev = landElev inside radius, shelf elsewhere. */
function diskIsland(
  size: number,
  radius: number,
  landElev = 3,
  shelfElev = 0.5,
): Grid2D {
  const t = new Grid2D(size, size, shelfElev);
  const cx = (size - 1) * 0.5;
  const cz = (size - 1) * 0.5;
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      if (Math.hypot(x - cx, z - cz) <= radius) t.set(x, z, landElev);
    }
  }
  return t;
}

function firstShoreSample(world: WorldState): { x: number; z: number } {
  const shore = computeShorelineCells(
    world.width,
    world.height,
    world.oceanCells,
  );
  for (const i of shore) {
    return { x: i % world.width, z: (i / world.width) | 0 };
  }
  throw new Error("no shoreline cells");
}

function wetHollow(world: WorldState, x: number, z: number): void {
  world.vegCover.fill(0);
  world.soilDepth.fill(config.hsiDepthRefMeters);
  world.soilMoisture.fill(config.soilPorosity);
  world.groundwaterStorage.fill(config.hsiGwRefMeters);
  world.soilSalinity.fill(0);
  // Keep ocean cells dry of soil stores for clarity (HSI unused there).
  for (const i of world.oceanCells) {
    world.soilMoisture.data[i] = 0;
    world.groundwaterStorage.data[i] = 0;
  }
  world.runHabitatStep(1);
  world.runDispersalStep(1);
  for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
  void x;
  void z;
}

describe("eligible richness (Slice 21 / C-019)", () => {
  const base = {
    areaRefCells: 200,
    isolationMeanCells: 24,
    sMin: 0.05,
    sMax: 1,
  };

  it("is monotone in area ↑ and isolation ↓", () => {
    const small = eligibleRichness({
      ...base,
      landCells: 50,
      isolationCells: 16,
    });
    const large = eligibleRichness({
      ...base,
      landCells: 400,
      isolationCells: 16,
    });
    const far = eligibleRichness({
      ...base,
      landCells: 400,
      isolationCells: 64,
    });
    expect(large).toBeGreaterThan(small);
    expect(large).toBeGreaterThan(far);
    expect(small).toBeGreaterThanOrEqual(base.sMin);
    expect(large).toBeLessThanOrEqual(base.sMax);
  });

  it("overseas pressure peaks at shore and is zero for non-finite distance", () => {
    expect(overseasSeedPressure(0, 40, 4)).toBe(40);
    expect(overseasSeedPressure(4, 40, 4)).toBeCloseTo(40 / Math.E, 10);
    expect(overseasSeedPressure(Number.POSITIVE_INFINITY, 40, 4)).toBe(0);
  });

  it("shore distance field is 0 on shoreline and increases inland", () => {
    const size = 16;
    const elev = new Float32Array(size * size);
    elev.fill(0.5);
    const cx = 7.5;
    const cz = 7.5;
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        if (Math.hypot(x - cx, z - cz) <= 4) elev[z * size + x] = 3;
      }
    }
    const ocean = computeOceanCells(elev, 2);
    const shore = computeShorelineCells(size, size, ocean);
    const dist = shoreDistanceField(size, size, ocean, shore);
    for (const i of shore) expect(dist[i]).toBe(0);
    for (const i of ocean) expect(dist[i]).toBe(Number.POSITIVE_INFINITY);
    // Center is inland.
    const mid = ((size / 2) | 0) * size + ((size / 2) | 0);
    expect(dist[mid]!).toBeGreaterThan(0);
  });
});

describe("island overseas dispersal (Slice 21 / C-019)", () => {
  const sea = 2;

  it("island worlds do not use mainland perimeter rain as sole source", () => {
    const world = new WorldState(diskIsland(24, 6), {
      seaLevel: sea,
      islandIsolation: 16,
    });
    const { x, z } = firstShoreSample(world);
    const overseas = world.getHerbSeedBank(x, z);
    const perimeter = seedPressureAt(
      x,
      z,
      world.width,
      world.height,
      config.seedSourceStrength,
      config.seedMeanDistanceCells,
    );
    expect(overseas).toBeGreaterThan(0);
    expect(Math.abs(overseas - perimeter)).toBeGreaterThan(1e-6);
    for (const i of world.oceanCells) {
      expect(world.herbSeedBank.data[i]).toBe(0);
    }
  });

  it("mainland worlds still use perimeter rain", () => {
    const world = new WorldState(new Grid2D(12, 12, 3));
    expect(world.seaLevel).toBeUndefined();
    const edge = world.getHerbSeedBank(0, 6);
    const center = world.getHerbSeedBank(6, 6);
    expect(edge).toBeGreaterThan(center);
    expect(edge).toBeCloseTo(
      seedPressureAt(0, 6, 12, 12, config.seedSourceStrength, config.seedMeanDistanceCells),
      10,
    );
  });

  it("larger island earns more shoreline biomass under identical regimes", () => {
    const small = new WorldState(diskIsland(32, 4), {
      seaLevel: sea,
      islandIsolation: 16,
    });
    const large = new WorldState(diskIsland(32, 10), {
      seaLevel: sea,
      islandIsolation: 16,
    });
    expect(large.landCellCount()).toBeGreaterThan(small.landCellCount());
    expect(large.eligibleRichness()).toBeGreaterThan(small.eligibleRichness());

    const ss = firstShoreSample(small);
    const ls = firstShoreSample(large);
    wetHollow(small, ss.x, ss.z);
    wetHollow(large, ls.x, ls.z);

    const smallB = small.getHerbBiomass(ss.x, ss.z);
    const largeB = large.getHerbBiomass(ls.x, ls.z);
    expect(largeB).toBeGreaterThan(smallB);
    expect(large.getHerbSeedBank(ls.x, ls.z)).toBeGreaterThan(
      small.getHerbSeedBank(ss.x, ss.z),
    );
  });

  it("nearer isolation earns more shoreline biomass than farther", () => {
    const terrain = diskIsland(32, 8);
    const near = new WorldState(terrain.clone(), {
      seaLevel: sea,
      islandIsolation: 4,
    });
    const far = new WorldState(terrain.clone(), {
      seaLevel: sea,
      islandIsolation: 80,
    });
    expect(near.eligibleRichness()).toBeGreaterThan(far.eligibleRichness());
    const sample = firstShoreSample(near);
    wetHollow(near, sample.x, sample.z);
    wetHollow(far, sample.x, sample.z);
    expect(near.getHerbBiomass(sample.x, sample.z)).toBeGreaterThan(
      far.getHerbBiomass(sample.x, sample.z),
    );
  });

  it("same seed + schedule → identical hash (T-001)", () => {
    const make = () => {
      const w = new WorldState(diskIsland(24, 6), {
        seaLevel: sea,
        islandIsolation: 16,
      });
      const s = firstShoreSample(w);
      wetHollow(w, s.x, s.z);
      return w;
    };
    expect(make().stateHash()).toBe(make().stateHash());
  });
});
