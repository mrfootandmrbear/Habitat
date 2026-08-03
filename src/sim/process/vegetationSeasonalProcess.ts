import type { Process } from "./Process";

/**
 * Slice 12 / N4 / N5 / N9 / N10 / N11 — seasonal herb + strand + binder + marsh + shrub + crust
 * from seed × guild HSI. Same process id as daily vegetation — single vegetation
 * owner, second band. Does not write veg.cover (biology→physics via physicalCover
 * in daily step — Slice 13).
 *
 * §4.48 — reads `habitat.suitability` / `habitat.*Suitability`, the values
 * `dispersalProcess` already computed on the annual band, instead of
 * recomputing guild HSI from the raw environmental fields (moisture,
 * salinity, substrate, exposure, longshore, elevation) here — those are no
 * longer read in this process at all.
 */
export const vegetationSeasonalProcess: Process = {
  id: "vegetation",
  band: "seasonal",
  reads: [
    "habitat.suitability",
    "habitat.strandSuitability",
    "habitat.binderSuitability",
    "habitat.marshSuitability",
    "habitat.shrubSuitability",
    "habitat.crustSuitability",
    "veg.seedBank.herb",
    "veg.seedBank.strand",
    "veg.seedBank.binder",
    "veg.seedBank.marsh",
    "veg.seedBank.shrub",
    "veg.seedBank.crust",
    "veg.biomass.herb",
  ],
  writes: [
    "veg.biomass.herb",
    "veg.biomass.strand",
    "veg.biomass.binder",
    "veg.biomass.marsh",
    "veg.biomass.shrub",
    "veg.biomass.crust",
  ],
  step(world, dt) {
    world.runHerbEstablishmentStep(dt);
  },
};
