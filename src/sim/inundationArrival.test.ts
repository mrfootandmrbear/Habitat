import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { tideById } from "./climate/tidalEnvelope";
import { LIMITING_INUNDATION } from "./habitat/hsiComposition";
import {
  factorInundationUpland,
  tidalHydroperiod,
} from "./habitat/inundationComposition";

const SEA = 2;

describe("Tidal inundation hydroperiod gate (C-016)", () => {
  it("tidalHydroperiod is 0 above MHW and 1 at/below MLW", () => {
    const mlw = 1;
    const mhw = 3;
    expect(tidalHydroperiod(3, mlw, mhw)).toBe(0);
    expect(tidalHydroperiod(4, mlw, mhw)).toBe(0);
    expect(tidalHydroperiod(1, mlw, mhw)).toBe(1);
    expect(tidalHydroperiod(0, mlw, mhw)).toBe(1);
    expect(tidalHydroperiod(2, mlw, mhw)).toBeCloseTo(0.5, 8);
    expect(tidalHydroperiod(2, 2, 2)).toBe(0);
  });

  it("upland factor tapers from dry to zero by half hydroperiod", () => {
    expect(factorInundationUpland(0)).toBe(1);
    expect(factorInundationUpland(0.01)).toBeGreaterThan(0.9);
    expect(factorInundationUpland(0.5)).toBe(0);
    expect(factorInundationUpland(1)).toBe(0);
  });

  it("tide off earns herb; spring band is inundation-limited under one seed schedule", () => {
    const w = 16;
    const h = 16;
    const sx = 8;
    const sz = 8;
    // Foreshore land: sea ≤ elev < spring MHW; salt and spray matched at 0.
    const elev = SEA;

    const make = (amplitude: number) => {
      const terrain = new Grid2D(w, h, elev);
      const world = new WorldState(terrain, {
        seaLevel: SEA,
        tidalAmplitude: amplitude,
      });
      world.vegCover.fill(0);
      world.soilDepth.fill(config.hsiDepthRefMeters);
      world.soilMoisture.fill(config.soilPorosity * 0.5);
      world.groundwaterStorage.fill(config.hsiGwRefMeters);
      world.soilSalinity.fill(0);
      world.shoreExposure.fill(0);
      world.runHabitatStep(1);
      // Uniform seed schedule — isolate HSI from overseas shore bias (C-019).
      world.herbSeedBank.fill(config.seedSourceStrength);
      world.strandSeedBank.fill(config.seedSourceStrength);
      for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
      return world;
    };

    const dry = make(0);
    const wet = make(tideById("spring").amplitudeMeters);
    expect(dry.isIntertidal(sx, sz)).toBe(false);
    expect(wet.isIntertidal(sx, sz)).toBe(true);
    expect(dry.getLimitingFactor(sx, sz)).not.toBe(LIMITING_INUNDATION);
    expect(wet.getLimitingFactor(sx, sz)).toBe(LIMITING_INUNDATION);
    expect(wet.getHabitatSuitability(sx, sz)).toBe(0);
    expect(dry.getHerbBiomass(sx, sz)).toBeGreaterThan(0.1);
    expect(wet.getHerbBiomass(sx, sz)).toBeLessThan(
      dry.getHerbBiomass(sx, sz) * 0.05,
    );
    expect(dry.soilSalinity.get(sx, sz)).toBe(0);
    expect(wet.soilSalinity.get(sx, sz)).toBe(0);
    expect(dry.shoreExposure.get(sx, sz)).toBe(0);
    expect(wet.shoreExposure.get(sx, sz)).toBe(0);
  });

  it("inundation-limited HSI does not rise when moisture improves", () => {
    const elev = SEA + 0.3;
    const world = new WorldState(new Grid2D(8, 8, elev), {
      seaLevel: SEA,
      tidalAmplitude: tideById("spring").amplitudeMeters,
    });
    world.shoreExposure.fill(0);
    world.soilSalinity.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilMoisture.fill(0.1);
    world.runHabitatStep(1);
    const hsiDry = world.getHabitatSuitability(2, 2);
    expect(world.getLimitingFactor(2, 2)).toBe(LIMITING_INUNDATION);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.runHabitatStep(1);
    expect(world.getHabitatSuitability(2, 2)).toBeCloseTo(hsiDry, 8);
  });

  it("high terrace above MHW stays free of inundation limit under spring tide", () => {
    const amp = tideById("spring").amplitudeMeters;
    const mhw = SEA + amp;
    const world = new WorldState(new Grid2D(8, 8, mhw + 0.5), {
      seaLevel: SEA,
      tidalAmplitude: amp,
    });
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.shoreExposure.fill(0);
    world.runHabitatStep(1);
    expect(world.isIntertidal(2, 2)).toBe(false);
    expect(world.getLimitingFactor(2, 2)).not.toBe(LIMITING_INUNDATION);
    expect(world.getHabitatSuitability(2, 2)).toBeGreaterThan(0.8);
  });
});
