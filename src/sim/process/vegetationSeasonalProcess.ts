import type { Process } from "./Process";

/**
 * Slice 12 / N4 — seasonal herb + strand biomass from seed × guild HSI (C-007).
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
    "shore.exposure",
    "soil.salinity",
  ],
  writes: ["veg.biomass.herb", "veg.biomass.strand"],
  step(world, dt) {
    world.runHerbEstablishmentStep(dt);
  },
};
