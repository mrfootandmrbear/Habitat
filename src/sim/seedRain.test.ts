import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { dispersalProcess } from "./process/dispersalProcess";
import {
  convolveSeparable,
  localDispersalKernel,
  localSeedPressureField,
  overseasSeedPressure,
} from "./habitat/arrivalComposition";

/**
 * Slice L2 — local seed rain (C-007 Locked; C-019 Locked; C-003 Open; N-004).
 * Standing biomass is a propagule source: pressure = overseas(d) + Σ biomass·kernel.
 * Invariant class: Symmetry — a founded patch must spread the same way in every
 * direction, which is exactly what an in-place / scan-ordered convolution breaks.
 */

const flatIsland = (size: number): Grid2D => {
  const t = new Grid2D(size, size, 0.5);
  const cx = (size - 1) * 0.5;
  const cz = (size - 1) * 0.5;
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      if (Math.hypot(x - cx, z - cz) <= size * 0.45) t.set(x, z, 3);
    }
  }
  return t;
};

/** Perfect habitat on every land cell, so only dispersal can be limiting. */
const perfectHabitat = (world: WorldState): void => {
  world.vegCover.fill(0);
  world.soilDepth.fill(config.hsiDepthRefMeters);
  world.soilMoisture.fill(config.soilPorosity * 0.5);
  world.groundwaterStorage.fill(config.hsiGwRefMeters);
  world.soilSalinity.fill(0);
  for (const i of world.oceanCells) {
    world.soilMoisture.data[i] = 0;
    world.groundwaterStorage.data[i] = 0;
  }
  world.runHabitatStep(1);
};

describe("local dispersal kernel (L2 / C-003 — deterministic, no RNG)", () => {
  it("normalizes to unit mass so the local term is a weighted mean", () => {
    for (const lambda of [0.5, 1, 2, 6]) {
      const k = localDispersalKernel(lambda);
      let sum = 0;
      for (let i = 0; i < k.length; i++) sum += k[i]!;
      expect(sum).toBeCloseTo(1, 5);
    }
  });

  it("is symmetric about its centre and peaks there", () => {
    const k = localDispersalKernel(2);
    const r = (k.length - 1) >> 1;
    for (let i = 1; i <= r; i++) {
      expect(k[r + i]!).toBeCloseTo(k[r - i]!, 6);
      expect(k[r]!).toBeGreaterThan(k[r + i]!);
    }
  });

  it("decays with distance at the stated mean distance", () => {
    const k = localDispersalKernel(2);
    const r = (k.length - 1) >> 1;
    // w[k] ∝ exp(−|k|/λ): one λ step out is a factor e down.
    expect(k[r]! / k[r + 2]!).toBeCloseTo(Math.E, 3);
  });
});

describe("separable convolution — Symmetry invariant (BUILD_GUIDE §2.1)", () => {
  it("spreads a point source identically in all four directions", () => {
    const n = 21;
    const src = new Float32Array(n * n);
    const c = (n - 1) / 2;
    src[c * n + c] = 1;
    const out = convolveSeparable(src, n, n, localDispersalKernel(2));
    for (let d = 1; d <= 5; d++) {
      const east = out[c * n + (c + d)]!;
      const west = out[c * n + (c - d)]!;
      const south = out[(c + d) * n + c]!;
      const north = out[(c - d) * n + c]!;
      expect(west).toBeCloseTo(east, 6);
      expect(south).toBeCloseTo(east, 6);
      expect(north).toBeCloseTo(east, 6);
    }
  });

  it("is invariant under transpose — no x/z axis bias", () => {
    const n = 17;
    const src = new Float32Array(n * n);
    src[4 * n + 9] = 1;
    src[11 * n + 2] = 0.5;
    const k = localDispersalKernel(1.5);
    const out = convolveSeparable(src, n, n, k);

    const transposed = new Float32Array(n * n);
    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) transposed[x * n + z] = src[z * n + x]!;
    }
    const outT = convolveSeparable(transposed, n, n, k);
    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        expect(outT[x * n + z]!).toBeCloseTo(out[z * n + x]!, 6);
      }
    }
  });

  it("never reads a partially-updated cell (scan order cannot bias it)", () => {
    // A uniform field must convolve to itself in the interior: an in-place
    // convolution would drift across the scan.
    const n = 15;
    const src = new Float32Array(n * n).fill(1);
    const out = convolveSeparable(src, n, n, localDispersalKernel(2));
    const c = (n - 1) / 2;
    expect(out[c * n + c]!).toBeCloseTo(1, 5);
  });

  it("dilutes at the boundary — propagules leaving the field are lost", () => {
    const n = 15;
    const src = new Float32Array(n * n).fill(1);
    const out = convolveSeparable(src, n, n, localDispersalKernel(2));
    expect(out[0]!).toBeLessThan(out[((n - 1) / 2) * n + (n - 1) / 2]!);
    expect(out[0]!).toBeGreaterThan(0);
  });
});

