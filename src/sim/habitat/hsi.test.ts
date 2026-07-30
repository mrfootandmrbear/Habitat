import { describe, expect, it } from "vitest";
import { config } from "../../config";
import { Grid2D } from "../Grid2D";
import { WorldState } from "../WorldState";
import {
  evaluateHsi,
  LIMITING_DEPTH,
  LIMITING_GROUNDWATER,
  LIMITING_MOISTURE,
} from "./hsiComposition";

describe("Liebig HSI (Slice 9 / NATURAL_PROCESS_MATH §3.3)", () => {
  it("uses min composition — improving a non-limiting factor does not raise HSI", () => {
    const base = evaluateHsi({
      moisture: 0.1, // limiting
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

  it("names depth as limiting when soil is thin and water is abundant", () => {
    const s = evaluateHsi({
      moisture: config.soilPorosity,
      soilDepth: 0.1,
      groundwater: 1,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
    });
    expect(s.limiting).toBe(LIMITING_DEPTH);
  });

  it("names groundwater when GW is the minimum", () => {
    const s = evaluateHsi({
      moisture: config.soilPorosity,
      soilDepth: 2,
      groundwater: 0.01,
      porosity: config.soilPorosity,
      depthRef: config.hsiDepthRefMeters,
      gwRef: config.hsiGwRefMeters,
    });
    expect(s.limiting).toBe(LIMITING_GROUNDWATER);
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
    world.soilMoisture.fill(0.3);
    world.soilDepth.fill(0.8);
    world.groundwaterStorage.fill(0.1);
    for (let i = 0; i < config.dailyEventSteps; i++) {
      world.stepEvent();
    }
    expect(world.getHabitatSuitability(2, 2)).toBeGreaterThan(0);
    expect(world.getLimitingFactor(2, 2)).toBeGreaterThanOrEqual(0);
  });
});
