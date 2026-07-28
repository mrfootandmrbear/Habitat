import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { totalWaterVolume } from "./hydrology/fluxStep";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";
import { surfaceWaterProcess } from "./process/surfaceWaterProcess";
import { soilWaterProcess } from "./process/soilWaterProcess";
import { vegetationProcess } from "./process/vegetationProcess";

/** Force cover + coupling fields without waiting for moisture growth. */
function setCover(world: WorldState, cover: number): void {
  world.vegCover.fill(cover);
  world.runVegetationStep(1);
  world.runSoilWaterStep(1);
}

describe("vegetation → water (Slice 6, E-005)", () => {
  it("declares roughness write, infil contribute, and lagged edges", () => {
    expect(vegetationProcess.writes).toContain("surface.roughness");
    expect(vegetationProcess.contributes).toContain("soil.infiltrationCapacity");
    expect(surfaceWaterProcess.lagged).toContain("surface.roughness");
    expect(soilWaterProcess.lagged).toContain("soil.infiltrationCapacity");
  });

  it("paired soak: full cover infiltrates more than bare from the same pond", () => {
    const flat = new Grid2D(12, 12, 1);
    const bare = new WorldState(flat.clone());
    const vegetated = new WorldState(flat.clone());
    setCover(bare, 0);
    setCover(vegetated, 1);

    bare.water.fill(0.4);
    vegetated.water.fill(0.4);
    bare.infiltrationLedger = 0;
    vegetated.infiltrationLedger = 0;

    bare.runSoilWaterStep(1);
    vegetated.runSoilWaterStep(1);

    expect(vegetated.infiltrationLedger).toBeGreaterThan(bare.infiltrationLedger);
    expect(totalWaterVolume(vegetated.water.data)).toBeLessThan(
      totalWaterVolume(bare.water.data),
    );
  });

  it("paired flux: vegetated ramp drains slower than bare", () => {
    const ramp = new Grid2D(16, 8);
    for (let z = 0; z < 8; z++) {
      for (let x = 0; x < 16; x++) {
        ramp.set(x, z, (15 - x) * 0.4);
      }
    }
    const bare = new WorldState(ramp.clone());
    const vegetated = new WorldState(ramp.clone());
    setCover(bare, 0);
    setCover(vegetated, 1);

    // Pulse at the high end
    for (let z = 0; z < 8; z++) {
      bare.water.set(0, z, 0.5);
      vegetated.water.set(0, z, 0.5);
    }

    for (let i = 0; i < 40; i++) {
      bare.runSurfaceWaterStep(config.simDt);
      vegetated.runSurfaceWaterStep(config.simDt);
    }

    const bareDownslope = bare.water.get(15, 4);
    const vegDownslope = vegetated.water.get(15, 4);
    // Bare should have moved more water to the low end.
    expect(bareDownslope).toBeGreaterThan(vegDownslope);
  });

  it("preserves mass on a closed wet basin under roughness", () => {
    const world = new WorldState(generateMountain(16, 16, 4, 3));
    setCover(world, 0.8);
    world.water.fill(0.25);
    const initial = totalWaterVolume(world.water.data);
    for (let i = 0; i < 30; i++) world.runSurfaceWaterStep(config.simDt);
    expect(totalWaterVolume(world.water.data)).toBeCloseTo(initial, 5);
  });

  it("higher cover → higher roughness and infiltration capacity", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    setCover(world, 0);
    const r0 = world.surfaceRoughness.get(0, 0);
    const c0 = world.infiltrationCapacity.get(0, 0);
    setCover(world, 1);
    expect(world.surfaceRoughness.get(0, 0)).toBeGreaterThan(r0);
    expect(world.infiltrationCapacity.get(0, 0)).toBeGreaterThan(c0);
  });
});
