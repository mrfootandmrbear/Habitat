import type { Process } from "./Process";

/**
 * Slice 12 — seasonal herb biomass from seed bank × Liebig HSI (C-007).
 * Same process id as daily vegetation — single vegetation owner, second band.
 * Does not write veg.cover (biology→physics via physicalCover in daily step — Slice 13).
 */
export const vegetationSeasonalProcess: Process = {
  id: "vegetation",
  band: "seasonal",
  reads: ["habitat.suitability", "veg.seedBank.herb"],
  writes: ["veg.biomass.herb"],
  step(world, dt) {
    world.runHerbEstablishmentStep(dt);
  },
};
