import { describe, expect, it } from "vitest";
import { config } from "../config";
import {
  applyGuildEstablishment,
  distanceToPreserveEdge,
  establishmentProbability,
  nextHerbBiomass,
  seedPressureAt,
  type GuildEstablishmentInputs,
} from "./habitat/arrivalComposition";
import { evaluateHsi } from "./habitat/hsiComposition";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";
import { applySave, omitField, serializeRegistry, SaveError } from "./save";

describe("arrival composition (Slice 12 / C-007)", () => {
  it("zero suitability yields zero establishment probability", () => {
    expect(establishmentProbability(40, 0, 0.08)).toBe(0);
    expect(establishmentProbability(0, 1, 0.08)).toBe(0);
  });

  it("improving the limiting HSI input raises arrival probability", () => {
    const porosity = config.soilPorosity;
    const depthRef = config.hsiDepthRefMeters;
    const gwRef = config.hsiGwRefMeters;
    // Moisture-limited: moisture low, depth and GW saturated.
    const base = evaluateHsi({
      moisture: 0.1 * porosity,
      soilDepth: depthRef,
      groundwater: gwRef,
      porosity,
      depthRef,
      gwRef,
    });
    expect(base.limiting).toBe(0);
    const betterMoisture = evaluateHsi({
      moisture: 0.4 * porosity,
      soilDepth: depthRef,
      groundwater: gwRef,
      porosity,
      depthRef,
      gwRef,
    });
    const betterDepth = evaluateHsi({
      moisture: 0.1 * porosity,
      soilDepth: depthRef * 2,
      groundwater: gwRef,
      porosity,
      depthRef,
      gwRef,
    });
    const seed = 40;
    const scale = config.herbEstablishmentScale;
    const pBase = establishmentProbability(seed, base.hsi, scale);
    const pMoist = establishmentProbability(seed, betterMoisture.hsi, scale);
    const pDepth = establishmentProbability(seed, betterDepth.hsi, scale);
    expect(pMoist).toBeGreaterThan(pBase);
    expect(pDepth).toBeCloseTo(pBase, 10);
  });

  it("seed pressure is highest at the edge and symmetric", () => {
    const w = 16;
    const h = 16;
    const edge = seedPressureAt(0, 8, w, h, 40, 8);
    const center = seedPressureAt(8, 8, w, h, 40, 8);
    expect(edge).toBeGreaterThan(center);
    expect(seedPressureAt(0, 8, w, h, 40, 8)).toBeCloseTo(
      seedPressureAt(15, 8, w, h, 40, 8),
      10,
    );
    expect(seedPressureAt(8, 0, w, h, 40, 8)).toBeCloseTo(
      seedPressureAt(8, 15, w, h, 40, 8),
      10,
    );
    expect(distanceToPreserveEdge(0, 0, w, h)).toBe(0);
    expect(distanceToPreserveEdge(8, 8, w, h)).toBe(7);
  });

  it("biomass stays bounded and finite; zero HSI blocks growth", () => {
    const grown = nextHerbBiomass({
      biomass: 0,
      seedBank: 40,
      habitatSuitability: 0.8,
      establishmentScale: 0.08,
      establishmentRate: 0.35,
      mortalityRate: 0.5,
      biomassMax: 2.5,
      dt: 1,
    });
    expect(grown).toBeGreaterThan(0);
    expect(grown).toBeLessThanOrEqual(2.5 * 0.8);
    expect(Number.isFinite(grown)).toBe(true);

    const blocked = nextHerbBiomass({
      biomass: 0,
      seedBank: 40,
      habitatSuitability: 0,
      establishmentScale: 0.08,
      establishmentRate: 0.35,
      mortalityRate: 0.5,
      biomassMax: 2.5,
      dt: 1,
    });
    expect(blocked).toBe(0);
  });
});

