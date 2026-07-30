import type { Process } from "./Process";

/**
 * Atmospheric precip delivery (full C-020).
 * Owns cloud / phase / air temperature; contributes surface water via rain field.
 */
export const atmosphereProcess: Process = {
  id: "climate",
  band: "event",
  reads: [
    "terrain.elevation",
    "climate.cloudWater",
    "climate.airTemperature",
    "climate.precipPhase",
  ],
  writes: [
    "climate.cloudWater",
    "climate.airTemperature",
    "climate.precipPhase",
    "ledger.precipitation",
  ],
  contributes: ["water.surfaceDepth"],
  step(world, _dt) {
    world.runAtmosphereStep();
  },
};
