import type { Process } from "./Process";

/**
 * Slice 9 — Liebig HSI / limiting factor (NATURAL_PROCESS_MATH §3.3).
 * Derived daily from moisture, soil depth, and GW — not legacy (T-003).
 */
export const habitatProcess: Process = {
  id: "habitat",
  band: "daily",
  reads: [
    "soil.moisture",
    "soil.depth",
    "groundwater.storage",
  ],
  writes: [
    "habitat.suitability",
    "habitat.limitingFactor",
    "habitat.limitingGap",
  ],
  step(world, dt) {
    world.runHabitatStep(dt);
  },
};
