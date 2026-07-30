import { describe, expect, it } from "vitest";
import {
  RAIN_REGIMES,
  rainDepthForRegime,
  rainRegimeById,
  regimeRainsThisEvent,
} from "./climate/rainRegime";
import { elevChangeEncodingStrength, FormMemory } from "./formMemory";

describe("rainfall climate mean (Slice F / C-004)", () => {
  it("is a global mean intensity with no location arguments", () => {
    const wet = rainRegimeById("heavy");
    expect(wet.intensity).toBe(0.63);
    expect(wet.wetFraction).toBe(1);
    expect(wet.label).toBe("Rainfall: wet");
    expect(rainDepthForRegime(wet, 0.001)).toBeCloseTo(0.00063, 8);
    expect(rainDepthForRegime(rainRegimeById("dry"), 0.001)).toBe(0);
    expect(RAIN_REGIMES.every((r) => typeof r.intensity === "number")).toBe(
      true,
    );
  });

  it("non-arid climates rain every event (mean, not storm duty)", () => {
    const wet = rainRegimeById("heavy");
    const n = 96;
    let raining = 0;
    for (let i = 0; i < n; i++) {
      if (regimeRainsThisEvent(wet, i, n)) raining += 1;
    }
    expect(raining).toBe(n);
    expect(regimeRainsThisEvent(rainRegimeById("moderate"), 50, n)).toBe(true);
    expect(regimeRainsThisEvent(rainRegimeById("dry"), 0, n)).toBe(false);
  });
});

describe("form memory (Slice 8c return visit)", () => {
  it("reports elev deltas against a captured then", () => {
    const mem = new FormMemory();
    const then = new Float32Array([1, 2, 3, 4]);
    mem.capture(then, 2, 2);
    const now = new Float32Array([1, 1.5, 3.2, 4]);
    expect(mem.deltaAt(now, 1, 0)).toBeCloseTo(-0.5, 5);
    expect(mem.meanAbsDelta(now)).toBeCloseTo(0.175, 5);
  });

  it("elev encoding strength exceeds floor for a 2 cm landform change", () => {
    expect(elevChangeEncodingStrength(0.02)).toBeGreaterThan(0.15);
    expect(elevChangeEncodingStrength(0)).toBe(0);
  });
});
