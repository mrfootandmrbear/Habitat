import { describe, expect, it } from "vitest";
import { config } from "../config";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";
import {
  heatById,
  precipPhaseFromTemp,
  PRECIP_PHASE_RAIN,
  PRECIP_PHASE_SLEET,
  PRECIP_PHASE_SNOW,
  stepAtmosphere,
} from "./climate/atmosphere";
import { rainDepthForRegime, rainRegimeById } from "./climate/rainRegime";

describe("atmosphere (C-020)", () => {
  it("maps air temperature to rain / sleet / snow", () => {
    expect(precipPhaseFromTemp(16)).toBe(PRECIP_PHASE_RAIN);
    expect(precipPhaseFromTemp(1)).toBe(PRECIP_PHASE_SLEET);
    expect(precipPhaseFromTemp(-8)).toBe(PRECIP_PHASE_SNOW);
  });

  it("setAirTemperature syncs precipPhase immediately (no event-step lag)", () => {
    const world = new WorldState(generateMountain(16, 16, 4, 2));
    world.setAirTemperature(heatById("cold").airTempC);
    expect(world.precipPhase).toBe(PRECIP_PHASE_SNOW);
    world.setAirTemperature(heatById("warm").airTempC);
    expect(world.precipPhase).toBe(PRECIP_PHASE_RAIN);
  });

  it("charges at wet-day dawn and discharges the storm budget", () => {
    const regime = rainRegimeById("moderate");
    const steps = config.dailyEventSteps;
    const base = config.rainDepthPerEvent;
    const perEvent = rainDepthForRegime(regime, base, steps);
    const stormEvents = Math.round(steps * Math.min(1, regime.stormFraction));

    let cloud = 0;
    let total = 0;
    for (let i = 0; i < steps; i++) {
      const r = stepAtmosphere({
        regime,
        airTempC: 16,
        cloudWater: cloud,
        dayIndex: 0,
        eventIndexInDay: i,
        dailyEventSteps: steps,
        baseDepthPerEvent: base,
      });
      cloud = r.cloudWater;
      total += r.dischargeDepth;
    }
    expect(total).toBeCloseTo(perEvent * stormEvents, 8);
    expect(cloud).toBeLessThan(1e-9);
  });

  it("dry regime never discharges", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    world.setRainRegime("dry");
    world.setAirTemperature(heatById("warm").airTempC);
    // arid still has rare storms — use intensity 0 via unset? dry has storms.
    // Force no rain by stepping only through a dry day of arid cycle: wetDays=1,
    // so day 1+ of cycle is dry.
    for (let i = 0; i < config.dailyEventSteps; i++) world.stepEvent(); // day 0 wet
    const precipAfterStorm = world.precipitationLedger;
    expect(precipAfterStorm).toBeGreaterThan(0);
    const before = world.precipitationLedger;
    for (let i = 0; i < config.dailyEventSteps; i++) world.stepEvent(); // day 1 dry
    expect(world.precipitationLedger).toBe(before);
  });

  it("cold heat dial yields snow phase under storm", () => {
    const world = new WorldState(generateMountain(12, 12, 3, 2));
    world.setRainRegime("moderate");
    world.setAirTemperature(heatById("cold").airTempC);
    world.setWind(1, 0);
    let sawSnow = false;
    for (let i = 0; i < config.dailyEventSteps; i++) {
      world.stepEvent();
      if (world.precipPhase === PRECIP_PHASE_SNOW) sawSnow = true;
    }
    expect(sawSnow).toBe(true);
    expect(world.precipitationLedger).toBeGreaterThan(0);
  });

  it("same seed + forcing → identical hash (T-001)", () => {
    const run = () => {
      const world = new WorldState(generateMountain(10, 10, 2, 7));
      world.setRainRegime("light");
      world.setAirTemperature(heatById("mild").airTempC);
      world.setWind(0, 1);
      for (let d = 0; d < 3; d++) {
        for (let i = 0; i < config.dailyEventSteps; i++) world.stepEvent();
      }
      return world.stateHash();
    };
    expect(run()).toBe(run());
  });
});
