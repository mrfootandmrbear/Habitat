import type { Process } from "./Process";

/**
 * Slice 8 — soil production + cover-blunted erosion (S-006, S-007, GEO-002).
 * Owns terrain.elevation and soil.depth; bedrock = elev − depth stays consistent.
 */
export const geomorphologyProcess: Process = {
  id: "geomorphology",
  band: "decadal",
  reads: [
    "terrain.elevation",
    "soil.depth",
    "veg.cover",
    "depression.depth",
  ],
  writes: ["terrain.elevation", "soil.depth"],
  lagged: ["veg.cover"],
  step(world, dt) {
    world.runGeomorphologyStep(dt);
  },
};
