import { describe, expect, it } from "vitest";
import { config } from "../../config";
import { Grid2D } from "../Grid2D";
import { WorldState } from "../WorldState";
import {
  evaluateHsi,
  factorMoisture,
  LIMITING_DEPTH,
  LIMITING_GROUNDWATER,
  LIMITING_INUNDATION,
  LIMITING_LIGHT,
  LIMITING_MOISTURE,
  LIMITING_SALINITY,
  LIMITING_SPRAY,
  LIMITING_TEMPERATURE,
} from "./hsiComposition";
import { heatById } from "../climate/atmosphere";
import { factorSalinity } from "./salinityComposition";
import { factorTemperature } from "./temperatureComposition";

/** Non-limiting moisture under the §4.46 hump (peaks at half fill). */
const peakMoist = config.soilPorosity * 0.5;

describe("Liebig HSI (Slice 9 / NATURAL_PROCESS_MATH §3.3)", () => {
  it("uses min composition — improving a non-limiting factor does not raise HSI", () => {
    const base = evaluateHsi({
      moisture: 0.1, // limiting (below peak)
      soilDepth: 1,
      groundwater: 0.5,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
    });
    expect(base.limiting).toBe(LIMITING_MOISTURE);
    const deeper = evaluateHsi({
      moisture: 0.1,
      soilDepth: 2,
      groundwater: 0.5,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
    });
    expect(deeper.hsi).toBeCloseTo(base.hsi, 8);
    const wetter = evaluateHsi({
      moisture: 0.2,
      soilDepth: 1,
      groundwater: 0.5,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
    });
    expect(wetter.hsi).toBeGreaterThan(base.hsi);
  });

  it("bounds HSI to [0,1] with zero inputs (no NaN)", () => {
    const z = evaluateHsi({
      moisture: 0,
      soilDepth: 0,
      groundwater: 0,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
    });
    expect(z.hsi).toBe(0);
    expect(Number.isFinite(z.hsi)).toBe(true);
    expect(Number.isFinite(z.limitingGap)).toBe(true);
  });

  it("names depth as limiting when soil is thin and water is at peak fill", () => {
    const s = evaluateHsi({
      moisture: peakMoist,
      soilDepth: 0.1,
      groundwater: 1,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
    });
    expect(s.limiting).toBe(LIMITING_DEPTH);
    expect(factorMoisture(peakMoist, config.soilPorosity)).toBe(1);
  });

  it("names groundwater when GW is the minimum", () => {
    const s = evaluateHsi({
      moisture: peakMoist,
      soilDepth: 2,
      groundwater: 0.01,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
    });
    expect(s.limiting).toBe(LIMITING_GROUNDWATER);
  });

  it("names salinity when salt is the minimum (C-018)", () => {
    const salt = 0.9;
    const s = evaluateHsi({
      moisture: peakMoist,
      soilDepth: 2,
      groundwater: 1,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
      salinity: salt,
    });
    expect(s.limiting).toBe(LIMITING_SALINITY);
    expect(s.hsi).toBeCloseTo(
      factorSalinity(salt, config.herbSalinityFullThrough),
      8,
    );
  });

  it("names temperature when Heat is cold (C-004)", () => {
    const s = evaluateHsi({
      moisture: peakMoist,
      soilDepth: 2,
      groundwater: 1,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
      airTempC: heatById("cold").airTempC,
      tempKillC: config.herbTempKillC,
      tempOptC: config.herbTempOptC,
    });
    expect(s.limiting).toBe(LIMITING_TEMPERATURE);
    expect(s.hsi).toBe(0);
    expect(s.fTemp).toBe(0);
  });

  it("warm Heat keeps f_temp high so moisture can still limit", () => {
    const s = evaluateHsi({
      moisture: 0.1,
      soilDepth: 2,
      groundwater: 1,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
      airTempC: heatById("warm").airTempC,
      tempKillC: config.herbTempKillC,
      tempOptC: config.herbTempOptC,
    });
    // Unimodal TPC: warm sits above opt on the upper limb, not stuck at 1.
    expect(s.fTemp).toBeCloseTo(
      factorTemperature(
        heatById("warm").airTempC,
        config.herbTempKillC,
        config.herbTempOptC,
      ),
      8,
    );
    expect(s.fTemp).toBeGreaterThan(0.8);
    expect(s.limiting).toBe(LIMITING_MOISTURE);
  });

  it("names spray when shore exposure is full (C-017)", () => {
    const s = evaluateHsi({
      moisture: peakMoist,
      soilDepth: 2,
      groundwater: 1,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
      shoreExposure: 1,
    });
    expect(s.limiting).toBe(LIMITING_SPRAY);
    expect(s.hsi).toBe(0);
    expect(s.fSpray).toBe(0);
  });

  it("zero exposure leaves f_spray at 1 so moisture can still limit", () => {
    const s = evaluateHsi({
      moisture: 0.1,
      soilDepth: 2,
      groundwater: 1,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
      shoreExposure: 0,
    });
    expect(s.fSpray).toBe(1);
    expect(s.limiting).toBe(LIMITING_MOISTURE);
  });

  it("names inundation when elev sits deep in the tidal envelope (C-016)", () => {
    // hydroperiod ≥ 0.5 → upland taper has already hit 0
    const s = evaluateHsi({
      moisture: peakMoist,
      soilDepth: 2,
      groundwater: 1,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
      elevMeters: 1.5,
      mlwMeters: 1,
      mhwMeters: 3,
    });
    expect(s.limiting).toBe(LIMITING_INUNDATION);
    expect(s.hsi).toBe(0);
    expect(s.fInundation).toBe(0);
  });

  it("elev above MHW leaves f_inundation at 1 so moisture can still limit", () => {
    const s = evaluateHsi({
      moisture: 0.1,
      soilDepth: 2,
      groundwater: 1,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
      elevMeters: 3.5,
      mlwMeters: 1,
      mhwMeters: 3,
    });
    expect(s.fInundation).toBe(1);
    expect(s.limiting).toBe(LIMITING_MOISTURE);
  });

  it("names light when open-sky insolation is zero (C-007 / C-011)", () => {
    const s = evaluateHsi({
      moisture: peakMoist,
      soilDepth: 2,
      groundwater: 1,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
      insolation: 0,
    });
    expect(s.limiting).toBe(LIMITING_LIGHT);
    expect(s.hsi).toBe(0);
    expect(s.fLight).toBe(0);
  });

  it("horizontal insolation leaves f_light at 1 so moisture can still limit", () => {
    const s = evaluateHsi({
      moisture: 0.1,
      soilDepth: 2,
      groundwater: 1,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
      insolation: Math.sin((config.solarAltitudeDegrees * Math.PI) / 180),
    });
    expect(s.fLight).toBe(1);
    expect(s.limiting).toBe(LIMITING_MOISTURE);
  });

  it("improving a non-limiting factor does not raise salt-limited HSI", () => {
    const base = evaluateHsi({
      moisture: 0.2,
      soilDepth: 1,
      groundwater: 0.5,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
      salinity: 0.8,
    });
    expect(base.limiting).toBe(LIMITING_SALINITY);
    const wetter = evaluateHsi({
      moisture: peakMoist,
      soilDepth: 1,
      groundwater: 0.5,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
      salinity: 0.8,
    });
    expect(wetter.hsi).toBeCloseTo(base.hsi, 8);
  });

  it("registers habitat fields owned by habitat on the daily band", () => {
    const world = new WorldState(new Grid2D(4, 4, 1));
    const hsi = world.registry.get("habitat.suitability");
    expect(hsi.owner).toBe("habitat");
    expect(hsi.legacy).toBe(false);
    expect(world.registry.get("habitat.limitingFactor").band).toBe("daily");
  });

  it("updates suitability on a daily band", () => {
    const world = new WorldState(new Grid2D(6, 6, 1));
    world.soilMoisture.fill(peakMoist);
    world.soilDepth.fill(0.8);
    world.groundwaterStorage.fill(0.1);
    for (let i = 0; i < config.dailyEventSteps; i++) {
      world.stepEvent();
    }
    expect(world.getHabitatSuitability(2, 2)).toBeGreaterThan(0);
    expect(world.getLimitingFactor(2, 2)).toBeGreaterThanOrEqual(0);
  });
});
