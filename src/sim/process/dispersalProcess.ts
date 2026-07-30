import type { Process } from "./Process";

/**
 * Slice 12 — fixed preserve perimeter seed source → seed bank (C-007).
 * Annual band; owns veg.seedBank.herb / veg.establishment.herb.
 * No stochastic draws (C-003 Open). No introduction tool.
 */
export const dispersalProcess: Process = {
  id: "dispersal",
  band: "annual",
  reads: ["habitat.suitability"],
  writes: ["veg.seedBank.herb", "veg.establishment.herb"],
  step(world, dt) {
    world.runDispersalStep(dt);
  },
};
