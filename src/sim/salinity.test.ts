import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import {
  concentrateSalinity,
  diluteSalinity,
  factorSalinity,
  mixTowardSeawater,
} from "./habitat/salinityComposition";
import { evaluateHsi, LIMITING_SALINITY } from "./habitat/hsiComposition";
import { soilWaterProcess } from "./process/soilWaterProcess";
import { habitatProcess } from "./process/habitatProcess";
import { WorldState } from "./WorldState";
import { generateIsland, DEFAULT_SEA_LEVEL_METERS } from "./terrain/generateIsland";
import {
  applySave,
  omitField,
  serializeRegistry,
  SaveError,
} from "./save";

describe("salinity composition (Slice 20 / C-018)", () => {
  it("factorSalinity is 1 fresh and 0 at seawater", () => {
    expect(factorSalinity(0)).toBe(1);
    expect(factorSalinity(1)).toBe(0);
    expect(factorSalinity(0.5)).toBeCloseTo(0.5, 8);
  });

  it("freshwater infiltrate dilutes; ET concentrates", () => {
    const diluted = diluteSalinity(1, 0.1, 0.1);
    expect(diluted).toBeCloseTo(0.5, 8);
    const concentrated = concentrateSalinity(0.5, 0.2, 0.1);
    expect(concentrated).toBeCloseTo(1, 8);
  });

  it("mixTowardSeawater approaches 1 asymptotically", () => {
    let s = 0;
    for (let i = 0; i < 20; i++) {
      s = mixTowardSeawater(s, 0.2, 1);
    }
    expect(s).toBeGreaterThan(0.95);
    expect(s).toBeLessThanOrEqual(1);
  });
});

describe("soil.salinity field (Slice 20 / C-018)", () => {
  it("soilWater owns soil.salinity; habitat reads it", () => {
    expect(soilWaterProcess.writes).toContain("soil.salinity");
    expect(habitatProcess.reads).toContain("soil.salinity");
  });

  it("registers soil.salinity as legacy daily soilWater", () => {
    const world = new WorldState(new Grid2D(4, 4, 1));
    const field = world.registry.get("soil.salinity");
    expect(field.owner).toBe("soilWater");
    expect(field.legacy).toBe(true);
    expect(field.band).toBe("daily");
    expect(field.range).toEqual([0, 1]);
  });

  it("round-trips salinity as legacy; omitting it invalidates the save", () => {
    const world = new WorldState(new Grid2D(4, 4, 1));
    world.soilSalinity.set(1, 1, 0.7);
    const doc = serializeRegistry(world.registry);
    expect(doc.fields.some((f) => f.id === "soil.salinity" && f.legacy)).toBe(
      true,
    );
    const other = new WorldState(new Grid2D(4, 4, 1));
    applySave(other.registry, doc);
    expect(other.getSoilSalinity(1, 1)).toBeCloseTo(0.7, 5);

    const missing = omitField(doc, "soil.salinity");
    expect(() => applySave(world.registry, missing)).toThrow(SaveError);
  });

  it("shoreline mixes toward seawater under an island sea level", () => {
    const size = 32;
    const world = new WorldState(generateIsland(size, size, 8, 20), {
      seaLevel: DEFAULT_SEA_LEVEL_METERS,
    });
    expect(world.oceanCellCount()).toBeGreaterThan(0);
    const shore = world.shorelineCellCount();
    expect(shore).toBeGreaterThan(0);
    for (let i = 0; i < 12; i++) {
      world.runSoilWaterStep(1);
    }
    let maxShore = 0;
    let interior = 0;
    let interiorN = 0;
    const ocean = world.oceanCells;
    for (let i = 0; i < world.soilSalinity.data.length; i++) {
      if (ocean.has(i)) continue;
      const x = i % size;
      const z = (i / size) | 0;
      const nbs = [
        z > 0 ? i - size : -1,
        z < size - 1 ? i + size : -1,
        x > 0 ? i - 1 : -1,
        x < size - 1 ? i + 1 : -1,
      ];
      const isShore = nbs.some((ni) => ni >= 0 && ocean.has(ni));
      if (isShore) {
        maxShore = Math.max(maxShore, world.soilSalinity.data[i]!);
      } else {
        interior += world.soilSalinity.data[i]!;
        interiorN++;
      }
    }
    expect(maxShore).toBeGreaterThan(0.5);
    expect(interiorN > 0 ? interior / interiorN : 0).toBeLessThan(0.05);
  });

  it("freshwater infiltrate dilutes a salty cell without changing residual class", () => {
    const world = new WorldState(new Grid2D(6, 6, 1), { closedBoundary: true });
    world.soilDepth.fill(1);
    world.soilMoisture.fill(0.2);
    world.soilSalinity.fill(0.8);
    world.water.set(2, 2, 0.2);
    const residualBefore = world.waterBalanceResidual();
    world.runSoilWaterStep(1);
    expect(world.getSoilSalinity(2, 2)).toBeLessThan(0.8);
    const residualAfter = world.waterBalanceResidual();
    // Water residual must stay the same class (finite, small) — no salt ledger.
    expect(Number.isFinite(residualAfter)).toBe(true);
    expect(Math.abs(residualAfter - residualBefore)).toBeLessThan(0.01);
  });

  it("salty hollow earns less herb biomass than freshened twin under one seed schedule", () => {
    const w = 16;
    const h = 16;
    const make = (salinity: number) => {
      const world = new WorldState(new Grid2D(w, h, 2.5));
      world.vegCover.fill(0);
      world.soilDepth.fill(config.hsiDepthRefMeters);
      world.soilMoisture.fill(config.soilPorosity);
      world.groundwaterStorage.fill(config.hsiGwRefMeters);
      world.soilSalinity.fill(salinity);
      const x = 1;
      const z = 8;
      world.runHabitatStep(1);
      world.runDispersalStep(1);
      for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
      return {
        hsi: world.getHabitatSuitability(x, z),
        biomass: world.getHerbBiomass(x, z),
        limiting: world.getLimitingFactor(x, z),
      };
    };

    const fresh = make(0);
    const salty = make(0.85);
    expect(fresh.hsi).toBeGreaterThan(salty.hsi);
    expect(salty.limiting).toBe(LIMITING_SALINITY);
    expect(fresh.biomass).toBeGreaterThan(salty.biomass);
    expect(fresh.biomass - salty.biomass).toBeGreaterThan(0.05);

    const sample = evaluateHsi({
      moisture: config.soilPorosity,
      soilDepth: config.hsiDepthRefMeters,
      groundwater: config.hsiGwRefMeters,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
      salinity: 0.85,
    });
    expect(sample.limiting).toBe(LIMITING_SALINITY);
  });
});
