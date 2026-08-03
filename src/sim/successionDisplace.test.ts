import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { heatById } from "./climate/atmosphere";
import { herbCoverFraction } from "./habitat/arrivalComposition";
import { evaluateLight } from "./vegetation/lightCompetition";
import { habitatProcess } from "./process/habitatProcess";

/**
 * L5 / C-023 — guild competition / successional displacement.
 * Criterion: docs/DECISION_CONFORMANCE.md C-023. Shrub (the one woody,
 * structurally taller guild — DESIGN_WIKI §4) attenuates the insolation
 * herb's light factor sees, via the existing Beer–Lambert evaluateLight —
 * not a new rule or a dominance table (C-011 / N-004 / ES-006).
 */
describe("L5 / C-023 guild competition — shrub shades herb", () => {
  it("bare shrub leaves insolation exactly unchanged (no-competition regression)", () => {
    const insolation = 0.8;
    const shrubCover = herbCoverFraction(0, config.shrubBiomassMax);
    expect(shrubCover).toBe(0);
    expect(evaluateLight(insolation, shrubCover).understoryLight).toBe(
      insolation,
    );
  });

  it("dense shrub cover measurably attenuates the insolation herb sees", () => {
    const insolation = 0.8;
    const shrubCover = herbCoverFraction(
      config.shrubBiomassMax * 0.7,
      config.shrubBiomassMax,
    );
    const attenuated = evaluateLight(insolation, shrubCover).understoryLight;
    expect(attenuated).toBeLessThan(insolation);
    expect(attenuated).toBeCloseTo(insolation * (1 - shrubCover), 6);
  });

  it("herb rises, peaks, then declines under a shrub canopy — and does not decline when shrub is suppressed", () => {
    const w = 8;
    const h = 8;
    const sx = 4;
    const sz = 4;
    const ticks = 30;

    const make = (suppressShrub: boolean) => {
      const world = new WorldState(new Grid2D(w, h, 2.5));
      world.setAirTemperature(heatById("warm").airTempC);
      world.vegCover.fill(0);
      world.soilDepth.fill(config.hsiDepthRefMeters);
      world.soilMoisture.fill(config.soilPorosity * 0.5);
      world.groundwaterStorage.fill(config.hsiGwRefMeters);
      world.soilSalinity.fill(0);
      world.shoreExposure.fill(0);
      let herbPeak = 0;
      const herbTrace: number[] = [];
      for (let tick = 0; tick < ticks; tick++) {
        world.runHabitatStep(1);
        world.runDispersalStep(1);
        if (suppressShrub) world.shrubSeedBank.fill(0);
        world.runHerbEstablishmentStep(1);
        const herb = world.getHerbBiomass(sx, sz);
        herbPeak = Math.max(herbPeak, herb);
        herbTrace.push(herb);
      }
      return { world, herbPeak, herbTrace };
    };

    const competing = make(false);
    const control = make(true);

    // Competing: real displacement — a later value below the run's own peak.
    expect(competing.herbTrace.at(-1)!).toBeLessThan(competing.herbPeak);
    expect(competing.herbPeak - competing.herbTrace.at(-1)!).toBeGreaterThan(
      0.1,
    );
    expect(competing.world.getShrubBiomass(sx, sz)).toBeGreaterThan(0.5);

    // Control: shrub never establishes, herb never declines from its peak.
    expect(control.world.getShrubBiomass(sx, sz)).toBe(0);
    expect(control.herbTrace.at(-1)!).toBeGreaterThanOrEqual(
      control.herbPeak,
    );

    // The suppression is caused by shrub, not some other confound — same
    // terrain/moisture/temperature/seed, only shrub's presence differs.
    expect(control.herbTrace.at(-1)!).toBeGreaterThan(
      competing.herbTrace.at(-1)! + 0.5,
    );
  });

  it("habitatProcess declares veg.biomass.shrub as a lagged cross-band read", () => {
    // T-005: L5 reads shrub's seasonal-band biomass from the daily band;
    // must be declared, not silently consumed.
    expect(habitatProcess.reads).toContain("veg.biomass.shrub");
    expect(habitatProcess.lagged).toContain("veg.biomass.shrub");
  });
});
