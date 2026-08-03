import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { DEFAULT_SEA_LEVEL_METERS } from "./terrain/generateIsland";
import { meanHighWater, meanLowWater, tideById } from "./climate/tidalEnvelope";
import {
  factorInundationMarsh,
  tidalHydroperiod,
} from "./habitat/inundationComposition";
import { physicalCoverFrom } from "./habitat/arrivalComposition";
import {
  evaluateMarshHsi,
  MARSH_LIMITING_INUNDATION,
} from "./habitat/marshHsiComposition";
import { LIMITING_INUNDATION } from "./habitat/hsiComposition";

const SEA = DEFAULT_SEA_LEVEL_METERS;

describe("Salt-marsh engineer (C-016 / Slice N9)", () => {
  it("inundation hump peaks mid-envelope and zeros at dry / deep", () => {
    expect(factorInundationMarsh(0)).toBe(0);
    expect(factorInundationMarsh(0.5)).toBe(1);
    expect(factorInundationMarsh(1)).toBe(0);
    expect(factorInundationMarsh(0.25)).toBeCloseTo(0.5, 8);
  });

  it("marsh HSI is inundation-hump gated under a spring envelope", () => {
    const amp = tideById("spring").amplitudeMeters;
    const mlw = meanLowWater(SEA, amp);
    const mhw = meanHighWater(SEA, amp);
    const mid = evaluateMarshHsi({
      elevMeters: SEA,
      mlwMeters: mlw,
      mhwMeters: mhw,
      salinity: 0,
    });
    expect(tidalHydroperiod(SEA, mlw, mhw)).toBeCloseTo(0.5, 8);
    expect(mid.hsi).toBe(1);
    expect(mid.fInundation).toBe(1);

    const terrace = evaluateMarshHsi({
      elevMeters: mhw + 0.5,
      mlwMeters: mlw,
      mhwMeters: mhw,
      salinity: 0,
    });
    expect(terrace.hsi).toBe(0);
    expect(terrace.limiting).toBe(MARSH_LIMITING_INUNDATION);

    const deep = evaluateMarshHsi({
      elevMeters: mlw,
      mlwMeters: mlw,
      mhwMeters: mhw,
      salinity: 0,
    });
    expect(deep.hsi).toBe(0);
    expect(deep.limiting).toBe(MARSH_LIMITING_INUNDATION);
  });

  it("no tide → marsh inundation-limited (mainland / tide-off)", () => {
    const sample = evaluateMarshHsi({ salinity: 0 });
    expect(sample.hydroperiod).toBe(0);
    expect(sample.hsi).toBe(0);
    expect(sample.limiting).toBe(MARSH_LIMITING_INUNDATION);
  });

  it("mid-foreshore earns marsh; dry terrace earns herb under one seed schedule", () => {
    const amp = tideById("spring").amplitudeMeters;
    const mhw = meanHighWater(SEA, amp);
    const w = 16;
    const h = 16;
    const foreshoreX = 4;
    const foreshoreZ = 4;
    const terraceX = 12;
    const terraceZ = 12;

    const make = () => {
      const terrain = new Grid2D(w, h, mhw + 0.5);
      terrain.set(foreshoreX, foreshoreZ, SEA);
      const world = new WorldState(terrain, {
        seaLevel: SEA,
        tidalAmplitude: amp,
      });
      world.vegCover.fill(0);
      world.soilDepth.fill(config.hsiDepthRefMeters);
      world.soilMoisture.fill(config.soilPorosity * 0.5);
      world.groundwaterStorage.fill(config.hsiGwRefMeters);
      world.soilSalinity.fill(0);
      world.shoreExposure.fill(0);
      world.runHabitatStep(1);
      // §4.48: marsh HSI is now an annual snapshot (veg.hsi.marsh) dispersal
      // writes — refresh it against this scenario's fields before overriding
      // the seed banks below for the uniform-seed comparison.
      world.runDispersalStep(1);
      // Uniform seed — isolate guild HSI from overseas shore bias.
      world.herbSeedBank.fill(config.seedSourceStrength);
      world.strandSeedBank.fill(config.seedSourceStrength);
      world.binderSeedBank.fill(config.seedSourceStrength);
      world.marshSeedBank.fill(config.seedSourceStrength);
      for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
      return world;
    };

    const a = make();
    const b = make();
    expect(a.stateHash()).toBe(b.stateHash());

    expect(a.getMarshSeedBank(foreshoreX, foreshoreZ)).toBeCloseTo(
      a.getHerbSeedBank(foreshoreX, foreshoreZ),
      8,
    );

    const foreshoreMarsh = a.getMarshBiomass(foreshoreX, foreshoreZ);
    const foreshoreHerb = a.getHerbBiomass(foreshoreX, foreshoreZ);
    const terraceHerb = a.getHerbBiomass(terraceX, terraceZ);
    const terraceMarsh = a.getMarshBiomass(terraceX, terraceZ);

    expect(a.isIntertidal(foreshoreX, foreshoreZ)).toBe(true);
    expect(a.isIntertidal(terraceX, terraceZ)).toBe(false);
    expect(a.getLimitingFactor(foreshoreX, foreshoreZ)).toBe(
      LIMITING_INUNDATION,
    );

    expect(foreshoreMarsh).toBeGreaterThan(0.1);
    expect(foreshoreMarsh).toBeGreaterThan(foreshoreHerb + 0.05);
    expect(terraceHerb).toBeGreaterThan(0.1);
    expect(terraceHerb).toBeGreaterThan(terraceMarsh + 0.05);
    expect(terraceMarsh).toBe(0);
  });

  it("marsh physicalCover blunts coastal erosion vs bare twin", () => {
    const flat = new Grid2D(12, 12, SEA + 0.5);
    const bare = new WorldState(flat.clone(), {
      closedBoundary: true,
      seaLevel: SEA,
      tidalAmplitude: tideById("spring").amplitudeMeters,
    });
    const living = new WorldState(flat.clone(), {
      closedBoundary: true,
      seaLevel: SEA,
      tidalAmplitude: tideById("spring").amplitudeMeters,
    });
    bare.vegCover.fill(0);
    living.vegCover.fill(0);
    bare.herbBiomass.fill(0);
    bare.strandBiomass.fill(0);
    bare.binderBiomass.fill(0);
    bare.marshBiomass.fill(0);
    living.herbBiomass.fill(0);
    living.strandBiomass.fill(0);
    living.binderBiomass.fill(0);
    living.marshBiomass.fill(config.marshBiomassMax);
    bare.shoreExposure.fill(1);
    living.shoreExposure.fill(1);

    const elev0 = Float32Array.from(bare.terrain.data);
    for (let n = 0; n < 8; n++) {
      bare.runGeomorphologyStep(1);
      living.runGeomorphologyStep(1);
    }
    let bareLoss = 0;
    let livingLoss = 0;
    for (let i = 0; i < elev0.length; i++) {
      bareLoss += Math.max(0, elev0[i]! - bare.terrain.data[i]!);
      livingLoss += Math.max(0, elev0[i]! - living.terrain.data[i]!);
    }
    expect(bareLoss).toBeGreaterThan(0);
    expect(livingLoss).toBeLessThan(bareLoss * 0.5);
  });

  it("registers marsh seed / establishment / biomass with owners", () => {
    const world = new WorldState(new Grid2D(4, 4, 1));
    expect(world.registry.get("veg.seedBank.marsh").owner).toBe("dispersal");
    expect(world.registry.get("veg.seedBank.marsh").legacy).toBe(true);
    expect(world.registry.get("veg.establishment.marsh").owner).toBe(
      "dispersal",
    );
    expect(world.registry.get("veg.biomass.marsh").owner).toBe("vegetation");
    expect(world.registry.get("veg.biomass.marsh").band).toBe("seasonal");
  });

  it("physicalCover stacks marsh with herb, strand, and binder", () => {
    expect(
      physicalCoverFrom(
        0,
        0,
        config.herbBiomassMax,
        0,
        config.strandBiomassMax,
        0,
        config.binderBiomassMax,
        config.marshBiomassMax,
        config.marshBiomassMax,
      ),
    ).toBe(1);
  });
});
