import { describe, expect, it } from "vitest";
import { config } from "../config";
import {
  distanceToPreserveEdge,
  establishmentProbability,
  nextHerbBiomass,
  seedPressureAt,
} from "./habitat/arrivalComposition";
import { evaluateHsi } from "./habitat/hsiComposition";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";
import {
  applySave,
  omitField,
  serializeRegistry,
  SaveError,
} from "./save";

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
      biomassMax: 2.5,
      dt: 1,
    });
    expect(grown).toBeGreaterThan(0);
    expect(grown).toBeLessThanOrEqual(2.5 * 0.8);
    expect(Number.isFinite(grown)).toBe(true);

    const blocked = nextHerbBiomass({
      biomass: 0.5,
      seedBank: 40,
      habitatSuitability: 0,
      establishmentScale: 0.08,
      establishmentRate: 0.35,
      biomassMax: 2.5,
      dt: 1,
    });
    expect(blocked).toBe(0);
  });
});

describe("arrival WorldState (Slice 12)", () => {
  it("registers seed bank, establishment, and herb biomass with owners", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    expect(world.registry.get("veg.seedBank.herb").owner).toBe("dispersal");
    expect(world.registry.get("veg.seedBank.herb").legacy).toBe(true);
    expect(world.registry.get("veg.establishment.herb").owner).toBe("dispersal");
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
    world.soilMoisture.set(1, 6, config.soilPorosity);
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
