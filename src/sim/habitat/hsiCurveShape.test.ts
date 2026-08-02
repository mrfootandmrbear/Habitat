/**
 * §4.46 — HSI curve-shape corrections.
 * Each corrected arm is unimodal or threshold-shaped, bounded [0,1], and the
 * named edge cases (MHW step, burial inversion, crust moisture, etc.) no
 * longer produce the backwards results the vegetation/habitat review listed.
 */
import { describe, expect, it } from "vitest";
import { config } from "../../config";
import {
  factorBurialTolerance,
  factorCrestExposure,
  factorSandSubstrate,
  longshoreTransportDivergence,
} from "./binderHsiComposition";
import {
  factorMoisture,
  factorMoistureCrust,
  triangularHump,
} from "./hsiComposition";
import {
  factorInundationMarsh,
  factorInundationUpland,
} from "./inundationComposition";
import { factorSalinity, factorSalinityTolerant } from "./salinityComposition";
import { factorShore } from "./strandHsiComposition";
import { factorTemperature } from "./temperatureComposition";
import { SUBSTRATE_LOAM, SUBSTRATE_SAND } from "../terrain/substrates";

function assertBounded01(v: number): void {
  expect(v).toBeGreaterThanOrEqual(0);
  expect(v).toBeLessThanOrEqual(1);
}

function assertUnimodal(
  samples: number[],
  values: number[],
  peakAt: number,
): void {
  const peakIdx = samples.findIndex((x) => Math.abs(x - peakAt) < 1e-9);
  expect(peakIdx).toBeGreaterThanOrEqual(0);
  const peakVal = values[peakIdx]!;
  for (let i = 0; i < peakIdx; i++) {
    expect(values[i]!).toBeLessThanOrEqual(peakVal + 1e-9);
    if (i > 0) expect(values[i]!).toBeGreaterThanOrEqual(values[i - 1]! - 1e-9);
  }
  for (let i = peakIdx + 1; i < values.length; i++) {
    expect(values[i]!).toBeLessThanOrEqual(peakVal + 1e-9);
    expect(values[i]!).toBeLessThanOrEqual(values[i - 1]! + 1e-9);
  }
}

