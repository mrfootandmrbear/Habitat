import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { fuelProcess } from "./process/fuelProcess";
import { fireProcess } from "./process/fireProcess";

describe("fire / fuel (Slice 10, ES-002 / A-002 / T-001)", () => {
  describe("field registration", () => {
    it("registers fire.fuelLoad owned by fuel", () => {
      const world = new WorldState(new Grid2D(8, 8, 2));
      const field = world.registry.get("fire.fuelLoad");
      expect(field.owner).toBe("fuel");
      expect(field.band).toBe("decadal");
      expect(field.shape).toBe("cell");
    });

    it("registers fire.burning owned by fire, event band", () => {
      const world = new WorldState(new Grid2D(8, 8, 2));
      const field = world.registry.get("fire.burning");
      expect(field.owner).toBe("fire");
      expect(field.band).toBe("event");
    });

    it("registers fire.intensity owned by fire, event band", () => {
      const world = new WorldState(new Grid2D(8, 8, 2));
      const field = world.registry.get("fire.intensity");
      expect(field.owner).toBe("fire");
      expect(field.band).toBe("event");
    });

    it("registers ledger.fuelConsumed as scalar", () => {
      const world = new WorldState(new Grid2D(8, 8, 2));
      const field = world.registry.get("ledger.fuelConsumed");
      expect(field.shape).toBe("scalar");
      expect(field.owner).toBe("fire");
    });
  });

  describe("process declarations", () => {
    it("fuelProcess reads veg.cover, writes fire.fuelLoad", () => {
      expect(fuelProcess.reads).toContain("veg.cover");
      expect(fuelProcess.writes).toContain("fire.fuelLoad");
      expect(fuelProcess.band).toBe("decadal");
    });

    it("fireProcess contributes veg.cover kill; owns burning/intensity/fuel", () => {
      expect(fireProcess.reads).toContain("fire.fuelLoad");
      expect(fireProcess.reads).toContain("soil.moisture");
      expect(fireProcess.reads).toContain("terrain.elevation");
      expect(fireProcess.band).toBe("event");
      expect(fireProcess.writes).toContain("fire.burning");
      expect(fireProcess.writes).toContain("fire.intensity");
      expect(fireProcess.writes).not.toContain("veg.cover");
      expect(fireProcess.writes).not.toContain("fire.fuelLoad");
      expect(fireProcess.contributes).toContain("veg.cover");
      expect(fireProcess.contributes).toContain("fire.fuelLoad");
    });
  });

  describe("fuel accumulation (Olson model)", () => {
    it("fuel increases with vegetation cover", () => {
      const world = new WorldState(new Grid2D(8, 8, 2));
      world.vegCover.fill(0.8);
      world.fuelLoad.fill(0);

      for (let i = 0; i < 5; i++) world.runFuelAccumulationStep(1);

      const fuel = world.fuelLoad.get(4, 4);
      expect(fuel).toBeGreaterThan(0);
    });

    it("fuel decays toward zero without vegetation", () => {
      const world = new WorldState(new Grid2D(8, 8, 2));
      world.vegCover.fill(0);
      world.fuelLoad.fill(5.0);

      for (let i = 0; i < 10; i++) world.runFuelAccumulationStep(1);

      const fuel = world.fuelLoad.get(4, 4);
      expect(fuel).toBeLessThan(5.0);
    });

    it("steady-state fuel is bounded by fuelLoadMax", () => {
      const world = new WorldState(new Grid2D(4, 4, 2));
      world.vegCover.fill(1.0);
      world.fuelLoad.fill(0);

      for (let i = 0; i < 200; i++) world.runFuelAccumulationStep(1);

      const fuel = world.fuelLoad.get(2, 2);
      expect(fuel).toBeLessThanOrEqual(config.fuelLoadMax);
      expect(fuel).toBeGreaterThan(0);
    });

    it("higher cover produces more fuel (monotonicity)", () => {
      const w = 8;
      const world = new WorldState(new Grid2D(w, w, 2));
      world.fuelLoad.fill(0);
      world.vegCover.set(0, 0, 0.2);
      world.vegCover.set(1, 0, 0.9);

      for (let i = 0; i < 10; i++) world.runFuelAccumulationStep(1);

      expect(world.fuelLoad.get(1, 0)).toBeGreaterThan(
        world.fuelLoad.get(0, 0),
      );
    });
  });

  describe("fire spread (BFS, determinism)", () => {
    it("fire does not spread without fuel", () => {
      const world = new WorldState(new Grid2D(8, 8, 2));
      world.fuelLoad.fill(0);
      world.soilMoisture.fill(0.05);
      world.fireBurning.set(4, 4, 1);

      world.runFireStep(1);

      // Only the ignition cell should have burned (intensity > 0), neighbors did not spread
      let burningAfter = 0;
      for (let i = 0; i < world.fireBurning.data.length; i++) {
        burningAfter += world.fireBurning.data[i]!;
      }
      expect(burningAfter).toBe(0); // all cleared after burn
    });

    it("fire spreads through fueled, dry cells", () => {
      const w = 12;
      const world = new WorldState(new Grid2D(w, w, 2));
      world.fuelLoad.fill(3.0);
      world.soilMoisture.fill(0.05);
      world.fireBurning.set(6, 6, 1);

      world.runFireStep(1);

      // Fuel should be consumed across multiple cells
      let consumed = 0;
      for (let i = 0; i < world.fuelLoad.data.length; i++) {
        if (world.fuelLoad.data[i]! < 3.0) consumed++;
      }
      expect(consumed).toBeGreaterThan(1);
    });

    it("wet ground stops fire (moisture coupling)", () => {
      const w = 12;
      const world = new WorldState(new Grid2D(w, w, 2));
      world.fuelLoad.fill(3.0);
      world.soilMoisture.fill(0.05);
      // Create a wet barrier across the middle
      for (let x = 0; x < w; x++) {
        world.soilMoisture.set(x, 6, config.fuelMoistureExtinction + 0.01);
      }
      world.fireBurning.set(6, 3, 1);

      world.runFireStep(1);

      // Cells below the wet barrier (z > 6) should retain full fuel
      for (let x = 0; x < w; x++) {
        for (let z = 8; z < w; z++) {
          expect(world.fuelLoad.get(x, z)).toBe(3.0);
        }
      }
    });

    it("determinism: same state → same result (T-001)", () => {
      const setup = () => {
        const world = new WorldState(new Grid2D(16, 16, 2));
        world.fuelLoad.fill(2.5);
        world.soilMoisture.fill(0.1);
        world.vegCover.fill(0.6);
        world.fireBurning.set(8, 8, 1);
        return world;
      };

      const a = setup();
      const b = setup();
      a.runFireStep(1);
      b.runFireStep(1);

      expect(a.stateHash()).toBe(b.stateHash());
      expect(a.fuelConsumedLedger).toBe(b.fuelConsumedLedger);
    });

    it("fire consumes fuel and kills vegetation (conservation)", () => {
      const w = 8;
      const world = new WorldState(new Grid2D(w, w, 2));
      world.fuelLoad.fill(4.0);
      world.vegCover.fill(0.8);
      world.soilMoisture.fill(0.05);

      const totalFuelBefore = sumArray(world.fuelLoad.data);
      const totalCoverBefore = sumArray(world.vegCover.data);

      world.fireBurning.set(4, 4, 1);
      world.runFireStep(1);

      const totalFuelAfter = sumArray(world.fuelLoad.data);
      const totalCoverAfter = sumArray(world.vegCover.data);

      // Fuel consumed matches the ledger
      const fuelDelta = totalFuelBefore - totalFuelAfter;
      expect(Math.abs(fuelDelta - world.fuelConsumedLedger)).toBeLessThan(1e-4);
      // Cover reduced
      expect(totalCoverAfter).toBeLessThan(totalCoverBefore);
    });

    it("bounds: no NaN or out-of-range after fire", () => {
      const world = new WorldState(new Grid2D(12, 12, 2));
      world.fuelLoad.fill(5.0);
      world.soilMoisture.fill(0.1);
      world.vegCover.fill(0.9);
      world.fireBurning.set(6, 6, 1);

      world.runFireStep(1);
      // Should not throw
      world.registry.assertBounds("fire-test");
    });
  });

  describe("authored ignition (C-003)", () => {
    it("igniteCell marks cells within brush radius", () => {
      const world = new WorldState(new Grid2D(16, 16, 2));
      world.fuelLoad.fill(2.0);

      world.igniteCell(8, 8);

      let ignited = 0;
      for (let i = 0; i < world.fireBurning.data.length; i++) {
        if (world.fireBurning.data[i]! > 0.5) ignited++;
      }
      expect(ignited).toBeGreaterThan(0);
    });

    it("ignition does not mark cells below fuel threshold", () => {
      const world = new WorldState(new Grid2D(16, 16, 2));
      world.fuelLoad.fill(0);

      world.igniteCell(8, 8);

      let ignited = 0;
      for (let i = 0; i < world.fireBurning.data.length; i++) {
        if (world.fireBurning.data[i]! > 0.5) ignited++;
      }
      expect(ignited).toBe(0);
    });
  });

  describe("post-fire recovery differs by moisture (probe-level)", () => {
    it("wet patch recovers cover faster than dry patch after identical burn", () => {
      const w = 8;
      const world = new WorldState(new Grid2D(w, w, 2));
      world.fuelLoad.fill(3.0);
      world.soilMoisture.fill(0.05);
      world.vegCover.fill(0.8);

      // Burn everything
      for (let i = 0; i < world.fireBurning.data.length; i++) {
        world.fireBurning.data[i] = 1;
      }
      world.runFireStep(1);

      // Set up moisture difference
      const wetCell = 0 * w + 2;
      const dryCell = 0 * w + 5;
      world.soilMoisture.data[wetCell] = 0.35;
      world.soilMoisture.data[dryCell] = 0.02;

      // Run vegetation recovery
      for (let i = 0; i < 30; i++) world.runVegetationStep(1);

      expect(world.vegCover.data[wetCell]).toBeGreaterThan(
        world.vegCover.data[dryCell]!,
      );
    });
  });
});

function sumArray(arr: Float32Array): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i]!;
  return s;
}
