import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";

describe("band dt refinement (S-009 / SIMULATION_MODEL §8.3)", () => {
  it("halved daily dt over twice as many steps converges on ET and moisture", () => {
    // Field-capacity moisture keeps stress = 1 so PET scaling is linear in dt.
    const seedMoisture = config.soilPorosity * config.etFieldCapacityFraction;
    const full = new WorldState(new Grid2D(6, 6, 2));
    const half = new WorldState(new Grid2D(6, 6, 2));
    full.soilMoisture.fill(seedMoisture);
    half.soilMoisture.fill(seedMoisture);
    full.vegCover.fill(0);
    half.vegCover.fill(0);

    full.runSoilWaterStep(1);
    half.runSoilWaterStep(0.5);
    half.runSoilWaterStep(0.5);

    const fullEt = full.etLedger;
    const halfEt = half.etLedger;
    expect(Math.abs(halfEt - fullEt) / Math.max(fullEt, 1e-9)).toBeLessThan(0.05);
    expect(half.soilMoisture.get(0, 0)).toBeCloseTo(full.soilMoisture.get(0, 0), 3);
  });

  it("halved vegetation dt converges cover under fixed moisture and light", () => {
    const full = new WorldState(new Grid2D(6, 6, 2));
    const half = new WorldState(new Grid2D(6, 6, 2));
    full.soilMoisture.fill(0.25);
    half.soilMoisture.fill(0.25);
    full.vegCover.fill(0.1);
    half.vegCover.fill(0.1);

    for (let i = 0; i < 10; i++) full.runVegetationStep(1);
    for (let i = 0; i < 20; i++) half.runVegetationStep(0.5);

    // Logistic growth is nonlinear — refine, don't require bit-identity.
    const fullCover = mean(full.vegCover.data);
    const halfCover = mean(half.vegCover.data);
    expect(Math.abs(halfCover - fullCover) / Math.max(fullCover, 1e-6)).toBeLessThan(
      0.08,
    );
  });

  it("zero dt leaves soil moisture and ET unchanged", () => {
    const world = new WorldState(new Grid2D(4, 4, 2));
    world.soilMoisture.fill(0.3);
    const before = world.soilMoisture.data.slice();
    world.runSoilWaterStep(0);
    expect([...world.soilMoisture.data]).toEqual([...before]);
    expect(world.etLedger).toBe(0);
  });
});

function mean(data: Float32Array): number {
  let total = 0;
  for (let i = 0; i < data.length; i++) total += data[i]!;
  return total / data.length;
}
