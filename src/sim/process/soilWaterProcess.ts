import type { Process } from "./Process";

/** Daily soil moisture update: infiltration from surface + ET (H-001, H-003). */
export const soilWaterProcess: Process = {
  id: "soilWater",
  band: "daily",
  reads: ["water.surfaceDepth", "soil.moisture"],
  writes: ["soil.moisture"],
  step(world, dt) {
    world.runSoilWaterStep(dt);
  },
};
