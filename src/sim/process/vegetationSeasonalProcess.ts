import type { Process } from "./Process";

/**
 * Slice 12 / N4 / N5 / N9 / N10 / N11 — seasonal herb + strand + binder + marsh + shrub + crust
 * from seed × guild HSI. Same process id as daily vegetation — single vegetation
 * owner, second band. Does not write veg.cover (biology→physics via physicalCover
 * in daily step — Slice 13).
 *
 * §4.48 — strand/binder/marsh/shrub/crust HSI is read from `veg.hsi.*`, the
 * cache dispersal (annual) writes, instead of recomputing it here (this
 * process no longer reads soil/shore/terrain fields for that purpose — herb's
 * HSI stays the daily-band `habitat.suitability` spine, still read directly).
 * `veg.hsi.*` is declared `lagged` for the same reason dispersal declares
 * `veg.biomass.*` lagged: the scheduler's topo sort is per-band, so the read
 * is really "last annual commit," and declaring it keeps that edge visible
 * in the registry rather than implied only by band order.
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
    "veg.biomass.herb",
    "veg.hsi.strand",
    "veg.hsi.binder",
    "veg.hsi.marsh",
    "veg.hsi.shrub",
    "veg.hsi.crust",
  ],
  lagged: ["veg.hsi.strand", "veg.hsi.binder", "veg.hsi.marsh", "veg.hsi.shrub", "veg.hsi.crust"],
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
