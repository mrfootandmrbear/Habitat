import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { physicalCoverFrom } from "./habitat/arrivalComposition";
import {
  CRUST_LIMITING_MOISTURE,
  CRUST_LIMITING_OPEN,
  CRUST_LIMITING_SALINITY,
  evaluateCrustHsi,
  factorOpenCanopy,
} from "./habitat/crustHsiComposition";

describe("Cryptogam crust bootstrap (Slice N11)", () => {
  it("open canopy zeros under full cover and is 1 on bare", () => {
    expect(factorOpenCanopy(0)).toBe(1);
    expect(factorOpenCanopy(1)).toBe(0);
    expect(factorOpenCanopy(0.5)).toBeCloseTo(0.5, 8);
  });

  it("damp bare opens crust; drier, saturated, shaded, and salty stay limited", () => {
    const dampBare = evaluateCrustHsi({
      moisture: config.soilPorosity * 0.25,
      herbBiomass: 0,
      salinity: 0,
    });
    expect(dampBare.hsi).toBeGreaterThan(0.9);
    expect(dampBare.fOpen).toBe(1);

    const dryBare = evaluateCrustHsi({
      moisture: 0,
      herbBiomass: 0,
      salinity: 0,
    });
    expect(dryBare.hsi).toBeLessThan(dampBare.hsi);
    expect(dryBare.limiting).toBe(CRUST_LIMITING_MOISTURE);

    const saturatedBare = evaluateCrustHsi({
      moisture: config.soilPorosity,
      herbBiomass: 0,
      salinity: 0,
    });
    expect(saturatedBare.hsi).toBe(0);
    expect(saturatedBare.limiting).toBe(CRUST_LIMITING_MOISTURE);

    const dampShaded = evaluateCrustHsi({
      moisture: config.soilPorosity * 0.25,
      herbBiomass: config.herbBiomassMax,
      salinity: 0,
    });
    expect(dampShaded.hsi).toBe(0);
    expect(dampShaded.limiting).toBe(CRUST_LIMITING_OPEN);

    const dampSalty = evaluateCrustHsi({
      moisture: config.soilPorosity * 0.25,
      herbBiomass: 0,
      salinity: 1,
    });
    expect(dampSalty.hsi).toBe(0);
    expect(dampSalty.limiting).toBe(CRUST_LIMITING_SALINITY);
  });

  it("damp bare inland earns crust; drier and shaded twins lag under one seed", () => {
    const w = 16;
    const h = 16;
    const sx = 8;
    const sz = 8;

    const make = (opts: {
      moistureFrac: number;
      herbFrac: number;
      herbSeed?: boolean;
      salinity?: number;
    }) => {
      const world = new WorldState(new Grid2D(w, h, 2.5));
      world.vegCover.fill(0);
      world.soilDepth.fill(config.hsiDepthRefMeters);
      world.soilMoisture.fill(config.soilPorosity * opts.moistureFrac);
      world.groundwaterStorage.fill(config.hsiGwRefMeters);
      world.soilSalinity.fill(opts.salinity ?? 0);
      world.shoreExposure.fill(0);
      world.herbBiomass.fill(config.herbBiomassMax * opts.herbFrac);
      world.runHabitatStep(1);
      // Restore moisture after habitat (HSI may leave it unchanged; keep twin honest).
      world.soilMoisture.fill(config.soilPorosity * opts.moistureFrac);
      // §4.48: runHerbEstablishmentStep reads crustSuitability from the
      // field runDispersalStep writes, instead of recomputing evaluateCrustHsi
      // itself. The constructor already ran one dispersal pass (t=0 seed
      // pressure), but that was against pre-setup defaults — re-run it now
      // that moisture/herbBiomass/salinity reflect this scenario, same as the
      // strand/binder/salinity/heat probes already do.
      world.runDispersalStep(1);
      const herbSeed = opts.herbSeed === false ? 0 : config.seedSourceStrength;
      world.herbSeedBank.fill(herbSeed);
      world.strandSeedBank.fill(0);
      world.binderSeedBank.fill(0);
      world.marshSeedBank.fill(0);
      world.shrubSeedBank.fill(0);
      world.crustSeedBank.fill(config.seedSourceStrength);
      for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
      return world;
    };

    const dampA = make({ moistureFrac: 0.25, herbFrac: 0, herbSeed: false });
    const dampB = make({ moistureFrac: 0.25, herbFrac: 0, herbSeed: false });
    expect(dampA.stateHash()).toBe(dampB.stateHash());

    const dry = make({ moistureFrac: 0, herbFrac: 0, herbSeed: false });
    const shaded = make({ moistureFrac: 0.25, herbFrac: 1, herbSeed: false });
    const salty = make({
      moistureFrac: 0.25,
      herbFrac: 0,
      herbSeed: false,
      salinity: 1,
    });

    const dampCrust = dampA.getCrustBiomass(sx, sz);
    const dryCrust = dry.getCrustBiomass(sx, sz);
    const shadedCrust = shaded.getCrustBiomass(sx, sz);
    const saltyCrust = salty.getCrustBiomass(sx, sz);

    expect(dampA.getCrustSeedBank(sx, sz)).toBeCloseTo(
      config.seedSourceStrength,
      8,
    );
    expect(dampCrust).toBeGreaterThan(0.1);
    expect(dampCrust).toBeGreaterThan(dryCrust + 0.05);
    expect(dampCrust).toBeGreaterThan(shadedCrust + 0.05);
    expect(saltyCrust).toBe(0);
  });

  it("crust physicalCover raises infiltration vs bare twin", () => {
    const flat = new Grid2D(8, 8, 1);
    flat.fill(2);
    const bare = new WorldState(flat.clone(), { closedBoundary: true });
    const crusted = new WorldState(flat.clone(), { closedBoundary: true });
    bare.vegCover.fill(0);
    crusted.vegCover.fill(0);
    bare.herbBiomass.fill(0);
    bare.strandBiomass.fill(0);
    bare.binderBiomass.fill(0);
    bare.marshBiomass.fill(0);
    bare.shrubBiomass.fill(0);
    bare.crustBiomass.fill(0);
    crusted.herbBiomass.fill(0);
    crusted.strandBiomass.fill(0);
    crusted.binderBiomass.fill(0);
    crusted.marshBiomass.fill(0);
    crusted.shrubBiomass.fill(0);
    crusted.crustBiomass.fill(config.crustBiomassMax);
    bare.soilMoisture.fill(0);
    crusted.soilMoisture.fill(0);
    bare.runVegetationStep(1);
    crusted.runVegetationStep(1);
    bare.runSoilWaterStep(1);
    crusted.runSoilWaterStep(1);
    expect(crusted.vegInfiltrationContribution.get(4, 4)).toBeGreaterThan(
      bare.vegInfiltrationContribution.get(4, 4),
    );
    expect(crusted.infiltrationCapacity.get(4, 4)).toBeGreaterThan(
      bare.infiltrationCapacity.get(4, 4),
    );
  });

  it("registers crust seed / establishment / biomass with owners", () => {
    const world = new WorldState(new Grid2D(4, 4, 1));
    expect(world.registry.get("veg.seedBank.crust").owner).toBe("dispersal");
    expect(world.registry.get("veg.seedBank.crust").legacy).toBe(true);
    expect(world.registry.get("veg.establishment.crust").owner).toBe(
      "dispersal",
    );
    expect(world.registry.get("veg.biomass.crust").owner).toBe("vegetation");
    expect(world.registry.get("veg.biomass.crust").band).toBe("seasonal");
    expect(world.registry.get("veg.biomass.crust").legacy).toBe(true);
  });

  it("physicalCover stacks crust with the other guilds", () => {
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
        0,
        config.shrubBiomassMax,
        config.crustBiomassMax,
        config.crustBiomassMax,
      ),
    ).toBe(1);
  });
});
