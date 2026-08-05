import type { Process } from "./Process";

/**
 * A1 / C-027 §3.3 (BUILD_GUIDE §4.66) — seasonal herbivore insulation step.
 * Same id as the annual `populationsProcess` — second band, disjoint field
 * ownership — exactly the vegetation/vegetationSeasonal pattern. insulation
 * is reversible plasticity (thicker coat each winter, thinner each summer),
 * a different process from the annual-band adaptation traits and must not
 * share their law or their band (§3.3).
 */
export const populationsSeasonalProcess: Process = {
  id: "populations",
  band: "seasonal",
  reads: [
    "climate.airTemperature",
    "pop.herbivore.stage.juvenile",
    "pop.herbivore.stage.adult",
  ],
  writes: ["pop.herbivore.trait.insulation"],
  step(world, dt) {
    world.runPopulationsSeasonalStep(dt);
  },
};
