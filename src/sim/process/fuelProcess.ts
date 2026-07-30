import type { Process } from "./Process";

/**
 * Slice 10 — fuel accumulation (Olson litter model, NATURAL_PROCESS_MATH §3.5).
 * Vegetation cover drives input; first-order decay yields steady-state fuel load.
 * Decadal band — slow accumulation mirroring geomorphology cadence.
 */
export const fuelProcess: Process = {
  id: "fuel",
  band: "decadal",
  reads: ["veg.cover"],
  writes: ["fire.fuelLoad"],
  step(world, dt) {
    world.runFuelAccumulationStep(dt);
  },
};