describe("§4.46 HSI curve shapes", () => {
  it("triangularHump peaks at the named mode and stays in [0,1]", () => {
    expect(triangularHump(0.5, 0.5)).toBe(1);
    expect(triangularHump(0, 0.5)).toBe(0);
    expect(triangularHump(1, 0.5)).toBe(0);
    assertBounded01(triangularHump(0.25, 0.5));
  });

  it("upland inundation tapers across MHW instead of a hard step", () => {
    expect(factorInundationUpland(0)).toBe(1);
    // Millimetre into the envelope — was 0 under the hard step; now near 1.
    expect(factorInundationUpland(0.01)).toBeGreaterThan(0.9);
    expect(factorInundationUpland(0.25)).toBeCloseTo(0.5, 8);
    expect(factorInundationUpland(0.5)).toBe(0);
    expect(factorInundationUpland(1)).toBe(0);
    // Marsh hump still peaks mid-band; upland is the dry-side mirror.
    expect(factorInundationMarsh(0.5)).toBe(1);
    expect(factorInundationUpland(0)).toBe(1);
  });

  it("intolerant salinity is threshold-slope with a low plateau", () => {
    const plateau = config.herbSalinityFullThrough;
    expect(factorSalinity(0)).toBe(1);
    expect(factorSalinity(plateau)).toBe(1);
    expect(factorSalinity(plateau * 0.5)).toBe(1);
    expect(factorSalinity(1)).toBe(0);
    // Same shape family as the tolerant arm, lower plateau.
    expect(factorSalinity(0.85, plateau)).toBeLessThan(
      factorSalinityTolerant(0.85),
    );
    assertBounded01(factorSalinity(0.5));
  });

  it("temperature has a right-skewed upper limb (unimodal TPC)", () => {
    const kill = -4;
    const opt = 12;
    const crit = opt + 1.5 * (opt - kill); // 36
    expect(factorTemperature(kill, kill, opt)).toBe(0);
    expect(factorTemperature(opt, kill, opt)).toBe(1);
    expect(factorTemperature(crit, kill, opt)).toBe(0);
    // Above opt is no longer stuck at 1.
    expect(factorTemperature(opt + 5, kill, opt)).toBeLessThan(1);
    expect(factorTemperature(opt + 5, kill, opt)).toBeGreaterThan(0);
    // Right-skew: distance kill→opt is shorter than opt→crit.
    expect(opt - kill).toBeLessThan(crit - opt);
    const xs = [kill, (kill + opt) / 2, opt, (opt + crit) / 2, crit];
    const ys = xs.map((t) => factorTemperature(t, kill, opt));
    assertUnimodal(xs, ys, opt);
    for (const y of ys) assertBounded01(y);
  });

  it("herb moisture has a wet-side penalty; crust peaks low–moderate", () => {
    const por = config.soilPorosity;
    expect(factorMoisture(por * 0.5, por)).toBe(1);
    expect(factorMoisture(0, por)).toBe(0);
    expect(factorMoisture(por, por)).toBe(0); // saturation no longer optimal
    expect(factorMoistureCrust(por * 0.25, por)).toBe(1);
    expect(factorMoistureCrust(0, por)).toBe(0); // bone-dry kills crust
    // Crust at saturation is worse than at its arid peak.
    expect(factorMoistureCrust(por, por)).toBeLessThan(
      factorMoistureCrust(por * 0.25, por),
    );
    // Crust prefers drier fill than herb.
    expect(factorMoistureCrust(por * 0.25, por)).toBeGreaterThan(
      factorMoisture(por * 0.25, por),
    );
  });

  it("binder burial is a hump on accretion; uniform drift is zero pressure", () => {
    const opt = config.binderBurialOptimum;
    expect(factorBurialTolerance(0)).toBeCloseTo(triangularHump(0, opt), 8);
    expect(factorBurialTolerance(0)).toBeLessThan(1); // zero burial is not maximal
    expect(factorBurialTolerance(-opt)).toBe(1); // convergence = −div
    expect(factorBurialTolerance(-1)).toBeLessThan(1); // extreme accretion limits
    // Uniform longshore field → divergence 0 on every interior cell.
    const w = 5;
    const h = 5;
    const field = new Float32Array(w * h).fill(0.7);
    for (let i = 0; i < field.length; i++) {
      expect(longshoreTransportDivergence(field, i, w, h)).toBe(0);
    }
    // Moderate convergence near the burial optimum raises suitability vs calm.
    expect(factorBurialTolerance(-opt)).toBeGreaterThan(
      factorBurialTolerance(0),
    );
    const converging = new Float32Array(w * h);
    converging[1 * w + 1] = opt; // west of centre
    converging[1 * w + 3] = -opt; // east → ∂Q/∂x < 0 → convergence
    const div = longshoreTransportDivergence(converging, 1 * w + 2, w, h);
    expect(div).toBeLessThan(0);
    expect(-div).toBeCloseTo(opt, 7);
    expect(factorBurialTolerance(div)).toBeCloseTo(1, 7);
  });

  it("strand/binder exposure is a destructive-limb hump", () => {
    expect(factorShore(0)).toBe(0);
    expect(factorShore(0.5)).toBe(1);
    expect(factorShore(1)).toBe(0);
    expect(factorCrestExposure(0)).toBe(0);
    expect(factorCrestExposure(0.5)).toBe(1);
    expect(factorCrestExposure(1)).toBe(0);
  });

  it("factorSandSubstrate is clamp01-bounded including loam config", () => {
    expect(factorSandSubstrate(SUBSTRATE_SAND)).toBe(1);
    expect(factorSandSubstrate(SUBSTRATE_LOAM)).toBe(
      clamp01Like(config.binderLoamSandFactor),
    );
    assertBounded01(factorSandSubstrate(SUBSTRATE_LOAM));
    assertBounded01(factorSandSubstrate(99));
  });
});

function clamp01Like(x: number): number {
  return Math.min(1, Math.max(0, x));
}
