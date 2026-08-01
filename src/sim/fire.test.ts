import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { fuelProcess } from "./process/fuelProcess";
import { fireProcess } from "./process/fireProcess";
import {
  FIRE_NEIGHBORS,
  fireSpreadStrength,
  spreadFireRings,
  type FireNeighborOffsets,
} from "./fire/spreadRings";

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

  describe("fire spread as a rate (§4.44, fire/fuel review §1–§3)", () => {
    /** Rings one call of `runFireStep(dt)` may advance — ROS · Δt / Δx. */
    const ringsFor = (dt: number): number =>
      Math.floor(
        (config.fireRateOfSpreadMetersPerMinute * dt * config.eventDtMinutes) /
          config.cellSizeMeters,
      );

    const litWorld = (w: number): WorldState => {
      const world = new WorldState(new Grid2D(w, w, 2));
      world.fuelLoad.fill(3.0);
      world.soilMoisture.fill(0.05);
      world.vegCover.fill(0.7);
      return world;
    };

    const burnedCells = (world: WorldState): number => {
      let n = 0;
      for (let i = 0; i < world.fireIntensity.data.length; i++) {
        if (world.fireIntensity.data[i]! > 0) n++;
      }
      return n;
    };

    const burningCells = (world: WorldState): number => {
      let n = 0;
      for (let i = 0; i < world.fireBurning.data.length; i++) {
        if (world.fireBurning.data[i]! > 0.5) n++;
      }
      return n;
    };

    it("a longer tick burns further than a short one (dt is live)", () => {
      const w = 40;
      const shortTick = litWorld(w);
      const longTick = litWorld(w);
      shortTick.fireBurning.set(w / 2, w / 2, 1);
      longTick.fireBurning.set(w / 2, w / 2, 1);

      shortTick.runFireStep(1);
      longTick.runFireStep(4);

      const shortArea = burnedCells(shortTick);
      const longArea = burnedCells(longTick);

      // The defect this closes: both calls used to burn the whole connected
      // fuel region, so these two numbers were identical.
      expect(longArea).not.toBe(shortArea);
      expect(longArea).toBeGreaterThan(shortArea);

      // Front reach is linear in dt, so area over a flat uniform sheet grows
      // roughly quadratically — 4x the tick is well past 3x the area.
      expect(ringsFor(4)).toBe(4 * ringsFor(1));
      expect(longArea).toBeGreaterThan(shortArea * 3);

      // Neither tick reached the map edge, so the difference is the rate and
      // not the fuel region running out.
      expect(longArea).toBeLessThan(w * w);
    });

    it("a burn covers exactly the rings its rate allows", () => {
      const w = 40;
      const world = litWorld(w);
      const cx = w / 2;
      const cz = w / 2;
      world.fireBurning.set(cx, cz, 1);

      world.runFireStep(1);

      // 4-neighbour spread from one cell fills a Manhattan diamond.
      const rings = ringsFor(1);
      expect(rings).toBeGreaterThan(0);
      for (let z = 0; z < w; z++) {
        for (let x = 0; x < w; x++) {
          const within = Math.abs(x - cx) + Math.abs(z - cz) <= rings;
          const lit = world.fireIntensity.get(x, z) > 0;
          expect(lit).toBe(within);
        }
      }
    });

    it("burning persists between steps so a fire has visible duration", () => {
      const world = litWorld(16);
      world.fireBurning.set(8, 8, 1);

      world.runFireStep(1);

      // `fire.burning` is a declared written field; before §4.44 every flag was
      // cleared before the call returned, so it was never observably 1 here.
      expect(burningCells(world)).toBeGreaterThan(0);
    });

    it("intensity clears within one tick of the last active cell going out", () => {
      const world = new WorldState(new Grid2D(8, 8, 2));
      world.fuelLoad.fill(0);
      world.soilMoisture.fill(0.05);
      // One isolated fuel cell — nothing for the front to spread into.
      world.fuelLoad.set(4, 4, 1.0);
      world.fireBurning.set(4, 4, 1);

      world.runFireStep(1);
      expect(world.fireIntensity.get(4, 4)).toBeGreaterThan(0);
      // Its fuel is now below the carry threshold, so it has gone out.
      expect(burningCells(world)).toBe(0);

      world.runFireStep(1);

      // The old reset lived in a post-effects loop that the "no sources" early
      // return skipped, so a dead fire reported its last intensity forever.
      expect(world.fireIntensity.get(4, 4)).toBe(0);
      expect(burnedCells(world)).toBe(0);
    });

    it("a stalled front stops consuming fuel once it has burned out", () => {
      const world = new WorldState(new Grid2D(8, 8, 2));
      world.fuelLoad.fill(0);
      world.soilMoisture.fill(0.05);
      world.fuelLoad.set(4, 4, 1.0);
      world.fireBurning.set(4, 4, 1);

      for (let i = 0; i < 5; i++) world.runFireStep(1);
      const settled = world.fuelConsumedLedger;

      for (let i = 0; i < 5; i++) world.runFireStep(1);

      expect(world.fuelConsumedLedger).toBe(settled);
      expect(burningCells(world)).toBe(0);
    });
  });

  describe("burn shape is not an artifact of scan order (review §3)", () => {
    /** Deterministic ridged terrain — the case the old bug was worst on. */
    const ridged = (w: number): Float32Array => {
      const elev = new Float32Array(w * w);
      for (let z = 0; z < w; z++) {
        for (let x = 0; x < w; x++) {
          elev[z * w + x] = 4 * Math.sin(x * 0.7) + 3 * Math.cos(z * 0.5) + x * 0.2;
        }
      }
      return elev;
    };

    const spreadArgs = (w: number, neighbors?: FireNeighborOffsets) => {
      const fuel = new Float32Array(w * w);
      const moisture = new Float32Array(w * w);
      for (let i = 0; i < w * w; i++) {
        // Marginal gates: strengths sit near the threshold, which is where
        // probe order used to decide the outcome.
        fuel[i] = 0.3 + ((i * 7) % 11) * 0.06;
        moisture[i] = 0.10 + ((i * 13) % 9) * 0.015;
      }
      return {
        width: w,
        height: w,
        active: [(w / 2) * w + w / 2],
        burning: new Float32Array(w * w),
        fuel,
        moisture,
        elev: ridged(w),
        maxRings: 6,
        claimed: new Int32Array(w * w),
        stamp: 1,
        cellSizeMeters: config.cellSizeMeters,
        fuelSpreadThreshold: config.fuelSpreadThreshold,
        moistureExtinction: config.fuelMoistureExtinction,
        slopeA: config.fireSlopeFactorA,
        slopeFactorMax: config.fireSlopeFactorMax,
        spreadStrengthMin: config.fireSpreadStrengthMin,
        neighbors,
      };
    };

    it("burn shape is invariant to a rotation of the neighbour-check order", () => {
      const w = 16;
      const base = spreadFireRings(spreadArgs(w));
      expect(base.length).toBeGreaterThan(4); // the case actually spreads

      // Every rotation of N/S/W/E must produce the identical burn.
      for (let shift = 1; shift < FIRE_NEIGHBORS.length; shift++) {
        const rotated = [
          ...FIRE_NEIGHBORS.slice(shift),
          ...FIRE_NEIGHBORS.slice(0, shift),
        ];
        const got = spreadFireRings(spreadArgs(w, rotated));
        expect([...got].sort((a, b) => a - b)).toEqual(
          [...base].sort((a, b) => a - b),
        );
      }
    });

    it("a cell rejected from one neighbour stays probeable from another", () => {
      // Hand-built minimal case for the old `visited`-before-test bug.
      // A(idx 7) sits high above X, so fire probing downhill into X fails.
      // B(idx 17) sits below X, so fire probing uphill into X passes.
      // A is probed first (lower index) — under the old code it marked X
      // visited on the way to failing, and X could never catch from B.
      const w = 5;
      const elev = new Float32Array(w * w);
      const fuel = new Float32Array(w * w);
      const moisture = new Float32Array(w * w);
      const x = 2 * w + 2;
      const a = 1 * w + 2;
      const b = 3 * w + 2;

      elev[x] = 10;
      elev[a] = 30; // 20 m above X over one 10 m cell → steeply downhill probe
      elev[b] = 0; //  10 m below X → uphill probe, fire runs uphill
      fuel[x] = 0.9;
      moisture[x] = 0.125; // moisture factor 0.5

      const burning = new Float32Array(w * w);
      burning[a] = 1;
      burning[b] = 1;

      const ignited = spreadFireRings({
        width: w,
        height: w,
        active: [a, b],
        burning,
        fuel,
        moisture,
        elev,
        maxRings: 1,
        claimed: new Int32Array(w * w),
        stamp: 1,
        cellSizeMeters: config.cellSizeMeters,
        fuelSpreadThreshold: config.fuelSpreadThreshold,
        moistureExtinction: config.fuelMoistureExtinction,
        slopeA: config.fireSlopeFactorA,
        slopeFactorMax: config.fireSlopeFactorMax,
        spreadStrengthMin: config.fireSpreadStrengthMin,
      });

      // Confirm the case is discriminating: the downhill probe really does fail.
      const common = {
        fuel: fuel[x]!,
        moisture: moisture[x]!,
        cellSizeMeters: config.cellSizeMeters,
        fuelSpreadThreshold: config.fuelSpreadThreshold,
        moistureExtinction: config.fuelMoistureExtinction,
        slopeA: config.fireSlopeFactorA,
        slopeFactorMax: config.fireSlopeFactorMax,
      };
      const fromA = fireSpreadStrength({
        ...common,
        riseMeters: elev[x]! - elev[a]!,
      });
      const fromB = fireSpreadStrength({
        ...common,
        riseMeters: elev[x]! - elev[b]!,
      });
      expect(fromA).toBeLessThanOrEqual(config.fireSpreadStrengthMin);
      expect(fromB).toBeGreaterThan(config.fireSpreadStrengthMin);

      expect(ignited).toContain(x);
      expect(burning[x]).toBe(1);
    });
  });

  describe("slope factor saturates (review §5)", () => {
    const face = (moisture: number, riseMeters: number): number =>
      fireSpreadStrength({
        fuel: 1.0,
        moisture,
        riseMeters,
        cellSizeMeters: config.cellSizeMeters,
        fuelSpreadThreshold: config.fuelSpreadThreshold,
        moistureExtinction: config.fuelMoistureExtinction,
        slopeA: config.fireSlopeFactorA,
        slopeFactorMax: config.fireSlopeFactorMax,
      });

    it("a near-vertical sculpted face cannot ignite a nearly-saturated cell", () => {
      // 500 m of rise across one 10 m cell — unclamped this is e^40, which
      // swamps fuel and moisture and makes any cliff an ignition source.
      const nearlyWet = config.fuelMoistureExtinction * 0.996;
      expect(face(nearlyWet, 500)).toBeLessThanOrEqual(
        config.fireSpreadStrengthMin,
      );
    });

    it("the slope term is bounded by the configured ceiling", () => {
      // Dry cell, saturated fuel fraction: strength is exactly the ceiling.
      expect(face(0, 500)).toBeCloseTo(config.fireSlopeFactorMax, 10);
      expect(face(0, 1e6)).toBeCloseTo(config.fireSlopeFactorMax, 10);
      // And the clamp does not disturb ordinary relief.
      expect(face(0, 5)).toBeCloseTo(Math.exp(config.fireSlopeFactorA * 0.5), 10);
    });

    it("moisture still gates a steep dry-side face", () => {
      // Steep and dry catches; steep and wet does not — slope no longer
      // overrides moisture at any sculpted gradient.
      expect(face(0.02, 500)).toBeGreaterThan(config.fireSpreadStrengthMin);
      expect(face(config.fuelMoistureExtinction, 500)).toBe(0);
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
