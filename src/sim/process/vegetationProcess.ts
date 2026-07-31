import type { Process } from "./Process";

/**
 * Slice 5–6 / 11 / 13 — moisture + slope/aspect light → cover; canopy attenuates
 * understory light via Beer–Lambert (ES-001, NATURAL_PROCESS_MATH §3.2).
 * Earned herb biomass stacks into roughness / infiltration via physicalCover
 * without dual-writing veg.cover (E-005, docs/slices/13-composition.md).
 * Does not write water.surfaceDepth (E-005 via owned/contributed physical props).
 */
export const vegetationProcess: Process = {
  id: "vegetation",
  band: "daily",
  reads: [
    "soil.moisture",
    "terrain.elevation",
    "veg.biomass.herb",
    "veg.biomass.strand",
    "veg.biomass.binder",
    "veg.biomass.marsh",
  ],
  writes: [
    "veg.cover",
    "surface.roughness",
    "veg.infiltrationContribution",
    "light.insolation",
    "veg.leafAreaIndex",
    "light.understory",
  ],
  contributes: ["soil.infiltrationCapacity"],
  step(world, dt) {
    world.runVegetationStep(dt);
  },
};
