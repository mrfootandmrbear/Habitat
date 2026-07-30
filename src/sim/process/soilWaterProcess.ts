import type { Process } from "./Process";

/**
 * Daily soil moisture: infiltration uses lagged capacity (Slice 6);
 * insolation- and cover-dependent ET (dry-down / NATURAL_PROCESS_MATH §1.6–1.7).
 * Cover is lagged so soil runs before vegetation (cycle break).
 * Slice 20: owns soil.salinity — ocean mix + dilute/concentrate on the water
 * column (C-018); no separate salt ledger.
 */
export const soilWaterProcess: Process = {
  id: "soilWater",
  band: "daily",
  reads: [
    "water.surfaceDepth",
    "soil.moisture",
    "soil.salinity",
    "soil.material",
    "soil.infiltrationCapacity",
    "terrain.elevation",
    "veg.cover",
  ],
  /** Capacity + cover from prior vegetation contribution (cycle break). */
  lagged: ["soil.infiltrationCapacity", "veg.cover"],
  writes: [
    "soil.moisture",
    "soil.salinity",
    "soil.infiltrationCapacity",
    "et.potential",
    "et.actual",
    "ledger.et",
    "ledger.transpiration",
    "ledger.soilEvaporation",
    "ledger.openWaterEvaporation",
  ],
  /** Infiltration removes surface water owned by surfaceWater (§11 contribute). */
  contributes: ["water.surfaceDepth"],
  step(world, dt) {
    world.runSoilWaterStep(dt);
  },
};
