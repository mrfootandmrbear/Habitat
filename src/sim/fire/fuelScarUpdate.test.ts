import { describe, expect, it } from "vitest";
import { config } from "../../config";
import { nextFireScar, nextFuelLoad } from "./fuelScarUpdate";

describe("fuel/scar analytic update (§4.45)", () => {
  it("fuel at fixed sim-time is invariant to one large vs many small steps", () => {
    const I = config.fuelInputMax; // cover = 1
    const k = config.fuelDecayK;
    const max = config.fuelLoadMax;
    const T = 12;
    let one = 0;
    one = nextFuelLoad(one, I, k, T, max);
    let many = 0;
    for (let i = 0; i < 12; i++) {
      many = nextFuelLoad(many, I, k, 1, max);
    }
    expect(Math.abs(one - many)).toBeLessThan(1e-9);
    // Equilibrium is I/k, not I·dt.
    const eq = I / k;
    expect(one).toBeLessThan(eq + 1e-6);
    expect(one).toBeGreaterThan(eq * (1 - Math.exp(-k * T)) - 1e-6);
  });

  it("fuel does not pin at fuelLoadMax solely because dt is large", () => {
    const I = config.fuelInputMax * 0.5;
    const k = config.fuelDecayK;
    const max = config.fuelLoadMax;
    // Old Euler with k clamped to 1 and input = I·dt would grow without bound.
    const huge = nextFuelLoad(0, I, k, 1 / k + 10, max);
    const eq = I / k;
    expect(huge).toBeLessThan(eq + 1e-6);
    expect(huge).toBeLessThan(max);
  });

  it("scar at fixed sim-time is invariant to step size and never hard-zeroes mid-fade", () => {
    const k = config.fireScarDecayK;
    const T = 20; // Euler hard-zeroed at dt ≥ 12.5
    const one = nextFireScar(1, k, T);
    let many = 1;
    for (let i = 0; i < 20; i++) {
      many = nextFireScar(many, k, 1);
    }
    expect(Math.abs(one - many)).toBeLessThan(1e-9);
    expect(one).toBeGreaterThan(0);
    expect(one).toBeCloseTo(Math.exp(-k * T), 10);
  });
});
