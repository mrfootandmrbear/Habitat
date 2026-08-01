import { describe, expect, it } from "vitest";
import { config } from "../config";
import { heatById } from "./climate/atmosphere";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";

describe("event-band gate integration (L7)", () => {
  it("advances simMinutes across skipped spans", () => {
    const world = new WorldState(generateMountain(12, 12, 3, 7), {
      closedBoundary: true,
    });
    world.setRainRegime("dry");
    world.setAirTemperature(heatById("warm").airTempC);
    // Dry regime: long gaps; after any initial wet day, gate should sleep.
    for (let i = 0; i < config.dailyEventSteps * 3; i++) {
      world.stepEvent();
    }
    expect(world.simMinutes).toBe(config.dailyEventSteps * 3 * config.eventDtMinutes);
    expect(world.eventBandSkippedSteps).toBeGreaterThan(0);
  });

  it("gated and ungated stay hash-identical across a wet→dry→wet span", () => {
    const days = 16;
    const run = (gating: boolean) => {
      const world = new WorldState(generateMountain(16, 16, 4, 11), {
        closedBoundary: true,
        windUx: 1,
        windUz: 0,
      });
      world.setEventBandGating(gating);
      world.setRainRegime("light");
      world.setAirTemperature(heatById("warm").airTempC);
      for (let d = 0; d < days; d++) {
        for (let i = 0; i < config.dailyEventSteps; i++) world.stepEvent();
      }
      return world;
    };
    const gated = run(true);
    const ungated = run(false);
    expect(gated.stateHash()).toBe(ungated.stateHash());
    expect(gated.simMinutes).toBe(ungated.simMinutes);
    expect(gated.eventBandSkippedSteps).toBeGreaterThan(0);
    expect(ungated.eventBandSkippedSteps).toBe(0);
  });
});
