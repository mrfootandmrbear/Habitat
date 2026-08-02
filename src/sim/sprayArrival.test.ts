import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { LIMITING_SPRAY } from "./habitat/hsiComposition";
import { factorSpray } from "./habitat/sprayComposition";

describe("Onshore spray stress gate (C-017)", () => {
  it("factorSpray is 1 inland and 0 at full exposure", () => {
    expect(factorSpray(0)).toBe(1);
    expect(factorSpray(1)).toBe(0);
    expect(factorSpray(0.5)).toBeCloseTo(0.5, 8);
    expect(factorSpray(-0.1)).toBe(1);
    expect(factorSpray(1.5)).toBe(0);
  });

  it("exposed shore stalls herb; lee twin earns under one seed schedule", () => {
    const w = 16;
    const h = 16;
    const sx = 1;
    const sz = 8;

    const make = (exposure: number) => {
      const world = new WorldState(new Grid2D(w, h, 2.5));
      world.vegCover.fill(0);
      world.soilDepth.fill(config.hsiDepthRefMeters);
      world.soilMoisture.fill(config.soilPorosity * 0.5);
      world.groundwaterStorage.fill(config.hsiGwRefMeters);
      world.soilSalinity.fill(0);
      world.shoreExposure.fill(0);
      world.shoreExposure.set(sx, sz, exposure);
      world.runHabitatStep(1);
      world.runDispersalStep(1);
      for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
      return world;
    };

    const lee = make(0);
    const windward = make(1);
    const leeBiomass = lee.getHerbBiomass(sx, sz);
    const windBiomass = windward.getHerbBiomass(sx, sz);
    expect(lee.getLimitingFactor(sx, sz)).not.toBe(LIMITING_SPRAY);
    expect(windward.getLimitingFactor(sx, sz)).toBe(LIMITING_SPRAY);
    expect(windward.getHabitatSuitability(sx, sz)).toBe(0);
    expect(leeBiomass).toBeGreaterThan(0.1);
    expect(windBiomass).toBeLessThan(leeBiomass * 0.05);
  });

  it("spray-limited HSI does not rise when moisture improves", () => {
    const world = new WorldState(new Grid2D(8, 8, 2));
    world.shoreExposure.fill(1);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilMoisture.fill(0.1);
    world.soilSalinity.fill(0);
    world.runHabitatStep(1);
    const hsiDry = world.getHabitatSuitability(2, 2);
    expect(world.getLimitingFactor(2, 2)).toBe(LIMITING_SPRAY);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.runHabitatStep(1);
    expect(world.getHabitatSuitability(2, 2)).toBeCloseTo(hsiDry, 8);
  });

  it("strand holds on exposed fresh shore while herb is spray-limited", () => {
    const w = 16;
    const h = 16;
    const sx = 1;
    const sz = 4;
    const world = new WorldState(new Grid2D(w, h, 2.5));
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.shoreExposure.fill(0);
    world.shoreExposure.set(sx, sz, 0.5);
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    expect(world.getLimitingFactor(sx, sz)).toBe(LIMITING_SPRAY);
    expect(world.getHerbBiomass(sx, sz)).toBeLessThan(
      world.getStrandBiomass(sx, sz),
    );
    expect(world.getStrandBiomass(sx, sz)).toBeGreaterThan(0.1);
  });
});
