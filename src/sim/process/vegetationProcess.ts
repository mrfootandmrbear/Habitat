import type { Process } from "./Process";

/**
 * Slice 5 — soil moisture → vegetation cover (one-way).
 * Does not write water or soil (ES-001 edge only).
 * No fixed carrying capacity K (ES-006): cover ∈ [0,1] is a unit bound;
 * growth rate scales with moisture, so wetter cells accumulate more cover.
 */
export const vegetationProcess: Process = {
  id: "vegetation",
  band: "daily",
  reads: ["soil.moisture"],
  writes: ["veg.cover"],
  step(world, dt) {
    world.runVegetationStep(dt);
  },
};
