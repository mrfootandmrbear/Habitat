import type { Process } from "./Process";

/**
 * Slice 8 — soil production + cover-blunted erosion (S-006, S-007, GEO-002).
 * Slice 18 — coastal wave work from shore.exposure (C-017) integrates here.
 * Slice 19 — longshore lee deposit from shore.longshore budget (C-017).
 * Exner-lite — hillslope removals redeposit in basins/flats (capacity drop).
 * Geomorphology is the sole sediment writer (no SWE, no second process).
 * Owns terrain.elevation and soil.depth; bedrock = elev − depth stays consistent.
 */
export const geomorphologyProcess: Process = {
  id: "geomorphology",
  band: "decadal",
  reads: [
    "terrain.elevation",
    "soil.depth",
    "soil.material",
    "veg.cover",
    "veg.biomass.herb",
    "veg.biomass.strand",
    "veg.biomass.binder",
    "depression.depth",
    "shore.exposure",
    "shore.longshore",
  ],
  writes: ["terrain.elevation", "soil.depth", "soil.material", "ledger.shoreErosion"],
  lagged: ["veg.cover", "veg.biomass.herb", "veg.biomass.strand", "veg.biomass.binder"],
  step(world, dt) {
    world.runGeomorphologyStep(dt);
  },
};
