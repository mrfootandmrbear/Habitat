import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { heatById } from "./climate/atmosphere";
import { LIMITING_TEMPERATURE } from "./habitat/hsiComposition";
import { factorTemperature } from "./habitat/temperatureComposition";

describe("Heat dial plant gate (C-004 / C-020)", () => {
  it("factorTemperature is unimodal with a warm-side upper limb", () => {
    const kill = config.herbTempKillC;
    const opt = config.herbTempOptC;
    const crit = opt + 1.5 * (opt - kill);
    expect(factorTemperature(kill, kill, opt)).toBe(0);
    expect(factorTemperature(kill - 1, kill, opt)).toBe(0);
    expect(factorTemperature(opt, kill, opt)).toBe(1);
    expect(factorTemperature(opt + 4, kill, opt)).toBeLessThan(1);
    expect(factorTemperature(opt + 4, kill, opt)).toBeCloseTo(
      (crit - (opt + 4)) / (crit - opt),
      8,
    );
    expect(factorTemperature(crit, kill, opt)).toBe(0);
    const mid = (kill + opt) / 2;
    expect(factorTemperature(mid, kill, opt)).toBeCloseTo(0.5, 8);
  });

  it("cold Heat stalls herb establishment; warm twin earns under one seed schedule", () => {
    const w = 16;
    const h = 16;
    const sx = 1;
    const sz = 8;

    const make = (heatId: "warm" | "cold") => {
      const world = new WorldState(new Grid2D(w, h, 2.5));
      world.setAirTemperature(heatById(heatId).airTempC);
      world.vegCover.fill(0);
      world.soilDepth.fill(config.hsiDepthRefMeters);
      world.soilMoisture.fill(config.soilPorosity * 0.5);
      world.groundwaterStorage.fill(config.hsiGwRefMeters);
      world.soilSalinity.fill(0);
      world.runHabitatStep(1);
      world.runDispersalStep(1);
      for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
      return world;
    };

    const warm = make("warm");
    const cold = make("cold");
    const warmBiomass = warm.getHerbBiomass(sx, sz);
    const coldBiomass = cold.getHerbBiomass(sx, sz);
    expect(warm.getHabitatSuitability(sx, sz)).toBeGreaterThan(0);
    expect(cold.getLimitingFactor(sx, sz)).toBe(LIMITING_TEMPERATURE);
    expect(cold.getHabitatSuitability(sx, sz)).toBe(0);
    expect(warmBiomass).toBeGreaterThan(0.1);
    expect(coldBiomass).toBeLessThan(warmBiomass * 0.05);
  });

  it("improving moisture does not raise temperature-limited HSI", () => {
    const world = new WorldState(new Grid2D(8, 8, 2));
    world.setAirTemperature(heatById("cold").airTempC);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilMoisture.fill(0.1);
    world.runHabitatStep(1);
    const hsiDry = world.getHabitatSuitability(2, 2);
    expect(world.getLimitingFactor(2, 2)).toBe(LIMITING_TEMPERATURE);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.runHabitatStep(1);
    expect(world.getHabitatSuitability(2, 2)).toBeCloseTo(hsiDry, 8);
  });
});
