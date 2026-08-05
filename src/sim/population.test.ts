import { describe, expect, it } from "vitest";
import { config } from "../config";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";
import {
  nextHerbivoreStage,
} from "./population/herbivoreDemography";
import {
  limbLengthOptimum,
  nextTraitMean,
  traitMismatchMortalityRate,
  webbingLatch,
} from "./population/herbivoreTraits";
import { turnoverFraction } from "./population/herbivoreTurnover";

// Envelope-exhaustion below is the E-006/E-009 survival-cost test (no
// adaptation without a mortality cost); grazing below is the N-005 test
// (a herbivore that never eats is decorative wildlife, C-027 §4.6.3).

/** Seed uniform good habitat/forage so density can actually grow (Grid2D fields default to 0). */
function seedHerbivoreHabitat(
  world: WorldState,
  hsi: number,
  forageKgM2: number,
): void {
  for (let z = 0; z < world.height; z++) {
    for (let x = 0; x < world.width; x++) {
      world.habitatSuitability.set(x, z, hsi);
      world.herbBiomass.set(x, z, forageKgM2);
    }
  }
}

/** Uniform extreme slope (checkerboard elevation) so limbLengthOptimum saturates far past the envelope everywhere, not just at a boundary. */
function seedExtremeSlope(world: WorldState): void {
  for (let z = 0; z < world.height; z++) {
    for (let x = 0; x < world.width; x++) {
      world.terrain.set(x, z, (x + z) % 2 === 0 ? 1000 : 0);
    }
  }
}

function seedFlatTerrain(world: WorldState): void {
  for (let z = 0; z < world.height; z++) {
    for (let x = 0; x < world.width; x++) {
      world.terrain.set(x, z, 10);
    }
  }
}

/** A1 carries no arrival/dispersal mechanism (that's a later slice's scope)
 * — a population starting at literal zero adults stays at zero forever
 * (births are proportional to standing adults). Tests of the demographic
 * law itself need a standing founder population to have anything to move. */
function seedFounderPopulation(world: WorldState, adultsPerKm2: number): void {
  for (let z = 0; z < world.height; z++) {
    for (let x = 0; x < world.width; x++) {
      world.herbivoreStageAdult.set(x, z, adultsPerKm2);
    }
  }
}

