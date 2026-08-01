import { describe, expect, it } from "vitest";
import { fluxStep } from "./hydrology/fluxStep";

/**
 * §4.50 — hydrology/geomorphology review §2: `fluxStep`'s per-face flux had
 * no cap relative to the head difference driving it, so two deep adjacent
 * columns with a modest head difference could equalize past level and
 * reverse sign next step (checkerboard sloshing). Separately, roughness had
 * no floor, so a degenerate (zero/uninitialized) cell could run at up to
 * 300x base flow. Both are fixed inside `fluxStep` itself; these tests
 * exercise the fix directly rather than through `WorldState`.
 */
describe("fluxStep — surface-flux stability guard (§4.50)", () => {
  const flatTerrain = () => new Float32Array(2);

  it("equalizes a two-column head difference exactly, without overshoot, at a rate far beyond anything the game currently offers", () => {
    const water = new Float32Array([2.0, 0.6]);
    const delta = new Float32Array(2);
    // flowRate 10 / dt 1 is ~64x production (flowRate 0.156, eventFluxDt 1) —
    // deliberately far past today's fastest offered rate, to prove the bound
    // is structural rather than merely unreached by current tuning.
    fluxStep(2, 1, flatTerrain(), water, delta, 1, 10, 0.5);
    expect(water[0]).toBeCloseTo(1.3, 5);
    expect(water[1]).toBeCloseTo(1.3, 5);
  });

  it("stays at equilibrium over repeated steps instead of sloshing back and forth", () => {
    const water = new Float32Array([2.0, 0.6]);
    const delta = new Float32Array(2);
    for (let step = 0; step < 5; step++) {
      fluxStep(2, 1, flatTerrain(), water, delta, 1, 10, 0.5);
    }
    expect(water[0]).toBeCloseTo(1.3, 5);
    expect(water[1]).toBeCloseTo(1.3, 5);
  });

  it("the pre-fix (uncapped) formula does overshoot and reverse sign every step — the regression this closes", () => {
    // Reproduces the old per-face formula (`diff * localFlow * dt`, no CFL
    // cap) locally, not in production code, to demonstrate why the bound
    // above is load-bearing rather than incidental.
    function naiveStep(
      a: number,
      b: number,
      flowRate: number,
      dt: number,
      maxOutflowFraction: number,
    ): [number, number] {
      const diff = a - b;
      if (diff === 0) return [a, b];
      const from = diff > 0 ? a : b;
      const d = Math.abs(diff) * flowRate * dt;
      const available = from * Math.min(1, maxOutflowFraction);
      const scale = Math.min(1, available / d);
      const out = d * scale;
      return diff > 0 ? [a - out, b + out] : [a + out, b - out];
    }

    let a = 2.0;
    let b = 0.6;
    const signs: number[] = [];
    for (let step = 0; step < 3; step++) {
      [a, b] = naiveStep(a, b, 10, 1, 0.5);
      signs.push(Math.sign(a - b));
    }
    expect(signs[0]).not.toBe(signs[1]);
    expect(signs[1]).not.toBe(signs[2]);
  });

  it("floors a degenerate (zero) roughness cell at baseRoughness instead of a runaway rate", () => {
    const baseRoughness = 0.03;
    const withZeroRoughness = new Float32Array([1.0, 0.2]);
    const withNoRoughness = new Float32Array([1.0, 0.2]);

    fluxStep(
      2,
      1,
      flatTerrain(),
      withZeroRoughness,
      new Float32Array(2),
      1,
      0.156,
      0.5,
      undefined,
      new Float32Array([0, 0]),
      baseRoughness,
    );
    fluxStep(
      2,
      1,
      flatTerrain(),
      withNoRoughness,
      new Float32Array(2),
      1,
      0.156,
      0.5,
      undefined,
      undefined,
      baseRoughness,
    );

    expect(withZeroRoughness[0]).toBeCloseTo(withNoRoughness[0], 5);
    expect(withZeroRoughness[1]).toBeCloseTo(withNoRoughness[1], 5);
  });

  it("floors against the float32 rounding of baseRoughness, not the raw f64 constant (regression: this broke the T-001 golden hash during development)", () => {
    // WorldState.runVegetationStep writes `baseRoughness + physical *
    // vegRoughnessBonus` into `surface.roughness`, a Float32Array. At
    // physical = 0 (ordinary bare ground) that's exactly baseRoughness in
    // f64 arithmetic — but storing an f64 0.03 into a Float32Array rounds to
    // a hair below the f64 constant, so a floor written against the raw
    // constant misfires on every ordinary bare-ground cell, not just a
    // genuinely degenerate input. This is exactly what happened when this
    // slice was first written: it moved the T-001 golden hash and every
    // aNorm-adjacent probe by ~1e-9 for no physical reason.
    const baseRoughness = 0.03;
    const stored = new Float32Array(1);
    stored[0] = baseRoughness;

    expect(stored[0]).toBeLessThan(baseRoughness);
    expect(Math.max(stored[0]!, Math.fround(baseRoughness))).toBe(stored[0]);
    expect(Math.max(stored[0]!, baseRoughness)).not.toBe(stored[0]);
  });
});
