import { describe, expect, it } from "vitest";
import { config } from "../config";
import {
  RAIN_REGIMES,
  rainDailyMeanDepth,
  rainDepthForRegime,
  rainRegimeById,
  regimeIsWetDay,
  regimeRainsThisEvent,
} from "./climate/rainRegime";
import { elevChangeEncodingStrength, FormMemory } from "./formMemory";

describe("rainfall climate archetypes (C-004 / C-020 / Slice R)", () => {
  it("exposes global regimes with no location arguments", () => {
    const wet = rainRegimeById("heavy");
    expect(wet.label).toBe("Rainfall: wet");
    expect(wet.wetDays).toBeGreaterThan(1);
    expect(wet.cycleDays).toBeGreaterThan(wet.wetDays);
    expect(rainDepthForRegime(rainRegimeById("dry"), 0.001, 96)).toBeGreaterThan(
      0,
    );
    expect(RAIN_REGIMES.every((r) => r.cycleDays >= r.wetDays)).toBe(true);
  });

  it("arid is rare desert storms, not a daily faucet", () => {
    const arid = rainRegimeById("dry");
    let wetDays = 0;
    for (let d = 0; d < arid.cycleDays; d++) {
      if (regimeIsWetDay(arid, d)) wetDays += 1;
    }
    expect(wetDays).toBe(1);
    expect(regimeRainsThisEvent(arid, 0, 96, 0)).toBe(true);
    expect(regimeRainsThisEvent(arid, 0, 96, 1)).toBe(false);
  });

  it("wet is a monsoon block — contiguous wet days then dry", () => {
    const wet = rainRegimeById("heavy");
    for (let d = 0; d < wet.wetDays; d++) {
      expect(regimeIsWetDay(wet, d)).toBe(true);
    }
    expect(regimeIsWetDay(wet, wet.wetDays)).toBe(false);
    const n = 96;
    const stormEnd = Math.round(n * wet.stormFraction);
    expect(regimeRainsThisEvent(wet, 0, n, 0)).toBe(true);
    expect(regimeRainsThisEvent(wet, stormEnd - 1, n, 0)).toBe(true);
    expect(regimeRainsThisEvent(wet, stormEnd + 1, n, 0)).toBe(false);
  });

  it("cycle means track real-world annual budgets, not cartoon flood rates", () => {
    const n = config.dailyEventSteps;
    const base = config.rainDepthPerEvent;
    for (const id of ["dry", "light", "moderate", "heavy"] as const) {
      const regime = rainRegimeById(id);
      const meanM = rainDailyMeanDepth(regime, base, n);
      const meanMm = meanM * 1000;
      const annualMm = meanMm * 365;
      // Within ~2% of the documented annual target.
      expect(annualMm).toBeGreaterThan(regime.annualMmApprox * 0.98);
      expect(annualMm).toBeLessThan(regime.annualMmApprox * 1.02);
    }
    // Desert must stay arid-scale — old bug was ~3500 mm/yr.
    expect(rainRegimeById("dry").annualMmApprox).toBeLessThan(400);
    expect(rainRegimeById("heavy").annualMmApprox).toBeGreaterThan(1500);
  });

  it("conserves cycle-mean vs intensity · base · events/day", () => {
    const n = 96;
    const base = 0.001;
    for (const id of ["dry", "light", "moderate", "heavy"] as const) {
      const regime = rainRegimeById(id);
      const mean = rainDailyMeanDepth(regime, base, n);
      const target = regime.intensity * base * n;
      expect(mean).toBeCloseTo(target, 8);
    }
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
