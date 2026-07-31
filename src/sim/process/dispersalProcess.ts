import type { Process } from "./Process";

/**
 * Slice 12 — fixed preserve perimeter seed source → seed bank (C-007).
 * Annual band; owns herb + strand seed/establishment (C-018).
 * No stochastic draws (C-003 Open). No introduction tool.
 */
export const dispersalProcess: Process = {
  id: "dispersal",
  band: "annual",
  reads: ["habitat.suitability", "shore.exposure", "soil.salinity"],
  writes: [
    "veg.seedBank.herb",
    "veg.establishment.herb",
    "veg.seedBank.strand",
    "veg.establishment.strand",
  ],
  step(world, dt) {
    world.runDispersalStep(dt);
  },
};