describe("guild establishment order-independence (§4.48, BUILD_GUIDE §2.1 Symmetry)", () => {
  it("processing guilds in a different order yields byte-identical biomass per guild", () => {
    // Six distinct specs — deliberately different biomass/seed/suitability/rate
    // per guild so a bug that accidentally shares or cross-wires state between
    // entries would show up as a mismatch, not pass by coincidence.
    const specs: GuildEstablishmentInputs[] = [
      {
        biomass: Float32Array.from([0.2, 1.5, 0]),
        seedBank: Float32Array.from([3, 0, 12]),
        suitability: Float32Array.from([0.8, 0.5, 0.1]),
        establishmentScale: 0.05,
        establishmentRate: 0.2,
        mortalityRate: 0.1,
        biomassMax: 3,
      },
      {
        biomass: Float32Array.from([0, 2.5, 0.4]),
        seedBank: Float32Array.from([10, 1, 0]),
        suitability: Float32Array.from([0.3, 0.9, 0]),
        establishmentScale: 0.02,
        establishmentRate: 0.4,
        mortalityRate: 0.05,
        biomassMax: 2,
      },
      {
        biomass: Float32Array.from([1.1, 0, 0.9]),
        seedBank: Float32Array.from([0, 6, 2]),
        suitability: Float32Array.from([0.6, 0.2, 0.75]),
        establishmentScale: 0.09,
        establishmentRate: 0.15,
        mortalityRate: 0.3,
        biomassMax: 1.5,
      },
      {
        biomass: Float32Array.from([0.05, 0.05, 5]),
        seedBank: Float32Array.from([20, 20, 0]),
        suitability: Float32Array.from([1, 0, 0.4]),
        establishmentScale: 0.12,
        establishmentRate: 0.5,
        mortalityRate: 0.2,
        biomassMax: 5,
      },
      {
        biomass: Float32Array.from([3, 0.2, 0.2]),
        seedBank: Float32Array.from([1, 8, 8]),
        suitability: Float32Array.from([0.15, 0.55, 0.55]),
        establishmentScale: 0.03,
        establishmentRate: 0.25,
        mortalityRate: 0.4,
        biomassMax: 4,
      },
      {
        biomass: Float32Array.from([0.6, 0.6, 0.6]),
        seedBank: Float32Array.from([4, 4, 4]),
        suitability: Float32Array.from([0.45, 0.45, 0.45]),
        establishmentScale: 0.07,
        establishmentRate: 0.1,
        mortalityRate: 0.6,
        biomassMax: 1,
      },
    ];

    const clone = (g: GuildEstablishmentInputs): GuildEstablishmentInputs => ({
      ...g,
      biomass: g.biomass.slice(),
    });

    const forward = specs.map(clone);
    const reversed = [...specs].reverse().map(clone);

    applyGuildEstablishment(forward, 1);
    applyGuildEstablishment(reversed, 1);

    // reversed[] holds the same six guilds in the opposite order — match each
    // guild back up by its original index and compare.
    for (let k = 0; k < specs.length; k++) {
      expect(Array.from(forward[k]!.biomass)).toEqual(
        Array.from(reversed[specs.length - 1 - k]!.biomass),
      );
    }
  });

  it("a guild never reads another guild's biomass, seed bank, or suitability", () => {
    // If guild 0 accidentally read guild 1's arrays, changing only guild 1's
    // inputs would move guild 0's result. It must not.
    const makeSpec = (): GuildEstablishmentInputs => ({
      biomass: Float32Array.from([0.5]),
      seedBank: Float32Array.from([5]),
      suitability: Float32Array.from([0.5]),
      establishmentScale: 0.05,
      establishmentRate: 0.2,
      mortalityRate: 0.1,
      biomassMax: 2,
    });

    const baseline = [makeSpec(), makeSpec()];
    applyGuildEstablishment(baseline, 1);

    const perturbed = [
      makeSpec(),
      {
        biomass: Float32Array.from([1.9]),
        seedBank: Float32Array.from([50]),
        suitability: Float32Array.from([1]),
        establishmentScale: 0.5,
        establishmentRate: 0.9,
        mortalityRate: 0.9,
        biomassMax: 2,
      },
    ];
    applyGuildEstablishment(perturbed, 1);

    expect(Array.from(perturbed[0]!.biomass)).toEqual(
      Array.from(baseline[0]!.biomass),
    );
  });
});

