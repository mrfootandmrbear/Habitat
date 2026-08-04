import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { habitatProcess } from "./process/habitatProcess";
import { nextHerbBiomass } from "./habitat/arrivalComposition";

/**
 * §4.48 — habitat/dispersal determinism hygiene.
 * Vegetation/habitat review §2.4: undeclared reads on habitatProcess, a
 * same-tick Gauss-Seidel order dependence in runHerbEstablishmentStep, and
 * a double-computed guild HSI silently able to disagree with what actually
 * drove growth.
 */
describe("§4.48 habitat/dispersal determinism hygiene", () => {
  it("habitatProcess declares the fields runHabitatStep actually reads", () => {
    // runHabitatStep reads this.terrain.data (aspect/slope insolation) and
    // this.soilMaterial.data (porosity lookup) without either being declared
    // — invisible to any future scheduler dependency analysis (T-005).
    expect(habitatProcess.reads).toContain("terrain.elevation");
    expect(habitatProcess.reads).toContain("soil.material");
  });

  it("registers the cached guild-HSI fields with the dispersal owner, annual band", () => {
    const world = new WorldState(new Grid2D(4, 4, 1));
    for (const guild of ["strand", "binder", "marsh", "shrub", "crust"]) {
      const entry = world.registry.get(`veg.hsi.${guild}`);
      expect(entry.owner).toBe("dispersal");
      expect(entry.band).toBe("annual");
    }
  });

  function makeFixture(): WorldState {
    const w = 8;
    const h = 8;
    const world = new WorldState(new Grid2D(w, h, 2.5));
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.4);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.shoreExposure.fill(0.5);
    // Give every guild standing biomass so shrub facilitation (herb) and
    // crust's five-guild shade term are both actually exercised, not zero.
    world.herbBiomass.fill(config.herbBiomassMax * 0.5);
    world.strandBiomass.fill(config.strandBiomassMax * 0.3);
    world.binderBiomass.fill(config.binderBiomassMax * 0.3);
    world.marshBiomass.fill(config.marshBiomassMax * 0.2);
    world.shrubBiomass.fill(config.shrubBiomassMax * 0.4);
    world.crustBiomass.fill(config.crustBiomassMax * 0.1);
    world.herbSeedBank.fill(config.seedSourceStrength);
    world.strandSeedBank.fill(config.seedSourceStrength);
    world.binderSeedBank.fill(config.seedSourceStrength);
    world.marshSeedBank.fill(config.seedSourceStrength);
    world.shrubSeedBank.fill(config.seedSourceStrength);
    world.crustSeedBank.fill(config.seedSourceStrength);
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    return world;
  }

  it("runHerbEstablishmentStep reads the cached HSI, not a fresh recompute", () => {
    const world = makeFixture();
    const n = world.width * world.height;
    // Every cached HSI value must be a finite fraction in [0,1] — the whole
    // point of the cache is that this is the number that actually drove
    // growth, not a placeholder.
    for (const grid of [
      world.strandHsi,
      world.binderHsi,
      world.marshHsi,
      world.shrubHsi,
      world.crustHsi,
    ]) {
      for (let i = 0; i < n; i++) {
        const v = grid.data[i]!;
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
    expect(Math.max(...world.shrubHsi.data)).toBeGreaterThan(0);
  });

  it("guild establishment order is commutative — reordering the six updates is byte-identical", () => {
    const world = makeFixture();
    const i = 27; // interior cell, non-edge
    const scale = 1 * world.seasonPressure;

    // Snapshot every input the six guild updates depend on, exactly as
    // runHerbEstablishmentStep reads it: own prior biomass, own seed bank,
    // own cached HSI (or the daily habitat.suitability spine for herb).
    const inputs = {
      herb: {
        biomass: world.herbBiomass.data[i]!,
        seedBank: world.herbSeedBank.data[i]!,
        hsi: world.habitatSuitability.data[i]!,
        establishmentScale: config.herbEstablishmentScale,
        establishmentRate: config.herbEstablishmentRate,
        mortalityRate: config.herbMortalityRate,
        biomassMax: config.herbBiomassMax,
      },
      strand: {
        biomass: world.strandBiomass.data[i]!,
        seedBank: world.strandSeedBank.data[i]!,
        hsi: world.strandHsi.data[i]!,
        establishmentScale: config.strandEstablishmentScale,
        establishmentRate: config.strandEstablishmentRate,
        mortalityRate: config.strandMortalityRate,
        biomassMax: config.strandBiomassMax,
      },
      binder: {
        biomass: world.binderBiomass.data[i]!,
        seedBank: world.binderSeedBank.data[i]!,
        hsi: world.binderHsi.data[i]!,
        establishmentScale: config.binderEstablishmentScale,
        establishmentRate: config.binderEstablishmentRate,
        mortalityRate: config.binderMortalityRate,
        biomassMax: config.binderBiomassMax,
      },
      marsh: {
        biomass: world.marshBiomass.data[i]!,
        seedBank: world.marshSeedBank.data[i]!,
        hsi: world.marshHsi.data[i]!,
        establishmentScale: config.marshEstablishmentScale,
        establishmentRate: config.marshEstablishmentRate,
        mortalityRate: config.marshMortalityRate,
        biomassMax: config.marshBiomassMax,
      },
      shrub: {
        biomass: world.shrubBiomass.data[i]!,
        seedBank: world.shrubSeedBank.data[i]!,
        hsi: world.shrubHsi.data[i]!,
        establishmentScale: config.shrubEstablishmentScale,
        establishmentRate: config.shrubEstablishmentRate,
        mortalityRate: config.shrubMortalityRate,
        biomassMax: config.shrubBiomassMax,
      },
      crust: {
        biomass: world.crustBiomass.data[i]!,
        seedBank: world.crustSeedBank.data[i]!,
        hsi: world.crustHsi.data[i]!,
        establishmentScale: config.crustEstablishmentScale,
        establishmentRate: config.crustEstablishmentRate,
        mortalityRate: config.crustMortalityRate,
        biomassMax: config.crustBiomassMax,
      },
    } as const;
    const order: (keyof typeof inputs)[] = [
      "herb",
      "strand",
      "binder",
      "marsh",
      "shrub",
      "crust",
    ];

    const apply = (g: (typeof inputs)[keyof typeof inputs]): number =>
      nextHerbBiomass({
        biomass: g.biomass,
        seedBank: g.seedBank,
        habitatSuitability: g.hsi,
        establishmentScale: g.establishmentScale,
        establishmentRate: g.establishmentRate,
        mortalityRate: g.mortalityRate,
        biomassMax: g.biomassMax,
        dt: scale,
      });

    // Forward order (matches source) and reverse order both computed from
    // the same tick-start snapshot above — if any guild secretly depended on
    // a sibling's already-written result, forward and reverse would diverge.
    const forward: Record<string, number> = {};
    for (const g of order) forward[g] = apply(inputs[g]);
    const reverse: Record<string, number> = {};
    for (const g of [...order].reverse()) reverse[g] = apply(inputs[g]);
    for (const g of order) expect(forward[g]).toBe(reverse[g]);

    // And both match what the real (forward-order) step actually produced,
    // modulo the f32 rounding every *Biomass field applies on store (the
    // hand computation above stays in f64 throughout).
    world.runHerbEstablishmentStep(1);
    expect(world.herbBiomass.data[i]).toBe(Math.fround(forward.herb));
    expect(world.strandBiomass.data[i]).toBe(Math.fround(forward.strand));
    expect(world.binderBiomass.data[i]).toBe(Math.fround(forward.binder));
    expect(world.marshBiomass.data[i]).toBe(Math.fround(forward.marsh));
    expect(world.shrubBiomass.data[i]).toBe(Math.fround(forward.shrub));
    expect(world.crustBiomass.data[i]).toBe(Math.fround(forward.crust));
  });
});
