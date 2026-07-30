import { describe, expect, it } from "vitest";
import {
  DEEP_TIME_SIM_YEARS,
  advanceDecadalBands,
  decadalBandsForYears,
  makeDeepTimeWorld,
  p005LegacyDepthEffect,
  p005SaveAdvanceReloadHash,
} from "./deepTime";

describe("H-004 deep-time conservation", () => {
  /**
   * The absolute residual wanders because water depth is stored f32: rain
   * injection and the flux step each round per cell per step, in opposite
   * directions and at comparable magnitude. It is a bounded random walk, not a
   * leak — it is non-monotonic across the horizon, so an absolute bound would
   * be both flaky and meaningless. The invariant that holds is relative to
   * throughput, which is the same bound `soil-water.test.ts` uses per §8.2.
   */
  it("relative water-balance residual stays inside the f32 storage bound over 100 sim-years", () => {
    const world = makeDeepTimeWorld();
    const bands = decadalBandsForYears(DEEP_TIME_SIM_YEARS);
    let worstRelative = 0;
    for (let b = 0; b < bands; b++) {
      advanceDecadalBands(world, 1);
      const relative =
        Math.abs(world.waterBalanceResidual()) /
        Math.max(1, world.precipitationLedger);
      worstRelative = Math.max(worstRelative, relative);
    }
    expect(world.precipitationLedger).toBeGreaterThan(0);
    expect(worstRelative).toBeLessThan(1e-4);
  });
});

describe("P-005 deep-time save criterion", () => {
  it("save → advance 100y → reload → advance matches hash", () => {
    const result = p005SaveAdvanceReloadHash();
    expect(result.match).toBe(true);
    expect(result.hashFirst).toBe(result.hashSecond);
  });

  it("legacy soil.depth from a save still drives thinner→faster production", () => {
    const result = p005LegacyDepthEffect();
    expect(result.thinGainedMore).toBe(true);
  });

  it("horizon is the stated P-005 window", () => {
    expect(DEEP_TIME_SIM_YEARS).toBe(100);
  });
});