describe("mortality as a rate (Slice L3 / S-007)", () => {
  const max = 2.5;
  const base = {
    seedBank: 40,
    establishmentScale: 0.08,
    establishmentRate: 0.35,
    mortalityRate: config.herbMortalityRate,
    biomassMax: max,
    dt: 1,
  };

  /** Bands until biomass ≤ half of the starting value under collapsed HSI. */
  function bandsToHalf(
    start: number,
    hsi: number,
    mortalityRate: number,
  ): number {
    let b = start;
    const half = start * 0.5;
    for (let n = 1; n <= 200; n++) {
      b = nextHerbBiomass({
        ...base,
        biomass: b,
        habitatSuitability: hsi,
        mortalityRate,
      });
      if (b <= half) return n;
    }
    return Infinity;
  }

  it("HSI collapse leaves standing excess for at least one band (S-008)", () => {
    const after = nextHerbBiomass({
      ...base,
      biomass: max,
      habitatSuitability: 0.2,
    });
    const capacity = max * 0.2;
    // Old clamp would snap to capacity in one band; rate leaves excess.
    expect(after).toBeGreaterThan(capacity);
    expect(after).toBeLessThan(max);
  });

  it("short drought is ridden out; long drought is not", () => {
    const capacityLow = max * 0.2;
    // One band of collapse, then restore to HSI = 1.
    let short = max;
    short = nextHerbBiomass({
      ...base,
      biomass: short,
      habitatSuitability: 0.2,
    });
    short = nextHerbBiomass({
      ...base,
      biomass: short,
      habitatSuitability: 1,
    });
    // Still clearly above the drought capacity — meadow rode it out.
    expect(short).toBeGreaterThan(capacityLow + 0.5);

    let long = max;
    for (let i = 0; i < 8; i++) {
      long = nextHerbBiomass({
        ...base,
        biomass: long,
        habitatSuitability: 0.2,
      });
    }
    // Near the new capacity — prolonged drought took the stand.
    expect(long).toBeLessThan(capacityLow + 0.15);
    expect(long).toBeGreaterThanOrEqual(capacityLow);
  });

  it("time-to-half is finite and guild-ordered (crust < herb < shrub)", () => {
    const start = max;
    const hsi = 0.2;
    const crustBands = bandsToHalf(start, hsi, config.crustMortalityRate);
    const herbBands = bandsToHalf(start, hsi, config.herbMortalityRate);
    const shrubBands = bandsToHalf(start, hsi, config.shrubMortalityRate);
    expect(crustBands).toBeLessThan(Infinity);
    expect(herbBands).toBeLessThan(Infinity);
    expect(shrubBands).toBeLessThan(Infinity);
    expect(crustBands).toBeLessThan(herbBands);
    expect(herbBands).toBeLessThan(shrubBands);
  });

  it("recovery is slower than loss (asymmetry)", () => {
    const hsiLow = 0.2;
    const capacityLow = max * hsiLow;
    const lossBands = bandsToHalf(max, hsiLow, config.herbMortalityRate);
    expect(lossBands).toBeLessThan(Infinity);

    // Grow from the drought floor back toward full capacity at p ≈ 1.
    let b = capacityLow;
    const target = max * 0.5; // same half-mark, climbing
    let recoveryBands = Infinity;
    for (let n = 1; n <= 200; n++) {
      b = nextHerbBiomass({
        ...base,
        biomass: b,
        habitatSuitability: 1,
        // Saturated seed so establishment is not the limiter.
        seedBank: 1e6,
      });
      if (b >= target) {
        recoveryBands = n;
        break;
      }
    }
    expect(recoveryBands).toBeLessThan(Infinity);
    expect(recoveryBands).toBeGreaterThan(lossBands);
  });

  it("capacity stays biomassMax · HSI — no fixed K (ES-006)", () => {
    // At HSI = 0.4, decline is never above 1.0 even from a high start.
    let b = max;
    for (let i = 0; i < 40; i++) {
      b = nextHerbBiomass({
        ...base,
        biomass: b,
        habitatSuitability: 0.4,
        mortalityRate: 1,
      });
    }
    expect(b).toBeCloseTo(max * 0.4, 5);
  });
});

