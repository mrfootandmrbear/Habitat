import type { Process } from "./Process";

/**
 * Slice 10 — fire spread (BFS from authored ignition, NATURAL_PROCESS_MATH §3.5).
 * Rate-limited since §4.44: the front advances `ROS · dt / Δx` cell-rings per
 * step and `fire.burning` persists on cells that still carry fuel, so a burn
 * has duration rather than consuming a whole fuel region in one call.
 * Deterministic under T-001: the front is re-sorted ascending each ring and
 * ignition is independent of neighbour-check order — both asserted in
 * `fire.test.ts`, not merely asserted here.
 * Gated on fuel load, fuel moisture (soil.moisture), and a slope factor that
 * saturates rather than growing without bound on sculpted relief.
 * Authored ignition only while C-003 is Open.
 * Cover + guild-biomass kill are contributes into vegetation-owned fields
 * (SIM §11), not a second owner of those fields. Biomass must die with cover
 * so OccupantMesh (which reads guild biomass) does not leave standing shoots
 * on a burned cell (Wave 0 / ES-004 disturbance legibility).
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
  contributes: [
    "veg.cover",
    "veg.biomass.herb",
    "veg.biomass.strand",
    "veg.biomass.binder",
    "veg.biomass.marsh",
    "veg.biomass.shrub",
    "veg.biomass.crust",
    "fire.fuelLoad",
  ],
  step(world, dt) {
    world.runFireStep(dt);
  },
};