describe("A1 herbivore population (C-027 §3, BUILD_GUIDE §4.66)", () => {
  it("determinism: identical seed/state -> identical trajectory and render sample (T-001)", () => {
    const a = new WorldState(generateMountain(8, 8, 4, 1));
    const b = new WorldState(generateMountain(8, 8, 4, 1));
    seedHerbivoreHabitat(a, 0.8, 1.2);
    seedHerbivoreHabitat(b, 0.8, 1.2);
    for (let i = 0; i < 10; i++) {
      a.runPopulationsAnnualStep(1);
      a.runPopulationsSeasonalStep(1);
      b.runPopulationsAnnualStep(1);
      b.runPopulationsSeasonalStep(1);
    }
    expect(a.stateHash()).toBe(b.stateHash());
    expect(a.getHerbivoreDensity(4, 4)).toBe(b.getHerbivoreDensity(4, 4));
    expect(a.getHerbivoreLimbLength(4, 4)).toBe(b.getHerbivoreLimbLength(4, 4));
    expect(a.getHerbivoreWebbingSwap(4, 4)).toBe(b.getHerbivoreWebbingSwap(4, 4));
  });

  it("bounds stay in range across a multi-band run under favorable conditions (FieldRegistry.assertBounds)", () => {
    const world = new WorldState(generateMountain(8, 8, 4, 1));
    seedHerbivoreHabitat(world, 1, 2.5);
    expect(() => {
      for (let i = 0; i < 60; i++) {
        world.runPopulationsAnnualStep(1);
        world.runPopulationsSeasonalStep(1);
        world.registry.assertBounds("annual");
      }
    }).not.toThrow();
  });

  it("bounds stay in range even under an unmeetable pressure (extreme slope, envelope-exhaustion path)", () => {
    const world = new WorldState(generateMountain(8, 8, 4, 1));
    seedHerbivoreHabitat(world, 1, 2.5);
    seedExtremeSlope(world);
    expect(() => {
      for (let i = 0; i < 60; i++) {
        world.runPopulationsAnnualStep(1);
        world.registry.assertBounds("annual");
      }
    }).not.toThrow();
  });

  it("no fixed K: capacity tracks a perturbed forage input, not a stored constant (ES-006)", () => {
    const lowForage = new WorldState(generateMountain(8, 8, 4, 1));
    const highForage = new WorldState(generateMountain(8, 8, 4, 1));
    seedFlatTerrain(lowForage);
    seedFlatTerrain(highForage);
    // Below vs. well above config.herbivoreForageReferenceKgM2 (=1).
    seedHerbivoreHabitat(lowForage, 1, 0.05);
    seedHerbivoreHabitat(highForage, 1, 2.0);
    seedFounderPopulation(lowForage, 5);
    seedFounderPopulation(highForage, 5);
    for (let i = 0; i < 30; i++) {
      lowForage.runPopulationsAnnualStep(1);
      highForage.runPopulationsAnnualStep(1);
    }
    const low = lowForage.getHerbivoreDensity(4, 4);
    const high = highForage.getHerbivoreDensity(4, 4);
    expect(high).toBeGreaterThan(low);
    // Same forage input, re-run from scratch, must reproduce the same
    // capacity-derived density — nothing is a hidden stored constant.
    const highForageAgain = new WorldState(generateMountain(8, 8, 4, 1));
    seedFlatTerrain(highForageAgain);
    seedHerbivoreHabitat(highForageAgain, 1, 2.0);
    seedFounderPopulation(highForageAgain, 5);
    for (let i = 0; i < 30; i++) highForageAgain.runPopulationsAnnualStep(1);
    expect(highForageAgain.getHerbivoreDensity(4, 4)).toBe(high);
  });

  it("envelope-exhaustion: limbLength clamps at the species envelope and density declines rather than exceeding it", () => {
    const steep = new WorldState(generateMountain(8, 8, 4, 1));
    const gentle = new WorldState(generateMountain(8, 8, 4, 1));
    seedHerbivoreHabitat(steep, 1, 2.5);
    seedHerbivoreHabitat(gentle, 1, 2.5);
    seedExtremeSlope(steep);
    seedFlatTerrain(gentle);
    seedFounderPopulation(steep, 5);
    seedFounderPopulation(gentle, 5);

    // The raw demand genuinely exceeds the envelope on steep terrain — this
    // is the case traitMismatchMortalityRate must keep pricing even after
    // the trait pins at the edge.
    const steepOptimum = limbLengthOptimum(
      100,
      config.herbivoreSlopeReferenceRiseRun,
      config.herbivoreLimbLengthMin,
      config.herbivoreLimbLengthMax,
    );
    expect(steepOptimum).toBeGreaterThan(config.herbivoreLimbLengthMax);

    for (let i = 0; i < 60; i++) {
      steep.runPopulationsAnnualStep(1);
      gentle.runPopulationsAnnualStep(1);
    }

    // Trait mean never exceeds the species envelope regardless of demand.
    expect(steep.getHerbivoreLimbLength(4, 4)).toBeLessThanOrEqual(
      config.herbivoreLimbLengthMax,
    );
    // A population that cannot meet the place's demand declines relative to
    // one that can — the earned failure §3.3 asks for, not a free morph.
    expect(steep.getHerbivoreDensity(4, 4)).toBeLessThan(
      gentle.getHerbivoreDensity(4, 4),
    );
  });

  it("grazing write-back is an exact no-op at zero density (same discipline L2 proved)", () => {
    const world = new WorldState(generateMountain(8, 8, 4, 1));
    const control = new WorldState(generateMountain(8, 8, 4, 1));
    seedHerbivoreHabitat(world, 1, 2.0);
    seedHerbivoreHabitat(control, 1, 2.0);
    // Zero starting stock -> births stay zero (birthRate * adult(=0)), so
    // density stays exactly zero for the whole run without forcing it.
    for (let i = 0; i < 20; i++) {
      world.runPopulationsAnnualStep(1);
    }
    expect(world.getHerbivoreDensity(4, 4)).toBe(0);
    for (let z = 0; z < world.height; z++) {
      for (let x = 0; x < world.width; x++) {
        expect(world.getHerbBiomass(x, z)).toBe(control.getHerbBiomass(x, z));
      }
    }
  });

  it("grazing measurably reduces veg.biomass.herb once density is nonzero", () => {
    const world = new WorldState(generateMountain(8, 8, 4, 1));
    seedHerbivoreHabitat(world, 1, 2.0);
    // Seed a standing adult population directly (bypasses the slow birth
    // ramp) so grazing has something to act on within a few bands.
    for (let z = 0; z < world.height; z++) {
      for (let x = 0; x < world.width; x++) {
        world.herbivoreStageAdult.set(x, z, 10);
      }
    }
    const before = world.getHerbBiomass(4, 4);
    world.runPopulationsAnnualStep(1);
    expect(world.getHerbivoreDensity(4, 4)).toBeGreaterThan(0);
    expect(world.getHerbBiomass(4, 4)).toBeLessThan(before);
  });
});