describe("arrival WorldState (Slice 12)", () => {
  it("registers seed bank, establishment, and herb biomass with owners", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    expect(world.registry.get("veg.seedBank.herb").owner).toBe("dispersal");
    expect(world.registry.get("veg.seedBank.herb").legacy).toBe(true);
    expect(world.registry.get("veg.establishment.herb").owner).toBe(
      "dispersal",
    );
    expect(world.registry.get("veg.biomass.herb").owner).toBe("vegetation");
    expect(world.registry.get("veg.biomass.herb").band).toBe("seasonal");
  });

  it("boots perimeter seed pressure without ambient randomness", () => {
    const world = new WorldState(generateMountain(12, 12, 3, 2));
    expect(world.getHerbSeedBank(0, 6)).toBeGreaterThan(
      world.getHerbSeedBank(6, 6),
    );
  });

  it("same seed + forcing → identical arrival hash", () => {
    const run = () => {
      const world = new WorldState(generateMountain(16, 16, 4, 7));
      for (let z = 0; z < 16; z++) {
        for (let x = 0; x < 16; x++) {
          world.soilMoisture.set(x, z, 0.2);
          world.groundwaterStorage.set(x, z, 0.1);
        }
      }
      world.runHabitatStep(1);
      world.runDispersalStep(1);
      for (let i = 0; i < 4; i++) world.runHerbEstablishmentStep(1);
      return world.stateHash();
    };
    expect(run()).toBe(run());
  });

  it("suitable wet patch accumulates biomass; dry patch does not", () => {
    const world = new WorldState(generateMountain(12, 12, 3, 3));
    world.vegCover.fill(0);
    // Wet suitable cell near edge (high seed + high HSI).
    world.soilMoisture.set(1, 6, config.soilPorosity * 0.5);
    world.groundwaterStorage.set(1, 6, config.hsiGwRefMeters);
    world.soilDepth.set(1, 6, config.hsiDepthRefMeters);
    // Dry unsuitable interior cell.
    world.soilMoisture.set(6, 6, 0);
    world.groundwaterStorage.set(6, 6, 0);
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 6; i++) world.runHerbEstablishmentStep(1);
    expect(world.getHerbBiomass(1, 6)).toBeGreaterThan(0.05);
    expect(world.getHerbBiomass(6, 6)).toBe(0);
    expect(world.getHabitatSuitability(6, 6)).toBe(0);
  });

  it("establishment step doesn't recompute guild suitability — frozen at what dispersal committed (§4.48)", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 4));
    // Mid-crest exposure (0.5) sits at the peak of the binder's exposure
    // hump (factorCrestExposure) — a clearly nonzero HSI to start from.
    world.shoreExposure.fill(0.5);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    const before = world.binderSuitability.get(3, 3);
    expect(before).toBeGreaterThan(0);

    // Mutate exactly the raw inputs the old (recompute-every-tick)
    // implementation would have read live — exposure 0 sits at the hump's
    // zero edge, so a live recompute would drop binder HSI to 0. If
    // runHerbEstablishmentStep still recomputed guild HSI itself, this
    // would move binderSuitability — it must not, since only
    // runDispersalStep (annual band) writes this field.
    world.shoreExposure.fill(0);
    world.soilMoisture.fill(0);
    world.runHerbEstablishmentStep(1);

    expect(world.binderSuitability.get(3, 3)).toBe(before);
  });

  it("rejects saves that omit legacy seed bank", () => {
    const world = new WorldState(generateMountain(4, 4, 2, 1));
    const doc = omitField(
      serializeRegistry(world.registry),
      "veg.seedBank.herb",
    );
    expect(() => applySave(world.registry, doc)).toThrow(SaveError);
  });

  it("round-trips herb biomass and seed bank", () => {
    const world = new WorldState(generateMountain(8, 8, 3, 1));
    world.herbBiomass.set(2, 2, 0.4);
    world.herbSeedBank.set(2, 2, 12);
    const doc = serializeRegistry(world.registry);
    const other = new WorldState(generateMountain(8, 8, 3, 1));
    applySave(other.registry, doc);
    expect(other.getHerbBiomass(2, 2)).toBeCloseTo(0.4, 5);
    expect(other.getHerbSeedBank(2, 2)).toBeCloseTo(12, 5);
  });
});
