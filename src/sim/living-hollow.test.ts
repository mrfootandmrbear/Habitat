import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import {
  herbCoverFraction,
  physicalCoverFrom,
} from "./habitat/arrivalComposition";
import { totalWaterVolume } from "./hydrology/fluxStep";
import { WorldState } from "./WorldState";

/** Commit roughness/infil from cover + herb without waiting for moisture growth. */
function commitPhysics(world: WorldState): void {
  world.soilMoisture.fill(0);
  world.runVegetationStep(1);
  world.runSoilWaterStep(1);
}

describe("herb → physics (Slice 13, E-005)", () => {
  it("herbFrac and physicalCover match the composition equation", () => {
    expect(herbCoverFraction(0, config.herbBiomassMax)).toBe(0);
    expect(herbCoverFraction(config.herbBiomassMax, config.herbBiomassMax)).toBe(
      1,
    );
    expect(physicalCoverFrom(0, config.herbBiomassMax, config.herbBiomassMax)).toBe(
      1,
    );
    expect(physicalCoverFrom(0.4, config.herbBiomassMax, config.herbBiomassMax)).toBe(
      1,
    );
    expect(physicalCoverFrom(0.2, config.herbBiomassMax * 0.5, config.herbBiomassMax)).toBeCloseTo(
      0.7,
      6,
    );
  });

  it("does not dual-write veg.cover from herb biomass", () => {
    const world = new WorldState(new Grid2D(8, 8, 1));
    world.vegCover.fill(0);
    world.herbBiomass.fill(config.herbBiomassMax);
    world.soilMoisture.fill(0);
    world.runVegetationStep(1);
    expect(world.vegCover.get(0, 0)).toBe(0);
    expect(world.surfaceRoughness.get(0, 0)).toBeCloseTo(
      config.baseRoughness + config.vegRoughnessBonus,
      5,
    );
  });

  it("earned herb raises roughness and infiltration with cover held at 0", () => {
    const flat = new Grid2D(12, 12, 1);
    const bare = new WorldState(flat.clone());
    const colonized = new WorldState(flat.clone());
    bare.vegCover.fill(0);
    colonized.vegCover.fill(0);
    bare.herbBiomass.fill(0);
    colonized.herbBiomass.fill(config.herbBiomassMax);
    commitPhysics(bare);
    commitPhysics(colonized);

    expect(colonized.surfaceRoughness.get(0, 0)).toBeGreaterThan(
      bare.surfaceRoughness.get(0, 0),
    );
    expect(colonized.infiltrationCapacity.get(0, 0)).toBeGreaterThan(
      bare.infiltrationCapacity.get(0, 0),
    );
  });

  it("paired soak: colonized herb infiltrates more than bare twin", () => {
    const flat = new Grid2D(12, 12, 1);
    const bare = new WorldState(flat.clone());
    const colonized = new WorldState(flat.clone());
    bare.vegCover.fill(0);
    colonized.vegCover.fill(0);
    bare.herbBiomass.fill(0);
    colonized.herbBiomass.fill(config.herbBiomassMax);
    commitPhysics(bare);
    commitPhysics(colonized);

    bare.water.fill(0.4);
    colonized.water.fill(0.4);
    bare.infiltrationLedger = 0;
    colonized.infiltrationLedger = 0;
    bare.runSoilWaterStep(1);
    colonized.runSoilWaterStep(1);

    expect(colonized.infiltrationLedger).toBeGreaterThan(bare.infiltrationLedger);
    expect(totalWaterVolume(colonized.water.data)).toBeLessThan(
      totalWaterVolume(bare.water.data),
    );
  });

  it("paired flux: colonized herb slows downslope delivery vs bare", () => {
    const ramp = new Grid2D(16, 8);
    for (let z = 0; z < 8; z++) {
      for (let x = 0; x < 16; x++) {
        ramp.set(x, z, (15 - x) * 0.4);
      }
    }
    const bare = new WorldState(ramp.clone(), { closedBoundary: true });
    const colonized = new WorldState(ramp.clone(), { closedBoundary: true });
    bare.vegCover.fill(0);
    colonized.vegCover.fill(0);
    bare.herbBiomass.fill(0);
    colonized.herbBiomass.fill(config.herbBiomassMax);
    commitPhysics(bare);
    commitPhysics(colonized);

    for (let z = 0; z < 8; z++) {
      bare.water.set(0, z, 0.5);
      colonized.water.set(0, z, 0.5);
    }
    for (let i = 0; i < 40; i++) {
      bare.runSurfaceWaterStep(config.eventFluxDt);
      colonized.runSurfaceWaterStep(config.eventFluxDt);
    }

    expect(bare.water.get(15, 4)).toBeGreaterThan(colonized.water.get(15, 4));
  });
});
