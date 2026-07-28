import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";

describe("soil water storage (Slice 4, H-001, H-003)", () => {
  it("infiltrates surface water into soil on daily tick", () => {
    const world = new WorldState(new Grid2D(8, 8, 1));
    world.water.fill(0.2);

    for (let i = 0; i < config.dailyEventSteps; i++) {
      world.stepEvent();
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
        world.stepEvent();
      }
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.stepEvent();
      }
    }

    let soilSum = 0;
    for (let i = 0; i < world.soilMoisture.data.length; i++) {
      soilSum += world.soilMoisture.data[i]!;
    }
    expect(soilSum).toBeGreaterThan(0);
    // Infil transfers to soil; ET leaves soil — ledger tracks both.
    expect(world.infiltrationLedger).toBeCloseTo(
      soilSum + world.etLedger,
      5,
    );
  });
});

describe("mass conservation with ET (H-004, §8.2)", () => {
  it("closes the balance across ≥2 daily bands", () => {
    const world = new WorldState(generateMountain(16, 16, 4, 9));
    const steps = config.dailyEventSteps * 3; // three daily boundaries

    for (let i = 0; i < steps; i++) {
      world.addRain(config.rainDepthPerEvent);
      world.stepEvent();
    }

    expect(world.etLedger).toBeGreaterThan(0);
    const residual = world.waterBalanceResidual();
    const scale = Math.max(1, world.precipitationLedger);
    // §8.2: ≤ 1e-4 relative accumulated over long intervals (f32 fields).
    expect(Math.abs(residual) / scale).toBeLessThan(1e-4);
    // Residual must be tiny vs tracked ET (the former silent sink).
    expect(Math.abs(residual)).toBeLessThan(world.etLedger * 1e-3);
  });

  it("registers ledger.et owned by soilWater", () => {
    const world = new WorldState(new Grid2D(4, 4, 1));
    const field = world.registry.get("ledger.et");
    expect(field.owner).toBe("soilWater");
    expect(field.shape).toBe("scalar");
  });
});
