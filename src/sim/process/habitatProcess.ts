import type { Process } from "./Process";

/**
 * Slice 9 — Liebig HSI / limiting factor (NATURAL_PROCESS_MATH §3.3).
 * Slice 20: also reads soil.salinity (C-018). Heat: airTemperature via WorldState.
 * Spray: also reads shore.exposure (C-017 — ≠ soil salt).
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
    "shore.exposure",
    // §4.48: runHabitatStep also reads terrain (aspect/slope insolation) and
    // soil material (porosity lookup) — both silently consumed, undeclared.
    "terrain.elevation",
    "soil.material",
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
