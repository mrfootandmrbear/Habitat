import type { Process } from "./Process";

/**
 * Slice 12 / N4 / N5 — seasonal herb + strand + binder from seed × guild HSI.
 * Same process id as daily vegetation — single vegetation owner, second band.
 * Does not write veg.cover (biology→physics via physicalCover in daily step — Slice 13).
 */
export const vegetationSeasonalProcess: Process = {
  id: "vegetation",
  band: "seasonal",
  reads: [
    "habitat.suitability",
    "veg.seedBank.herb",
    "veg.seedBank.strand",
    "veg.seedBank.binder",
    "shore.exposure",
    "soil.salinity",
    "soil.moisture",
    "soil.material",
    "shore.longshore",
  ],
  writes: ["veg.biomass.herb", "veg.biomass.strand", "veg.biomass.binder"],
  step(world, dt) {
    world.runHerbEstablishmentStep(dt);
  },
};
