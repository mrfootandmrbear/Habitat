import type { Process } from "./Process";

/** Authoritative writer for water.surfaceDepth (SIMULATION_MODEL §3.2). */
export const surfaceWaterProcess: Process = {
  id: "surfaceWater",
  band: "event",
  reads: ["terrain.elevation"],
  writes: ["water.surfaceDepth"],
  step(world, dt) {
    world.runSurfaceWaterStep(dt);
  },
};
