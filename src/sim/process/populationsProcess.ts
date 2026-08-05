import type { Process } from "./Process";

/**
 * A1 / C-027 (BUILD_GUIDE §4.66) — first `populations` band process
 * (SIMULATION_MODEL §3.7). Annual band: stage-structured demography toward
 * a habitat/forage-derived capacity (never stored — ES-006), turnover-
 * derived trait-rate movement for limbLength (terrain ruggedness) and
 * webbing (tidal hydroperiod, NS-008) plus its hysteresis latch, and the
 * grazing write-back into veg.biomass.herb (§4.6.3 — a herbivore that never
 * eats is decorative wildlife, N-005). insulation moves on the seasonal
 * band instead (populationsSeasonalProcess) — same id, second band, same
 * pattern vegetation/vegetationSeasonal already ship.
 *
 * D-007 clip gate applies: this is the first slice to register a new
 * Process. The clip verdict is recorded in BUILD_GUIDE §4.66 once the
 * owner has judged it (docs/playtests/A1-herbivore.md).
 */
export const populationsProcess: Process = {
  id: "populations",
  band: "annual",
  reads: [
    "veg.biomass.herb",
    "habitat.suitability",
    "terrain.elevation",
  ],
  lagged: ["veg.biomass.herb"],
  writes: [
    "pop.herbivore.density",
    "pop.herbivore.stage.juvenile",
    "pop.herbivore.stage.adult",
    "pop.herbivore.occupancy",
    "pop.herbivore.trait.limbLength",
    "pop.herbivore.trait.webbing",
    "pop.herbivore.swap.webbing",
  ],
  contributes: ["veg.biomass.herb"],
  step(world, dt) {
    world.runPopulationsAnnualStep(dt);
  },
};
