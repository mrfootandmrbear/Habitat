import { describe, expect, it } from "vitest";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { soilWaterProcess } from "./process/soilWaterProcess";
import {
  evaluateEt,
  moistureStressFactor,
} from "./hydrology/evapotranspiration";

describe("dry-down ET (NATURAL_PROCESS_MATH §1.6–1.7, ES-003, H-004)", () => {
  it("registers inspectable ET fields and partition ledgers under soilWater", () => {
    const world = new WorldState(new Grid2D(4, 4, 2));
    for (const id of [
      "et.potential",
      "et.actual",
      "ledger.transpiration",
      "ledger.soilEvaporation",
      "ledger.openWaterEvaporation",
    ]) {
      expect(world.registry.get(id).owner).toBe("soilWater");
    }
    expect(soilWaterProcess.writes).toContain("et.potential");
    expect(soilWaterProcess.lagged).toContain("veg.cover");
  });

  it("moisture stress is 0 at wilting and 1 at field capacity", () => {
    const porosity = 0.45;
    expect(
      moistureStressFactor(0, porosity, 0.15, 0.55),
    ).toBe(0);
    expect(
      moistureStressFactor(porosity * 0.15, porosity, 0.15, 0.55),
    ).toBe(0);
    expect(
      moistureStressFactor(porosity * 0.55, porosity, 0.15, 0.55),
    ).toBe(1);
    expect(
      moistureStressFactor(porosity * 0.35, porosity, 0.15, 0.55),
    ).toBeGreaterThan(0);
    expect(
      moistureStressFactor(porosity * 0.35, porosity, 0.15, 0.55),
    ).toBeLessThan(1);
  });

  it("higher insolation raises PET and AET under wet soil", () => {
    const base = {
      moisture: 0.4,
      soilPorosity: 0.45,
      wiltingFraction: 0.15,
      fieldCapacityFraction: 0.55,
      cover: 0.5,
      surfaceDepth: 0,
      petAtFullSun: 0.012,
      openWaterPet: 0.02,
    };
    const dim = evaluateEt({ ...base, insolation: 0.3 });
    const bright = evaluateEt({ ...base, insolation: 0.9 });
    expect(bright.pet).toBeGreaterThan(dim.pet);
    expect(bright.aet).toBeGreaterThan(dim.aet);
  });

  it("cover shifts soil AET toward transpiration", () => {
    const base = {
      insolation: 1,
      moisture: 0.4,
      soilPorosity: 0.45,
      wiltingFraction: 0.15,
      fieldCapacityFraction: 0.55,
      surfaceDepth: 0,
      petAtFullSun: 0.012,
      openWaterPet: 0.02,
    };
    const bare = evaluateEt({ ...base, cover: 0 });
    const veg = evaluateEt({ ...base, cover: 1 });
    expect(bare.soilEvaporation).toBeGreaterThan(veg.soilEvaporation);
    expect(veg.transpiration).toBeGreaterThan(bare.transpiration);
    expect(bare.aet).toBeCloseTo(veg.aet, 9);
  });

  it("south-facing cells lose more moisture than north under identical rain", () => {
    const size = 12;
    const south = planarSlope(size, -4);
    const north = planarSlope(size, 4);
    const southWorld = new WorldState(south);
    const northWorld = new WorldState(north);
    for (const world of [southWorld, northWorld]) {
      world.soilMoisture.fill(0.35);
      world.vegCover.fill(0.4);
      world.water.fill(0);
    }
    for (let i = 0; i < 8; i++) {
      southWorld.runSoilWaterStep(1);
      northWorld.runSoilWaterStep(1);
    }
    expect(mean(southWorld.potentialEt.data)).toBeGreaterThan(
      mean(northWorld.potentialEt.data),
    );
    expect(mean(southWorld.soilMoisture.data)).toBeLessThan(
      mean(northWorld.soilMoisture.data),
    );
  });

  it("partition ledgers sum to ledger.et and mass still closes", () => {
    const world = new WorldState(new Grid2D(8, 8, 2));
    world.soilMoisture.fill(0.3);
    world.vegCover.fill(0.5);
    world.water.fill(0.05);
    // Count initial storage as "precip" so residual closes (H-004).
    let initial = 0;
    for (let i = 0; i < world.water.data.length; i++) {
      initial += world.water.data[i]! + world.soilStorageDepth(i);
    }
    world.precipitationLedger = initial;
    world.runSoilWaterStep(1);
    const parts =
      world.transpirationLedger +
      world.soilEvaporationLedger +
      world.openWaterEvaporationLedger;
    expect(parts).toBeCloseTo(world.etLedger, 9);
    expect(world.etLedger).toBeGreaterThan(0);
    const residual = world.waterBalanceResidual();
    expect(Math.abs(residual)).toBeLessThan(1e-6);
  });

  it("vegetated wet cells transpire while bare cells evaporate from soil", () => {
    const world = new WorldState(new Grid2D(6, 6, 2));
    world.soilMoisture.fill(0.4);
    world.vegCover.fill(0);
    world.vegCover.set(1, 1, 1);
    world.runSoilWaterStep(1);
    expect(world.transpirationLedger).toBeGreaterThan(0);
    expect(world.soilEvaporationLedger).toBeGreaterThan(0);
  });
});

function planarSlope(size: number, risePerCell: number): Grid2D {
  const terrain = new Grid2D(size, size);
  const offset = Math.abs(risePerCell) * size;
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      terrain.set(x, z, offset + z * risePerCell);
    }
  }
  return terrain;
}

function mean(data: Float32Array): number {
  let total = 0;
  for (let i = 0; i < data.length; i++) total += data[i]!;
  return total / data.length;
}
