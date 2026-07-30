import type { Process } from "./Process";

/**
 * Slice 8 — soil production + cover-blunted erosion (S-006, S-007, GEO-002).
 * Slice 18 — coastal wave work from shore.exposure (C-017) integrates here:
 * geomorphology is the sole sediment writer (no SWE, no second process).
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
    "shore.exposure",
  ],
  writes: ["terrain.elevation", "soil.depth", "ledger.shoreErosion"],
  lagged: ["veg.cover"],
  step(world, dt) {
    world.runGeomorphologyStep(dt);
  },
};
