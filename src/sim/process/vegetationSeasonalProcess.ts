import type { Process } from "./Process";

/**
 * Slice 12 / N4 / N5 / N9 / N10 / N11 — seasonal herb + strand + binder + marsh + shrub + crust
 * from seed × guild HSI. Same process id as daily vegetation — single vegetation
 * owner, second band. Does not write veg.cover (biology→physics via physicalCover
 * in daily step — Slice 13).
 *
 * §4.48 — non-herb guild HSI now comes from the `veg.hsi.*` annual snapshot
 * `dispersalProcess` writes, not a second recomputation from soil/shore/terrain
 * state. This process no longer touches those fields directly (dispersal is
 * their sole reader); dropping them here is what makes the previously
 * undeclared duplicate math visible as a removed dependency, not just a
 * documented one.
 */
export const vegetationSeasonalProcess: Process = {
  id: "vegetation",
  band: "seasonal",
  reads: [
    "habitat.suitability",
    "veg.seedBank.herb",
    "veg.seedBank.strand",
    "veg.seedBank.binder",
    "veg.seedBank.marsh",
    "veg.seedBank.shrub",
    "veg.seedBank.crust",
    "veg.hsi.strand",
    "veg.hsi.binder",
    "veg.hsi.marsh",
    "veg.hsi.shrub",
    "veg.hsi.crust",
    "veg.biomass.herb",
    "veg.biomass.strand",
    "veg.biomass.binder",
    "veg.biomass.marsh",
    "veg.biomass.shrub",
    "veg.biomass.crust",
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
