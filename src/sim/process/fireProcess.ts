import type { Process } from "./Process";

/**
 * Slice 10 — fire spread (BFS from authored ignition, NATURAL_PROCESS_MATH §3.5).
 * Deterministic under T-001: sorted index-order BFS, no random iteration.
 * Gated on fuel load, fuel moisture (soil.moisture), and slope.
 * Authored ignition only while C-003 is Open.
 * Cover kill is a contribute into vegetation-owned `veg.cover` (SIM §11),
 * not a second owner of that field.
 */
export const fireProcess: Process = {
  id: "fire",
  band: "event",
  reads: ["fire.fuelLoad", "soil.moisture", "terrain.elevation"],
  writes: [
    "fire.burning",
    "fire.intensity",
    "fire.scar",
    "ledger.fuelConsumed",
  ],
  contributes: ["veg.cover", "fire.fuelLoad"],
  step(world, dt) {
    world.runFireStep(dt);
  },
};
