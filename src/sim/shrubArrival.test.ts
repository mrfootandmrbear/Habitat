import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { heatById } from "./climate/atmosphere";
import { physicalCoverFrom } from "./habitat/arrivalComposition";
import {
  evaluateShrubHsi,
  factorCoverFacilitation,
  SHRUB_LIMITING_COVER,
  SHRUB_LIMITING_TEMPERATURE,
} from "./habitat/shrubHsiComposition";

describe("Climate-capped woody shrub (Slice N10)", () => {
  it("cover facilitation zeros bare and rises with pioneer cover", () => {
    expect(factorCoverFacilitation(0, 0.25)).toBe(0);
    expect(factorCoverFacilitation(0.25, 0.25)).toBeCloseTo(0.5, 8);
    expect(factorCoverFacilitation(1, 0.25)).toBeCloseTo(1 / 1.25, 8);
  });

  it("warm + herb cover opens shrub; cold and bare stay limited", () => {
    const warmCovered = evaluateShrubHsi({
      airTempC: heatById("warm").airTempC,
      herbBiomass: config.herbBiomassMax * 0.6,
      moisture: config.soilPorosity * 0.5,
      salinity: 0,
    });
    expect(warmCovered.hsi).toBeGreaterThan(0.4);
    expect(warmCovered.fTemp).toBeGreaterThan(0.8);
    expect(warmCovered.fTemp).toBeLessThanOrEqual(1);

    const coldCovered = evaluateShrubHsi({
      airTempC: heatById("cold").airTempC,
      herbBiomass: config.herbBiomassMax * 0.6,
      moisture: config.soilPorosity * 0.5,
      salinity: 0,
    });
    expect(coldCovered.hsi).toBe(0);
    expect(coldCovered.limiting).toBe(SHRUB_LIMITING_TEMPERATURE);

    const mildCovered = evaluateShrubHsi({
      airTempC: heatById("mild").airTempC,
      herbBiomass: config.herbBiomassMax * 0.6,
      moisture: config.soilPorosity * 0.5,
      salinity: 0,
    });
    expect(mildCovered.hsi).toBe(0);
    expect(mildCovered.limiting).toBe(SHRUB_LIMITING_TEMPERATURE);

    const warmBare = evaluateShrubHsi({
      airTempC: heatById("warm").airTempC,
      herbBiomass: 0,
      moisture: config.soilPorosity * 0.5,
      salinity: 0,
    });
    expect(warmBare.hsi).toBe(0);
    expect(warmBare.limiting).toBe(SHRUB_LIMITING_COVER);
  });

  it("warm herb-covered inland earns shrub; cold twin and bare stay empty under one seed", () => {
    const w = 16;
    const h = 16;
    const sx = 8;
    const sz = 8;

    const make = (
      heatId: "warm" | "mild" | "cold",
      herbFrac: number,
      opts?: { bareSeed?: boolean },
    ) => {
      const world = new WorldState(new Grid2D(w, h, 2.5));
      world.setAirTemperature(heatById(heatId).airTempC);
      world.vegCover.fill(0);
      world.soilDepth.fill(config.hsiDepthRefMeters);
      world.soilMoisture.fill(config.soilPorosity * 0.5);
      world.groundwaterStorage.fill(config.hsiGwRefMeters);
      world.soilSalinity.fill(0);
      world.shoreExposure.fill(0);
      world.herbBiomass.fill(config.herbBiomassMax * herbFrac);
      world.runHabitatStep(1);
      // §4.48: shrub HSI is now cached by dispersal (annual), not
      // recomputed inside establishment — populate the cache once before
      // looping establishment, same as the scheduler's own band cadence.
      world.runDispersalStep(1);
      // Bare case: no herb seed so cover cannot bootstrap mid-run.
      const herbSeed = opts?.bareSeed ? 0 : config.seedSourceStrength;
      world.herbSeedBank.fill(herbSeed);
      world.strandSeedBank.fill(config.seedSourceStrength);
      world.binderSeedBank.fill(config.seedSourceStrength);
      world.marshSeedBank.fill(config.seedSourceStrength);
      world.shrubSeedBank.fill(config.seedSourceStrength);
      for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
      return world;
    };

    const warmA = make("warm", 0.6);
    const warmB = make("warm", 0.6);
    expect(warmA.stateHash()).toBe(warmB.stateHash());

    const cold = make("cold", 0.6);
    const mild = make("mild", 0.6);
    const bare = make("warm", 0, { bareSeed: true });

    const warmShrub = warmA.getShrubBiomass(sx, sz);
    const coldShrub = cold.getShrubBiomass(sx, sz);
    const mildShrub = mild.getShrubBiomass(sx, sz);
    const bareShrub = bare.getShrubBiomass(sx, sz);

    expect(warmA.getShrubSeedBank(sx, sz)).toBeCloseTo(
      warmA.getHerbSeedBank(sx, sz),
      8,
    );
    expect(warmShrub).toBeGreaterThan(0.1);
    expect(warmShrub).toBeGreaterThan(coldShrub + 0.05);
    expect(coldShrub).toBe(0);
    expect(mildShrub).toBe(0);
    expect(bareShrub).toBe(0);
  });

  it("shrub physicalCover blunts coastal erosion vs bare twin", () => {
    const flat = new Grid2D(12, 12, 1);
    flat.fill(3);
    const bare = new WorldState(flat.clone(), { closedBoundary: true });
    const living = new WorldState(flat.clone(), { closedBoundary: true });
    bare.vegCover.fill(0);
    living.vegCover.fill(0);
    bare.herbBiomass.fill(0);
    bare.strandBiomass.fill(0);
    bare.binderBiomass.fill(0);
    bare.marshBiomass.fill(0);
    bare.shrubBiomass.fill(0);
    living.herbBiomass.fill(0);
    living.strandBiomass.fill(0);
    living.binderBiomass.fill(0);
    living.marshBiomass.fill(0);
    living.shrubBiomass.fill(config.shrubBiomassMax);
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

  it("registers shrub seed / establishment / biomass with owners", () => {
    const world = new WorldState(new Grid2D(4, 4, 1));
    expect(world.registry.get("veg.seedBank.shrub").owner).toBe("dispersal");
    expect(world.registry.get("veg.seedBank.shrub").legacy).toBe(true);
    expect(world.registry.get("veg.establishment.shrub").owner).toBe(
      "dispersal",
    );
    expect(world.registry.get("veg.biomass.shrub").owner).toBe("vegetation");
    expect(world.registry.get("veg.biomass.shrub").band).toBe("seasonal");
    expect(world.registry.get("veg.biomass.shrub").legacy).toBe(true);
  });

  it("physicalCover stacks shrub with herb, strand, binder, and marsh", () => {
    expect(
      physicalCoverFrom(
        0,
        0,
        config.herbBiomassMax,
        0,
        config.strandBiomassMax,
        0,
        config.binderBiomassMax,
        0,
        config.marshBiomassMax,
        config.shrubBiomassMax,
        config.shrubBiomassMax,
      ),
    ).toBe(1);
  });
});
