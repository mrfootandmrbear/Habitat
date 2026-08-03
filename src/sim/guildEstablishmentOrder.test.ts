import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import {
  GUILD_ESTABLISHMENT_ORDER,
  WorldState,
  type GuildEstablishmentId,
} from "./WorldState";
import { habitatProcess } from "./process/habitatProcess";

/**
 * §4.48 — habitat/dispersal determinism hygiene (vegetation/habitat review §2.4).
 * Three defects, three tests: undeclared reads, same-tick guild order
 * dependence (Symmetry), and the annual/seasonal duplicate-HSI drift hazard.
 */
describe("habitat/dispersal determinism hygiene (§4.48)", () => {
  it("habitatProcess declares the terrain and substrate reads runHabitatStep actually makes", () => {
    // runHabitatStep feeds terrain.data into terrainInsolation (light arm) and
    // soilMaterial.data into substrateProps (porosity arm) — both were
    // consumed without being declared (T-005).
    expect(habitatProcess.reads).toContain("terrain.elevation");
    expect(habitatProcess.reads).toContain("soil.material");
  });

  it("guild update order cannot change the result (§2.1 Symmetry)", () => {
    const w = 16;
    const h = 16;

    const make = (order: readonly GuildEstablishmentId[]) => {
      const world = new WorldState(new Grid2D(w, h, 2.5));
      world.setAirTemperature(config.herbTempOptC);
      world.vegCover.fill(0);
      world.soilDepth.fill(config.hsiDepthRefMeters);
      world.soilMoisture.fill(config.soilPorosity * 0.5);
      world.groundwaterStorage.fill(config.hsiGwRefMeters);
      world.soilSalinity.fill(0);
      world.shoreExposure.fill(0.3);
      world.herbBiomass.fill(config.herbBiomassMax * 0.5);
      world.runHabitatStep(1);
      world.runDispersalStep(1);
      world.herbSeedBank.fill(config.seedSourceStrength);
      world.strandSeedBank.fill(config.seedSourceStrength);
      world.binderSeedBank.fill(config.seedSourceStrength);
      world.marshSeedBank.fill(config.seedSourceStrength);
      world.shrubSeedBank.fill(config.seedSourceStrength);
      world.crustSeedBank.fill(config.seedSourceStrength);
      for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1, order);
      return world;
    };

    const canonical = make(GUILD_ESTABLISHMENT_ORDER);
    const reversed = make(
      [...GUILD_ESTABLISHMENT_ORDER].reverse() as GuildEstablishmentId[],
    );
    const shuffled = make([
      "crust",
      "herb",
      "shrub",
      "strand",
      "marsh",
      "binder",
    ]);

    // Sanity: something actually grew, so this isn't a vacuously-equal all-zero case.
    expect(canonical.getHerbBiomass(8, 8)).toBeGreaterThan(0.1);

    expect(reversed.stateHash()).toBe(canonical.stateHash());
    expect(shuffled.stateHash()).toBe(canonical.stateHash());
  });

  it("seasonal establishment reads the annual veg.hsi.* snapshot instead of recomputing it", () => {
    const w = 8;
    const h = 8;

    const setup = (world: WorldState) => {
      world.vegCover.fill(0);
      world.soilDepth.fill(config.hsiDepthRefMeters);
      world.soilMoisture.fill(config.soilPorosity * 0.5);
      world.groundwaterStorage.fill(config.hsiGwRefMeters);
      world.soilSalinity.fill(0);
      world.shoreExposure.fill(0);
      world.runHabitatStep(1);
      world.runDispersalStep(1);
      world.strandSeedBank.fill(config.seedSourceStrength);
    };

    const stable = new WorldState(new Grid2D(w, h, 2.5));
    setup(stable);
    const snapshot = stable.getStrandHsi(4, 4);

    const mutated = new WorldState(new Grid2D(w, h, 2.5));
    setup(mutated);
    expect(mutated.getStrandHsi(4, 4)).toBe(snapshot);
    // Mutate a field strand HSI depends on *after* dispersal already ran —
    // under the old design, runHerbEstablishmentStep recomputed
    // evaluateStrandHsi from live shore.exposure on every seasonal tick, so
    // this would have moved the result. Under §4.48 it must not: the guild's
    // HSI for this year is whatever dispersal already wrote.
    mutated.shoreExposure.fill(1);

    for (let i = 0; i < 8; i++) {
      stable.runHerbEstablishmentStep(1);
      mutated.runHerbEstablishmentStep(1);
    }

    expect(mutated.getStrandHsi(4, 4)).toBe(snapshot);
    expect(mutated.getStrandBiomass(4, 4)).toBeCloseTo(
      stable.getStrandBiomass(4, 4),
      8,
    );
  });
});
