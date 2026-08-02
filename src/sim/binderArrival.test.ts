import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import {
  BINDER_LIMITING_BURIAL,
  BINDER_LIMITING_DRAINAGE,
  BINDER_LIMITING_EXPOSURE,
  BINDER_LIMITING_SAND,
  evaluateBinderHsi,
  factorBurialTolerance,
  factorDrainage,
  factorSandSubstrate,
} from "./habitat/binderHsiComposition";
import { physicalCoverFrom } from "./habitat/arrivalComposition";
import {
  SUBSTRATE_CLAY,
  SUBSTRATE_LOAM,
  SUBSTRATE_ROCK,
  SUBSTRATE_SAND,
} from "./terrain/substrates";

describe("Sandy crest sand-binder (C-009 / Slice N5)", () => {
  it("sand affinity is high on sand and zero on clay/rock", () => {
    expect(factorSandSubstrate(SUBSTRATE_SAND)).toBe(1);
    expect(factorSandSubstrate(SUBSTRATE_LOAM)).toBe(
      config.binderLoamSandFactor,
    );
    expect(factorSandSubstrate(SUBSTRATE_CLAY)).toBe(0);
    expect(factorSandSubstrate(SUBSTRATE_ROCK)).toBe(0);
  });

  it("drainage prefers dry crests over wet hollows", () => {
    expect(factorDrainage(0, config.soilPorosity)).toBe(1);
    expect(factorDrainage(config.soilPorosity, config.soilPorosity)).toBe(0);
  });

  it("binder HSI is sand×exposure×drainage gated", () => {
    const crest = evaluateBinderHsi({
      moisture: 0,
      porosity: config.soilPorosity,
      shoreExposure: 0.5,
      materialClassId: SUBSTRATE_SAND,
      transportDivergence: -config.binderBurialOptimum,
    });
    expect(crest.hsi).toBe(1);

    const wetHollow = evaluateBinderHsi({
      moisture: config.soilPorosity,
      porosity: config.soilPorosity,
      shoreExposure: 0,
      materialClassId: SUBSTRATE_LOAM,
    });
    expect(wetHollow.hsi).toBe(0);
    expect(
      wetHollow.limiting === BINDER_LIMITING_EXPOSURE ||
        wetHollow.limiting === BINDER_LIMITING_DRAINAGE ||
        wetHollow.limiting === BINDER_LIMITING_SAND,
    ).toBe(true);

    const clayCrest = evaluateBinderHsi({
      moisture: 0,
      porosity: config.soilPorosity,
      shoreExposure: 0.5,
      materialClassId: SUBSTRATE_CLAY,
      transportDivergence: -config.binderBurialOptimum,
    });
    expect(clayCrest.limiting).toBe(BINDER_LIMITING_SAND);
    expect(clayCrest.hsi).toBe(0);
  });

  it("improving moisture does not raise exposure-limited binder HSI", () => {
    const dry = evaluateBinderHsi({
      moisture: 0,
      porosity: config.soilPorosity,
      shoreExposure: 0.2,
      materialClassId: SUBSTRATE_SAND,
      transportDivergence: -config.binderBurialOptimum,
    });
    const wetter = evaluateBinderHsi({
      moisture: config.soilPorosity * 0.3,
      porosity: config.soilPorosity,
      shoreExposure: 0.2,
      materialClassId: SUBSTRATE_SAND,
      transportDivergence: -config.binderBurialOptimum,
    });
    expect(dry.limiting).toBe(BINDER_LIMITING_EXPOSURE);
    expect(wetter.hsi).toBeLessThanOrEqual(dry.hsi + 1e-9);
  });

  it("moderate accretion opens binders while calm and extreme burial limit", () => {
    const calm = evaluateBinderHsi({
      moisture: 0,
      porosity: config.soilPorosity,
      shoreExposure: 0.5,
      materialClassId: SUBSTRATE_SAND,
      transportDivergence: 0,
    });
    const moderate = evaluateBinderHsi({
      moisture: 0,
      porosity: config.soilPorosity,
      shoreExposure: 0.5,
      materialClassId: SUBSTRATE_SAND,
      transportDivergence: -config.binderBurialOptimum,
    });
    const extreme = evaluateBinderHsi({
      moisture: 0,
      porosity: config.soilPorosity,
      shoreExposure: 0.5,
      materialClassId: SUBSTRATE_SAND,
      transportDivergence: -1,
    });
    expect(calm.limiting).toBe(BINDER_LIMITING_BURIAL);
    expect(calm.hsi).toBeCloseTo(factorBurialTolerance(0), 8);
    expect(moderate.hsi).toBe(1);
    expect(extreme.limiting).toBe(BINDER_LIMITING_BURIAL);
    expect(extreme.hsi).toBeLessThan(calm.hsi);
  });

  it("dry sandy crest earns binder; wet loam hollow earns herb under one seed schedule", () => {
    const w = 16;
    const h = 16;
    const crestX = 1;
    const crestZ = 4;
    const hollowX = 1;
    const hollowZ = 12;

    const make = () => {
      const world = new WorldState(new Grid2D(w, h, 2.5));
      world.vegCover.fill(0);
      world.soilDepth.fill(config.hsiDepthRefMeters);
      world.soilMoisture.fill(config.soilPorosity * 0.5);
      world.groundwaterStorage.fill(config.hsiGwRefMeters);
      world.soilSalinity.fill(0);
      world.shoreExposure.fill(0);
      world.shoreLongshore.fill(0);
      world.soilMaterial.fill(SUBSTRATE_LOAM);
      // Crest: dry sand + wind.
      world.soilMaterial.set(crestX, crestZ, SUBSTRATE_SAND);
      world.soilMoisture.set(crestX, crestZ, 0);
      world.shoreExposure.set(crestX, crestZ, 0.5);
      world.shoreLongshore.set(crestX - 1, crestZ, config.binderBurialOptimum);
      world.shoreLongshore.set(crestX + 1, crestZ, -config.binderBurialOptimum);
      world.runHabitatStep(1);
      world.runDispersalStep(1);
      for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
      return world;
    };

    const a = make();
    const b = make();
    expect(a.stateHash()).toBe(b.stateHash());

    expect(a.getHerbSeedBank(crestX, crestZ)).toBeCloseTo(
      a.getHerbSeedBank(hollowX, hollowZ),
      8,
    );
    expect(a.getBinderSeedBank(crestX, crestZ)).toBeCloseTo(
      a.getHerbSeedBank(crestX, crestZ),
      8,
    );

    const crestBinder = a.getBinderBiomass(crestX, crestZ);
    const crestHerb = a.getHerbBiomass(crestX, crestZ);
    const hollowHerb = a.getHerbBiomass(hollowX, hollowZ);
    const hollowBinder = a.getBinderBiomass(hollowX, hollowZ);

    expect(crestBinder).toBeGreaterThan(0.1);
    expect(crestBinder).toBeGreaterThan(crestHerb * 4);
    expect(hollowHerb).toBeGreaterThan(0.1);
    expect(hollowHerb).toBeGreaterThan(hollowBinder + 0.05);
    expect(hollowBinder).toBe(0);
  });

  it("binder physicalCover blunts coastal erosion vs bare twin", () => {
    const flat = new Grid2D(12, 12, 1);
    flat.fill(3);
    const bare = new WorldState(flat.clone(), { closedBoundary: true });
    const bound = new WorldState(flat.clone(), { closedBoundary: true });
    bare.soilMaterial.fill(SUBSTRATE_SAND);
    bound.soilMaterial.fill(SUBSTRATE_SAND);
    bare.vegCover.fill(0);
    bound.vegCover.fill(0);
    bare.herbBiomass.fill(0);
    bare.strandBiomass.fill(0);
    bare.binderBiomass.fill(0);
    bound.herbBiomass.fill(0);
    bound.strandBiomass.fill(0);
    bound.binderBiomass.fill(config.binderBiomassMax);
    bare.shoreExposure.fill(1);
    bound.shoreExposure.fill(1);

    const elev0 = Float32Array.from(bare.terrain.data);
    for (let n = 0; n < 8; n++) {
      bare.runGeomorphologyStep(1);
      bound.runGeomorphologyStep(1);
    }
    let bareLoss = 0;
    let boundLoss = 0;
    for (let i = 0; i < elev0.length; i++) {
      bareLoss += Math.max(0, elev0[i]! - bare.terrain.data[i]!);
      boundLoss += Math.max(0, elev0[i]! - bound.terrain.data[i]!);
    }
    expect(bareLoss).toBeGreaterThan(0);
    expect(boundLoss).toBeLessThan(bareLoss * 0.5);
  });

  it("registers binder seed / establishment / biomass with owners", () => {
    const world = new WorldState(new Grid2D(4, 4, 1));
    expect(world.registry.get("veg.seedBank.binder").owner).toBe("dispersal");
    expect(world.registry.get("veg.seedBank.binder").legacy).toBe(true);
    expect(world.registry.get("veg.establishment.binder").owner).toBe(
      "dispersal",
    );
    expect(world.registry.get("veg.biomass.binder").owner).toBe("vegetation");
    expect(world.registry.get("veg.biomass.binder").band).toBe("seasonal");
  });

  it("physicalCover stacks binder with herb and strand", () => {
    expect(
      physicalCoverFrom(
        0,
        0,
        config.herbBiomassMax,
        0,
        config.strandBiomassMax,
        config.binderBiomassMax,
        config.binderBiomassMax,
      ),
    ).toBe(1);
  });
});