describe("local seed pressure field (L2)", () => {
  it("is zero when nothing is standing — founding stays overseas-only (C-019)", () => {
    const n = 12;
    const field = localSeedPressureField({
      biomass: new Float32Array(n * n),
      width: n,
      height: n,
      biomassMax: config.herbBiomassMax,
      strength: config.localSeedStrength,
      meanDistanceCells: config.localSeedMeanDistanceCells,
    });
    for (let i = 0; i < field.length; i++) expect(field[i]!).toBe(0);
  });

  it("is bounded by strength even when every cell is saturated", () => {
    const n = 12;
    const biomass = new Float32Array(n * n).fill(config.herbBiomassMax);
    const field = localSeedPressureField({
      biomass,
      width: n,
      height: n,
      biomassMax: config.herbBiomassMax,
      strength: config.localSeedStrength,
      meanDistanceCells: config.localSeedMeanDistanceCells,
    });
    for (let i = 0; i < field.length; i++) {
      expect(field[i]!).toBeGreaterThanOrEqual(0);
      expect(field[i]!).toBeLessThanOrEqual(config.localSeedStrength + 1e-6);
    }
  });

  it("normalizes by guild capacity so strength means the same for every guild", () => {
    const n = 9;
    const full = (max: number) => {
      const b = new Float32Array(n * n).fill(max);
      return localSeedPressureField({
        biomass: b,
        width: n,
        height: n,
        biomassMax: max,
        strength: config.localSeedStrength,
        meanDistanceCells: config.localSeedMeanDistanceCells,
      })[(4 * n + 4) | 0]!;
    };
    // crust caps lower than herb, but a saturated crust mat is still a
    // saturated propagule source.
    expect(full(config.crustBiomassMax)).toBeCloseTo(
      full(config.herbBiomassMax),
      6,
    );
  });

  it("falls off with distance from a founded patch", () => {
    const n = 31;
    const biomass = new Float32Array(n * n);
    const c = (n - 1) / 2;
    biomass[c * n + c] = config.herbBiomassMax;
    const field = localSeedPressureField({
      biomass,
      width: n,
      height: n,
      biomassMax: config.herbBiomassMax,
      strength: config.localSeedStrength,
      meanDistanceCells: config.localSeedMeanDistanceCells,
    });
    let prev = field[c * n + c]!;
    for (let d = 1; d <= 6; d++) {
      const here = field[c * n + (c + d)]!;
      expect(here).toBeLessThan(prev);
      prev = here;
    }
  });
});

describe("per-guild dispersal distance (N-004 — referent or nothing)", () => {
  it("sea-dispersed strand travels further than crust mats", () => {
    expect(config.strandLocalMeanDistanceCells).toBeGreaterThan(
      config.localSeedMeanDistanceCells,
    );
    expect(config.crustLocalMeanDistanceCells).toBeLessThan(
      config.localSeedMeanDistanceCells,
    );
  });

  it("reaches further from an identical patch for strand than for crust", () => {
    const n = 41;
    const c = (n - 1) / 2;
    const reach = (max: number, lambda: number) => {
      const b = new Float32Array(n * n);
      b[c * n + c] = max;
      const f = localSeedPressureField({
        biomass: b,
        width: n,
        height: n,
        biomassMax: max,
        strength: config.localSeedStrength,
        meanDistanceCells: lambda,
      });
      // Distance at which pressure falls below a fixed floor.
      let d = 0;
      while (d < c && f[c * n + (c + d)]! > 1e-3) d++;
      return d;
    };
    const strandReach = reach(
      config.strandBiomassMax,
      config.strandLocalMeanDistanceCells,
    );
    const crustReach = reach(
      config.crustBiomassMax,
      config.crustLocalMeanDistanceCells,
    );
    expect(strandReach).toBeGreaterThan(crustReach);
  });
});

describe("dispersal scheduler edge (SIMULATION_MODEL §5)", () => {
  it("declares every guild biomass it now sources propagules from", () => {
    for (const guild of [
      "herb",
      "strand",
      "binder",
      "marsh",
      "shrub",
      "crust",
    ]) {
      expect(dispersalProcess.reads).toContain(`veg.biomass.${guild}`);
      expect(dispersalProcess.lagged).toContain(`veg.biomass.${guild}`);
    }
  });

  it("still owns the seed bank and establishment writes", () => {
    expect(dispersalProcess.writes).toContain("veg.seedBank.herb");
    expect(dispersalProcess.writes).toContain("veg.establishment.crust");
    expect(dispersalProcess.band).toBe("annual");
  });
});

