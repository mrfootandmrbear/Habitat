import type { Process } from "./Process";

/**
 * Slice 12 — external seed source → seed bank (C-007).
 * Annual band; owns herb + strand + binder + marsh + shrub + crust seed/establishment
 * (C-018 / C-009 / C-016 / Slice N10 / N11). No stochastic draws (C-003 Open). No introduction tool.
 *
 * Slice L2 — standing biomass is now also a propagule source, so pressure is
 * `overseas(d) + Σ_neighbours biomass · kernel` (deterministic separable
 * convolution, still no RNG). `veg.biomass.*` is declared `lagged`: vegetation
 * writes biomass on the seasonal band and this reads it on the annual band, so
 * the value taken is always the previous band commit. The scheduler's topo sort
 * is per-band and dispersal is alone in `annual`, so today that lag is implied
 * by band order rather than enforced by the sort — declaring it keeps the edge
 * visible in the registry and citable in review (SIMULATION_MODEL §5), and
 * makes the cycle explicit if a biomass writer ever joins this band.
 *
 * §4.48 — also the single source of truth for strand/binder/marsh/shrub/crust
 * HSI (`habitat.*Suitability`); `vegetationSeasonalProcess` reads these
 * instead of recomputing the same `evaluateXHsi` math on the seasonal band.
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
    "veg.biomass.strand",
    "veg.biomass.binder",
    "veg.biomass.marsh",
    "veg.biomass.shrub",
    "veg.biomass.crust",
  ],
  lagged: [
    "veg.biomass.herb",
    "veg.biomass.strand",
    "veg.biomass.binder",
    "veg.biomass.marsh",
    "veg.biomass.shrub",
    "veg.biomass.crust",
  ],
  writes: [
    "veg.seedBank.herb",
    "veg.establishment.herb",
    "veg.seedBank.strand",
    "veg.establishment.strand",
    "habitat.strandSuitability",
    "veg.seedBank.binder",
    "veg.establishment.binder",
    "habitat.binderSuitability",
    "veg.seedBank.marsh",
    "veg.establishment.marsh",
    "habitat.marshSuitability",
    "veg.seedBank.shrub",
    "veg.establishment.shrub",
    "habitat.shrubSuitability",
    "veg.seedBank.crust",
    "veg.establishment.crust",
    "habitat.crustSuitability",
  ],
  step(world, dt) {
    world.runDispersalStep(dt);
  },
};
