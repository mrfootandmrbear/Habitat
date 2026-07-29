import { describe, expect, it } from "vitest";
import {
  DEEP_TIME_SIM_YEARS,
  p005LegacyDepthEffect,
  p005SaveAdvanceReloadHash,
} from "./deepTime";

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
