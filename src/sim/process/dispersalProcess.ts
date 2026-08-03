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
 * §4.48 — also writes `veg.hsi.{strand,binder,marsh,shrub,crust}`, the raw
 * guild HSI (not the seed-weighted establishment probability above). This is
 * the single place that math is evaluated; `vegetationSeasonalProcess` reads
 * the annual snapshot instead of recomputing it every seasonal tick, closing
 * both the duplicate-math drift hazard and the same-tick guild read-order
 * dependence it caused (T-005 / Symmetry).
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
    "veg.hsi.strand",
    "veg.seedBank.binder",
    "veg.establishment.binder",
    "veg.hsi.binder",
    "veg.seedBank.marsh",
    "veg.establishment.marsh",
    "veg.hsi.marsh",
    "veg.seedBank.shrub",
    "veg.establishment.shrub",
    "veg.hsi.shrub",
    "veg.seedBank.crust",
    "veg.establishment.crust",
    "veg.hsi.crust",
  ],
  step(world, dt) {
    world.runDispersalStep(dt);
  },
};
