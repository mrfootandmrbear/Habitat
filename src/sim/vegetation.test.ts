import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "../config";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";
import { vegetationProcess } from "./process/vegetationProcess";

describe("vegetation (Slice 5, ES-001 / ES-006)", () => {
  it("declares soil→veg reads including herb biomass for physicalCover — no water writes", () => {
    expect(vegetationProcess.reads).toEqual([
      "soil.moisture",
      "terrain.elevation",
      "veg.biomass.herb",
      "veg.biomass.strand",
      "veg.biomass.binder",
    ]);
    expect(vegetationProcess.writes).toContain("veg.cover");
    expect(vegetationProcess.writes).not.toContain("water.surfaceDepth");
    expect(vegetationProcess.writes).not.toContain("soil.moisture");
  });

  it("registers veg.cover owned by vegetation", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    const field = world.registry.get("veg.cover");
    expect(field.owner).toBe("vegetation");
    expect(field.shape).toBe("cell");
  });

  it("monotonicity: higher sustained moisture → ≥ cover", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    const wet = 1;
    const dry = 2;
    world.soilMoisture.set(wet, 0, 0.35);
    world.soilMoisture.set(dry, 0, 0.08);
    world.vegCover.fill(0);

    for (let i = 0; i < 40; i++) {
      world.runVegetationStep(1);
    }

    expect(world.getVegCover(wet, 0)).toBeGreaterThanOrEqual(
      world.getVegCover(dry, 0),
    );
    expect(world.getVegCover(wet, 0)).toBeGreaterThan(0.05);
  });

  it("vegetation step does not mutate water or soil moisture buffers", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    world.soilMoisture.fill(0.2);
    world.water.fill(0.05);
    const waterBefore = world.water.data.slice();
    const soilBefore = world.soilMoisture.data.slice();
    world.runVegetationStep(1);
    expect([...world.water.data]).toEqual([...waterBefore]);
    expect([...world.soilMoisture.data]).toEqual([...soilBefore]);
    expect(world.vegCover.data.some((v) => v > 0)).toBe(true);
    expect(world.surfaceRoughness.get(0, 0)).toBeGreaterThan(
      config.baseRoughness - 1e-9,
    );
  });

  it("source has no fixed carrying-capacity K symbol (ES-006)", () => {
    const vegFile = readFileSync(
      join(import.meta.dirname, "process/vegetationProcess.ts"),
      "utf8",
    );
    const worldFile = readFileSync(
      join(import.meta.dirname, "WorldState.ts"),
      "utf8",
    );
    const combined = vegFile + worldFile;
    expect(combined).not.toMatch(/carryingCapacity|carryCapacity|\bconst K\b/);
    expect(config).not.toHaveProperty("vegCarryingCapacity");
  });
});
