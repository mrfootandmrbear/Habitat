import { describe, expect, it } from "vitest";
import {
  RAIN_REGIMES,
  rainDepthForRegime,
  rainRegimeById,
  regimeRainsThisEvent,
} from "./climate/rainRegime";
import { elevChangeEncodingStrength, FormMemory } from "./formMemory";

describe("rain regime (Slice 8c / C-004, C-003 authored)", () => {
  it("is a global intensity with no location arguments", () => {
    const heavy = rainRegimeById("heavy");
    expect(heavy.intensity).toBe(1.4);
    expect(heavy.wetFraction).toBe(0.45);
    expect(rainDepthForRegime(heavy, 0.001)).toBeCloseTo(0.0014, 8);
    expect(rainDepthForRegime(rainRegimeById("dry"), 0.001)).toBe(0);
    // API surface: regime + base depth only — no x/z (THESIS §9).
    expect(RAIN_REGIMES.every((r) => typeof r.intensity === "number")).toBe(
      true,
    );
  });

  it("front-loads wet events within a day (storm pulse)", () => {
    const heavy = rainRegimeById("heavy");
    const n = 96;
    let wet = 0;
    for (let i = 0; i < n; i++) {
      if (regimeRainsThisEvent(heavy, i, n)) wet += 1;
    }
    expect(wet).toBe(Math.round(n * 0.45));
    expect(regimeRainsThisEvent(heavy, 0, n)).toBe(true);
    expect(regimeRainsThisEvent(heavy, wet, n)).toBe(false);
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
