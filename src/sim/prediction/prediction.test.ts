import { describe, expect, it } from "vitest";
import { config } from "../../config";
import { generateMountain } from "../terrain/generateMountain";
import { WorldState } from "../WorldState";
import {
  PredictionSession,
  predictionObserver,
  snapshotWaterReader,
} from "./PredictionSession";

describe("P-006 prediction observer contract", () => {
  it("declares reads and empty writes (write isolation)", () => {
    expect(predictionObserver.writes).toEqual([]);
    expect(predictionObserver.reads).toContain("water.depth");
  });
});

describe("PredictionSession write isolation", () => {
  it("compare does not mutate water, terrain, soil, or ledgers", () => {
    const world = new WorldState(generateMountain(16, 16, 4, 7));
    world.water.fill(0.05);
    const session = new PredictionSession(16, 16);
    session.toggleMark(8, 8);
    session.commit(0);

    const hashBefore = world.stateHash();
    const waterBefore = world.water.data.slice();
    const terrainBefore = world.terrain.data.slice();
    const soilBefore = world.soilMoisture.data.slice();
    const precip = world.precipitationLedger;
    const infil = world.infiltrationLedger;
    const et = world.etLedger;

    const reader = snapshotWaterReader(16, 16, world.water.data);
    session.compare(reader);

    expect(world.stateHash()).toBe(hashBefore);
    expect([...world.water.data]).toEqual([...waterBefore]);
    expect([...world.terrain.data]).toEqual([...terrainBefore]);
    expect([...world.soilMoisture.data]).toEqual([...soilBefore]);
    expect(world.precipitationLedger).toBe(precip);
    expect(world.infiltrationLedger).toBe(infil);
    expect(world.etLedger).toBe(et);
  });

  it("toggleMark / commit never touch WorldState buffers", () => {
    const world = new WorldState(generateMountain(12, 12, 3, 2));
    const hashBefore = world.stateHash();
    const session = new PredictionSession(12, 12);
    session.toggleMark(3, 4);
    session.toggleMark(5, 5);
    session.commit(10);
    expect(world.stateHash()).toBe(hashBefore);
  });
});

describe("PredictionSession compare semantics", () => {
  it("classifies hit, miss, and unexpected", () => {
    const session = new PredictionSession(4, 4);
    session.toggleMark(1, 1); // will be wet → hit
    session.toggleMark(2, 2); // stay dry → miss
    session.commit(0);

    const depths = new Float32Array(16);
    depths[1 * 4 + 1] = 0.1;
    depths[0 * 4 + 0] = 0.1; // unexpected wet

    const result = session.compare(
      snapshotWaterReader(4, 4, depths),
      config.predictionWetThreshold,
    );
    expect(result.hits).toBe(1);
    expect(result.misses).toBe(1);
    expect(result.unexpected).toBe(1);
    expect(session.phase).toBe("compared");
  });

  it("same marks + same depths → identical compare (determinism)", () => {
    const sessionA = new PredictionSession(8, 8);
    const sessionB = new PredictionSession(8, 8);
    for (const [x, z] of [
      [2, 2],
      [3, 4],
      [5, 1],
    ] as const) {
      sessionA.toggleMark(x, z);
      sessionB.toggleMark(x, z);
    }
    sessionA.commit(0);
    sessionB.commit(0);

    const depths = new Float32Array(64);
    depths[2 * 8 + 2] = 0.2;
    depths[7 * 8 + 7] = 0.15;

    const a = sessionA.compare(snapshotWaterReader(8, 8, depths));
    const b = sessionB.compare(snapshotWaterReader(8, 8, depths));
    expect(a.hits).toBe(b.hits);
    expect(a.misses).toBe(b.misses);
    expect(a.unexpected).toBe(b.unexpected);
    expect([...a.classify]).toEqual([...b.classify]);
  });

  it("auto-compare fires after predictionHorizonSteps", () => {
    const session = new PredictionSession(4, 4);
    session.toggleMark(0, 0);
    session.commit(100);
    expect(session.shouldAutoCompare(100)).toBe(false);
    expect(
      session.shouldAutoCompare(100 + config.predictionHorizonSteps),
    ).toBe(true);
  });
});
