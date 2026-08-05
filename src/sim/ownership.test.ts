import { describe, expect, it } from "vitest";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";
import { surfaceWaterProcess } from "./process/surfaceWaterProcess";
import { soilWaterProcess } from "./process/soilWaterProcess";
import { vegetationProcess } from "./process/vegetationProcess";
import { geomorphologyProcess } from "./process/geomorphologyProcess";
import { groundwaterProcess } from "./process/groundwaterProcess";
import { habitatProcess } from "./process/habitatProcess";
import { fuelProcess } from "./process/fuelProcess";
import { fireProcess } from "./process/fireProcess";
import { dispersalProcess } from "./process/dispersalProcess";
import { vegetationSeasonalProcess } from "./process/vegetationSeasonalProcess";
import { atmosphereProcess } from "./process/atmosphereProcess";
import { populationsProcess } from "./process/populationsProcess";
import { populationsSeasonalProcess } from "./process/populationsSeasonalProcess";
import type { Process } from "./process/Process";

const PROCESSES: Process[] = [
  atmosphereProcess,
  surfaceWaterProcess,
  soilWaterProcess,
  groundwaterProcess,
  habitatProcess,
  vegetationProcess,
  vegetationSeasonalProcess,
  dispersalProcess,
  populationsProcess,
  populationsSeasonalProcess,
  geomorphologyProcess,
  fuelProcess,
  fireProcess,
];

describe("process ownership (§4 / §5 / §11)", () => {
  it("every write target is owned by the writing process", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    for (const process of PROCESSES) {
      for (const fieldId of process.writes) {
        const field = world.registry.get(fieldId);
        expect(
          field.owner,
          `${process.id} writes ${fieldId} but owner is ${field.owner}`,
        ).toBe(process.id);
      }
    }
  });

  it("contributes target fields owned by someone else", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    for (const process of PROCESSES) {
      for (const fieldId of process.contributes ?? []) {
        const field = world.registry.get(fieldId);
        expect(
          field.owner,
          `${process.id} should not own contributed ${fieldId}`,
        ).not.toBe(process.id);
      }
    }
  });

  it("soilWater declares contribute on water.surfaceDepth (infil debit)", () => {
    expect(soilWaterProcess.contributes).toContain("water.surfaceDepth");
  });

  it("fire contributes veg.cover kill instead of owning it", () => {
    expect(fireProcess.writes).not.toContain("veg.cover");
    expect(fireProcess.contributes).toContain("veg.cover");
    expect(fireProcess.contributes).toContain("veg.biomass.herb");
    expect(fireProcess.writes).not.toContain("veg.biomass.herb");
    expect(vegetationProcess.writes).toContain("veg.cover");
  });

  it("populations contributes grazing into veg.biomass.herb instead of owning it (C-027 §4.6.3)", () => {
    expect(populationsProcess.writes).not.toContain("veg.biomass.herb");
    expect(populationsProcess.contributes).toContain("veg.biomass.herb");
    expect(vegetationSeasonalProcess.writes).toContain("veg.biomass.herb");
  });

  it("populations owns herbivore fields across both its bands", () => {
    expect(populationsProcess.writes).toContain("pop.herbivore.density");
    expect(populationsSeasonalProcess.writes).toContain(
      "pop.herbivore.trait.insulation",
    );
  });
});

describe("scheduler order (SIMULATION_MODEL §5.1)", () => {
  it("orders daily soilWater before groundwater (recharge reads moisture)", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    const ids = world.scheduler.orderedForBand("daily").map((p) => p.id);
    expect(ids.indexOf("soilWater")).toBeLessThan(ids.indexOf("groundwater"));
  });

  it("orders daily soilWater before vegetation (veg reads moisture)", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    const ids = world.scheduler.orderedForBand("daily").map((p) => p.id);
    expect(ids.indexOf("soilWater")).toBeLessThan(ids.indexOf("vegetation"));
  });

  it("breaks veg↔soil infil cycle via lagged capacity", () => {
    expect(soilWaterProcess.lagged).toContain("soil.infiltrationCapacity");
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    expect(() => world.scheduler.orderedForBand("daily")).not.toThrow();
  });

  it("orders event climate before surfaceWater (cloud → precip → route)", () => {
    const world = new WorldState(generateMountain(8, 8, 2, 1));
    const ids = world.scheduler.orderedForBand("event").map((p) => p.id);
    expect(ids.indexOf("climate")).toBeLessThan(ids.indexOf("surfaceWater"));
  });
});
