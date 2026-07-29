import type { Process } from "./Process";

/**
 * Cheap GW / baseflow store (Slice 8b / C-001).
 * GWSWEX-style compartment — not Richards/MODFLOW (EXTERNAL_REFERENCES ban).
 */
export const groundwaterProcess: Process = {
  id: "groundwater",
  band: "daily",
  reads: [
    "soil.moisture",
    "soil.depth",
    "groundwater.storage",
    "water.surfaceDepth",
  ],
  writes: ["groundwater.storage"],
  contributes: ["soil.moisture", "water.surfaceDepth"],
  step(world, dt) {
    world.runGroundwaterStep(dt);
  },
};
