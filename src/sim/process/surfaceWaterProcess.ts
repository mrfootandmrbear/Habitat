import type { Process } from "./Process";

/**
 * Authoritative writer for water.surfaceDepth (SIMULATION_MODEL §3.2).
 * Reads vegetation-owned roughness (Slice 6 / E-005); lagged across daily→event.
 */
export const surfaceWaterProcess: Process = {
  id: "surfaceWater",
  band: "event",
  reads: ["terrain.elevation", "surface.roughness"],
  lagged: ["surface.roughness"],
  writes: ["water.surfaceDepth", "ledger.boundaryOutflow"],
  step(world, dt) {
    world.runSurfaceWaterStep(dt);
  },
};