describe("herbivore trait pure functions (population/*.ts)", () => {
  it("nextTraitMean clamps to the envelope even when pressureOptimum sits outside it", () => {
    const next = nextTraitMean({
      traitMean: 1.0,
      pressureOptimum: 5.0,
      traitRate: 1,
      envelopeMin: 0.85,
      envelopeMax: 1.25,
      dt: 100,
    });
    expect(next).toBe(1.25);
  });

  it("traitMismatchMortalityRate stays positive once the trait pins at the envelope edge", () => {
    const rate = traitMismatchMortalityRate(5.0, 1.25, 0.85, 1.25, 0.5);
    expect(rate).toBeGreaterThan(0);
  });

  it("webbingLatch is hysteretic — does not flicker at a single value between attach and detach", () => {
    let state: 0 | 1 = 0;
    // Rising through the gap between detach (0.3) and attach (0.5) must not
    // attach until the attach threshold itself is reached.
    state = webbingLatch({
      current: state,
      traitMean: 0.4,
      attachThreshold: 0.5,
      detachThreshold: 0.3,
    });
    expect(state).toBe(0);
    state = webbingLatch({
      current: state,
      traitMean: 0.5,
      attachThreshold: 0.5,
      detachThreshold: 0.3,
    });
    expect(state).toBe(1);
    // Falling back into the same gap must not detach until the detach
    // threshold — this is the flicker a bare single threshold would produce.
    state = webbingLatch({
      current: state,
      traitMean: 0.4,
      attachThreshold: 0.5,
      detachThreshold: 0.3,
    });
    expect(state).toBe(1);
  });

  it("turnoverFraction reads a fraction of standing density freshly matured, never a stored constant", () => {
    expect(turnoverFraction(0, 0)).toBe(0);
    expect(turnoverFraction(5, 20)).toBeCloseTo(0.25);
    expect(turnoverFraction(30, 20)).toBe(1); // clamped, never above 1
  });

  it("nextHerbivoreStage never produces births/growth beyond a computed capacity", () => {
    const result = nextHerbivoreStage({
      juvenile: 0,
      adult: 10,
      capacity: 10, // already at capacity -> headroom is 0
      maturationRate: 0.7,
      birthRatePerAdult: 0.6,
      adultMortalityRate: 0.15,
      mismatchMortalityRate: 0,
      dt: 1,
    });
    expect(result.juvenile).toBe(0);
  });
});
