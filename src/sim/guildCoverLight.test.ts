import { describe, expect, it } from "vitest";
import { config } from "../config";
import {
  combineCoverFractions,
  physicalCoverFrom,
} from "./habitat/arrivalComposition";
import { canopyCoverFraction } from "./habitat/crustHsiComposition";
import { evaluateLight } from "./vegetation/lightCompetition";

describe("§4.47 guild cover — product-complement combination", () => {
  it("three guilds at 40% independent cover combine to ≈0.78, not 1.0", () => {
    expect(combineCoverFractions([0.4, 0.4, 0.4])).toBeCloseTo(0.784, 6);
  });

  it("additive sum would have clamped to 1 — product-complement does not", () => {
    // 0.4 + 0.4 + 0.4 = 1.2 → additive clamp = 1.0; product-complement = 0.784.
    expect(combineCoverFractions([0.4, 0.4, 0.4])).toBeLessThan(0.99);
  });

  it("physicalCoverFrom stacks three 40% guilds by product-complement", () => {
    const cover = physicalCoverFrom(
      0, // veg.cover
      0.4 * config.herbBiomassMax,
      config.herbBiomassMax,
      0.4 * config.strandBiomassMax,
      config.strandBiomassMax,
      0.4 * config.binderBiomassMax,
      config.binderBiomassMax,
      // marsh / shrub / crust absent
    );
    expect(cover).toBeCloseTo(0.784, 5);
  });

  it("canopyCoverFraction stacks three 40% guilds by product-complement", () => {
    const canopy = canopyCoverFraction({
      herbBiomass: 0.4 * config.herbBiomassMax,
      herbBiomassMax: config.herbBiomassMax,
      strandBiomass: 0.4 * config.strandBiomassMax,
      strandBiomassMax: config.strandBiomassMax,
      binderBiomass: 0.4 * config.binderBiomassMax,
      binderBiomassMax: config.binderBiomassMax,
    });
    expect(canopy).toBeCloseTo(0.784, 5);
  });

  it("stays monotone past the additive saturation point", () => {
    // Additive clamp would report 1.0 for both; product-complement keeps rising.
    const four = combineCoverFractions([0.4, 0.4, 0.4, 0.4]);
    const three = combineCoverFractions([0.4, 0.4, 0.4]);
    expect(four).toBeGreaterThan(three);
    expect(four).toBeLessThan(1);
  });

  it("bounded in [0,1] and empty stack is zero", () => {
    expect(combineCoverFractions([])).toBe(0);
    expect(combineCoverFractions([1, 0.5, 0.2])).toBe(1);
    expect(combineCoverFractions([1.5, -0.3])).toBe(1);
  });
});

describe("§4.47 Beer–Lambert-consistent LAI — no transmission floor", () => {
  it("full cover produces near-zero transmitted light, not the exp(−k·maxLAI) floor", () => {
    const incoming = 0.8;
    const floor =
      incoming *
      Math.exp(-config.lightExtinctionCoefficient * config.vegMaxLeafAreaIndex);
    expect(floor).toBeGreaterThan(0.03); // the old linear-LAI floor was real

    const full = evaluateLight(incoming, 1);
    expect(full.understoryLight).toBe(0);
    expect(full.understoryLight).toBeLessThan(floor);

    const nearFull = evaluateLight(incoming, 0.99);
    expect(nearFull.understoryLight).toBeLessThan(floor);
  });

  it("transmitted light follows the inverse-LAI identity I₀(1−cover)", () => {
    const incoming = 0.7;
    for (const cover of [0, 0.25, 0.5, 0.75, 0.9]) {
      const sample = evaluateLight(incoming, cover);
      expect(sample.understoryLight).toBeCloseTo(incoming * (1 - cover), 6);
    }
  });

  it("reported LAI is the clamped inverse form and stays within its registered bound", () => {
    const k = config.lightExtinctionCoefficient;
    const mid = evaluateLight(1, 0.5);
    expect(mid.leafAreaIndex).toBeCloseTo(-Math.log(0.5) / k, 6);

    const full = evaluateLight(1, 1);
    expect(Number.isFinite(full.leafAreaIndex)).toBe(true);
    expect(full.leafAreaIndex).toBeLessThanOrEqual(config.vegMaxLeafAreaIndex);
    expect(full.leafAreaIndex).toBeGreaterThanOrEqual(0);
  });
});
