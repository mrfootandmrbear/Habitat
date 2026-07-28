import type { Process } from "./Process";

/**
 * Slice 5–6 — soil moisture → cover; cover owns roughness and contributes infil.
 * Does not write water.surfaceDepth (E-005 via owned/contributed physical props).
 */
export const vegetationProcess: Process = {
  id: "vegetation",
  band: "daily",
  reads: ["soil.moisture"],
  writes: ["veg.cover", "surface.roughness", "veg.infiltrationContribution"],
  contributes: ["soil.infiltrationCapacity"],
  step(world, dt) {
    world.runVegetationStep(dt);
  },
};
