import { describe, expect, it } from "vitest";
import {
  BranchSession,
  branchMoistureEncodingDelta,
  captureBranch,
  forkWorld,
  materializeBranch,
} from "./branch";
import {
  applyForces,
  captureForcesFromWorld,
  forcesEqual,
  type ForceSettings,
} from "./forceSettings";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";

const baseForces: ForceSettings = {
  rain: "light",
  heat: "warm",
  sea: "none",
  tide: "off",
  wind: "calm",
  season: "typical",
  erosion: "moderate",
};

function seededWorld(): WorldState {
  const world = new WorldState(generateMountain(12, 12, 4, 7));
  applyForces(world, baseForces);
  return world;
}

describe("force settings (C-005 / C-004)", () => {
  it("apply + capture round-trips dial IDs", () => {
    const world = seededWorld();
    const wet: ForceSettings = {
      ...baseForces,
      rain: "heavy",
      wind: "west",
      heat: "cold",
    };
    applyForces(world, wet);
    expect(forcesEqual(captureForcesFromWorld(world), wet)).toBe(true);
  });
});

describe("branch fork (C-005 / P-005 / T-001)", () => {
  // Comparison is for understanding, not scoring (N-002).
  it("fork preserves state hash at the branch point", () => {
    const world = seededWorld();
    world.raiseBerm(6, 6);
    const hash = world.stateHash();
    const forked = forkWorld(world);
    expect(forked.stateHash()).toBe(hash);
    expect(forked).not.toBe(world);
  });

  it("same seed + same forces → identical hash after N steps", () => {
    const world = seededWorld();
    const a = forkWorld(world, baseForces);
    const b = forkWorld(world, baseForces);
    for (let i = 0; i < 24; i++) {
      a.stepEvent();
      b.stepEvent();
    }
    expect(a.stateHash()).toBe(b.stateHash());
  });

  it("different rain forces diverge hashes (isolation)", () => {
    const world = seededWorld();
    const dry = forkWorld(world, { ...baseForces, rain: "dry" });
    const wet = forkWorld(world, { ...baseForces, rain: "heavy" });
    // Atmosphere delivery needs a multi-day window (same order as regime-divergence).
    for (let i = 0; i < 8 * 96; i++) {
      dry.stepEvent();
      wet.stepEvent();
    }
    expect(dry.stateHash()).not.toBe(wet.stateHash());
    expect(wet.precipitationLedger).toBeGreaterThan(dry.precipitationLedger);
  });

  it("mutating branch A never touches branch B", () => {
    const world = seededWorld();
    const session = BranchSession.open(world, baseForces);
    const control = forkWorld(world, baseForces);
    session.setActive("a");
    session.applyForcesToActive({ ...baseForces, rain: "heavy" });
    session.a.raiseBerm(4, 4);
    for (let i = 0; i < 12; i++) {
      session.stepBoth();
      control.stepEvent();
    }
    expect(session.b.stateHash()).toBe(control.stateHash());
    expect(session.forcesOn("b").rain).toBe("light");
    expect(session.forcesOn("a").rain).toBe("heavy");
  });

  it("materializeBranch restores captureBranch document", () => {
    const world = seededWorld();
    world.digChannel(3, 3);
    const doc = captureBranch(world, baseForces);
    const again = materializeBranch(doc);
    expect(again.stateHash()).toBe(world.stateHash());
  });

  it("moisture compare encoding clears floor after force split", () => {
    const session = BranchSession.open(seededWorld(), {
      ...baseForces,
      rain: "dry",
    });
    applyForces(session.a, { ...baseForces, rain: "heavy" });
    applyForces(session.b, { ...baseForces, rain: "dry" });
    for (let i = 0; i < 8 * 96; i++) session.stepBoth();
    let meanA = 0;
    let meanB = 0;
    const n = session.a.soilMoisture.data.length;
    for (let i = 0; i < n; i++) {
      meanA += session.a.soilMoisture.data[i]!;
      meanB += session.b.soilMoisture.data[i]!;
    }
    meanA /= n;
    meanB /= n;
    expect(branchMoistureEncodingDelta(meanA, meanB)).toBeGreaterThan(0.15);
    const out = new Float32Array(n);
    session.setActive("a");
    session.compareMode = true;
    const maxStrength = session.fillMoistureCompareDelta(out);
    expect(maxStrength).toBeGreaterThan(0.15);
  });
});
