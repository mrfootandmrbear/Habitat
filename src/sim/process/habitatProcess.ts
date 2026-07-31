import type { Process } from "./Process";

/**
 * Slice 9 — Liebig HSI / limiting factor (NATURAL_PROCESS_MATH §3.3).
 * Slice 20: also reads soil.salinity (C-018). Heat plant gate: airTemperature via WorldState.
 * Derived daily — not legacy (T-003).
 */
export const habitatProcess: Process = {
  id: "habitat",
  band: "daily",
  reads: [
    "soil.moisture",
    "soil.depth",
    "soil.salinity",
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