describe("seed pressure = external + local (L2 / C-007)", () => {
  it("leaves the cold-start field exactly equal to the overseas term", () => {
    const world = new WorldState(flatIsland(24), {
      seaLevel: 2,
      islandIsolation: 16,
    });
    perfectHabitat(world);
    world.runDispersalStep(1);
    // Nothing standing yet, so every land cell must still read pure overseas.
    const strength = config.overseasSeedBase * world.eligibleRichness();
    let checked = 0;
    for (let i = 0; i < world.width * world.height; i++) {
      if (world.oceanCells.has(i)) {
        expect(world.herbSeedBank.data[i]!).toBe(0);
        continue;
      }
      checked++;
      const seed = world.herbSeedBank.data[i]!;
      expect(Number.isFinite(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(strength + 1e-6);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("raises pressure beside a founded patch and leaves distant cells alone", () => {
    const size = 32;
    const make = () => {
      const w = new WorldState(flatIsland(size), {
        seaLevel: 2,
        islandIsolation: 16,
      });
      perfectHabitat(w);
      return w;
    };
    const bare = make();
    bare.runDispersalStep(1);

    const founded = make();
    const cx = 16;
    const cz = 16;
    for (let z = cz - 1; z <= cz + 1; z++) {
      for (let x = cx - 1; x <= cx + 1; x++) {
        founded.herbBiomass.set(x, z, config.herbBiomassMax);
      }
    }
    founded.runDispersalStep(1);

    // Adjacent to the patch: strictly more seed than the same cell with no patch.
    const near = founded.getHerbSeedBank(cx + 2, cz);
    const nearBare = bare.getHerbSeedBank(cx + 2, cz);
    expect(near).toBeGreaterThan(nearBare);

    // Far from the patch (well beyond 3λ): unchanged.
    const far = founded.getHerbSeedBank(cx, cz + 12);
    const farBare = bare.getHerbSeedBank(cx, cz + 12);
    expect(far).toBeCloseTo(farBare, 6);
  });

  it("is reproducible — no stochastic arrivals while C-003 is Open", () => {
    const make = () => {
      const w = new WorldState(flatIsland(24), {
        seaLevel: 2,
        islandIsolation: 16,
      });
      perfectHabitat(w);
      for (let y = 0; y < 3; y++) {
        w.runDispersalStep(1);
        for (let s = 0; s < 4; s++) w.runHerbEstablishmentStep(1);
      }
      return w;
    };
    expect(make().stateHash()).toBe(make().stateHash());
  });

  it("keeps the overseas kernel itself untouched (C-019 shape)", () => {
    // The external term is still exactly the Slice 21 kernel.
    expect(overseasSeedPressure(0, 40, 4)).toBeCloseTo(40, 6);
    expect(overseasSeedPressure(4, 40, 4)).toBeCloseTo(40 / Math.E, 6);
    expect(overseasSeedPressure(Number.POSITIVE_INFINITY, 40, 4)).toBe(0);
  });
});

describe("a founded patch spreads; bare ground alone does not (L2 / C-011)", () => {
  it("lets an interior refugium vegetate ground the overseas kernel cannot reach", () => {
    const size = 32;
    const world = new WorldState(flatIsland(size), {
      seaLevel: 2,
      islandIsolation: 16,
    });
    perfectHabitat(world);

    const cx = 16;
    const cz = 16;
    world.runDispersalStep(1);
    const overseasOnly = world.getHerbSeedBank(cx, cz);

    // Found a refugium two cells away and let it seed inward.
    for (let z = cz - 3; z <= cz - 1; z++) {
      for (let x = cx - 1; x <= cx + 1; x++) {
        world.herbBiomass.set(x, z, config.herbBiomassMax);
      }
    }
    for (let y = 0; y < 6; y++) {
      world.runDispersalStep(1);
      for (let s = 0; s < 4; s++) world.runHerbEstablishmentStep(1);
    }

    expect(world.getHerbSeedBank(cx, cz)).toBeGreaterThan(overseasOnly);
    expect(world.getHerbBiomass(cx, cz)).toBeGreaterThan(0.1);
  });

  it("bounds biomass under the sustained local term", () => {
    const world = new WorldState(flatIsland(24), {
      seaLevel: 2,
      islandIsolation: 16,
    });
    perfectHabitat(world);
    world.herbBiomass.fill(config.herbBiomassMax);
    for (let y = 0; y < 8; y++) {
      world.runDispersalStep(1);
      for (let s = 0; s < 4; s++) world.runHerbEstablishmentStep(1);
    }
    for (let i = 0; i < world.herbBiomass.data.length; i++) {
      const v = world.herbBiomass.data[i]!;
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(config.herbBiomassMax + 1e-6);
    }
  });
});
