import type { Process } from "./Process";

/**
 * Slice 12 — fixed preserve perimeter seed source → seed bank (C-007).
 * Annual band; owns herb + strand + binder + marsh + shrub seed/establishment
 * (C-018 / C-009 / C-016 / Slice N10). No stochastic draws (C-003 Open). No introduction tool.
 */
export const dispersalProcess: Process = {
  id: "dispersal",
  band: "annual",
  reads: [
    "habitat.suitability",
    "shore.exposure",
    "soil.salinity",
    "soil.moisture",
    "soil.material",
    "shore.longshore",
    "terrain.elevation",
    "veg.biomass.herb",
  ],
  writes: [
    "veg.seedBank.herb",
    "veg.establishment.herb",
    "veg.seedBank.strand",
    "veg.establishment.strand",
    "veg.seedBank.binder",
    "veg.establishment.binder",
    "veg.seedBank.marsh",
    "veg.establishment.marsh",
    "veg.seedBank.shrub",
    "veg.establishment.shrub",
  ],
  step(world, dt) {
    world.runDispersalStep(dt);
  },
};
