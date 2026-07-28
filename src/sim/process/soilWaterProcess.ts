import type { Process } from "./Process";

/** Daily soil moisture: infiltration uses capacity (Slice 6); ET (H-001, H-003). */
export const soilWaterProcess: Process = {
  id: "soilWater",
  band: "daily",
  reads: [
    "water.surfaceDepth",
    "soil.moisture",
    "soil.infiltrationCapacity",
  ],
  /** Capacity integrated from prior vegetation contribution (cycle break). */
  lagged: ["soil.infiltrationCapacity"],
  writes: ["soil.moisture", "soil.infiltrationCapacity", "ledger.et"],
  /** Infiltration removes surface water owned by surfaceWater (§11 contribute). */
  contributes: ["water.surfaceDepth"],
  step(world, dt) {
    world.runSoilWaterStep(dt);
  },
};
