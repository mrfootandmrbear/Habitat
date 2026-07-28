import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";

describe("soil water storage (Slice 4, H-001, H-003)", () => {
  it("infiltrates surface water into soil on daily tick", () => {
    const world = new WorldState(new Grid2D(8, 8, 1));
    world.water.fill(0.2);

    for (let i = 0; i < config.dailyEventSteps; i++) {
      world.stepEvent(config.simDt);
    }

    let soilSum = 0;
    for (let i = 0; i < world.soilMoisture.data.length; i++) {
      soilSum += world.soilMoisture.data[i]!;
    }
    expect(soilSum).toBeGreaterThan(0);
    expect(world.infiltrationLedger).toBeGreaterThan(0);
  });

  it("accumulates soil moisture across repeated rain and daily cycles", () => {
    const world = new WorldState(new Grid2D(10, 10, 1));

    for (let cycle = 0; cycle < 2; cycle++) {
      for (let i = 0; i < 40; i++) {
        world.addRain(0.04);
        world.stepEvent(config.simDt);
      }
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.stepEvent(config.simDt);
      }
    }

    let soilSum = 0;
    for (let i = 0; i < world.soilMoisture.data.length; i++) {
      soilSum += world.soilMoisture.data[i]!;
    }
    expect(soilSum).toBeGreaterThan(0);
    expect(world.infiltrationLedger).toBeGreaterThan(soilSum);
  });
});
