import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { erosionById } from "./climate/erosionRegime";

/** Ramp + pit terrain (mirrors probeHillslopeDeposit): earns a channel cell
 * above the accumulation gate and a Priority-Flood pit to redeposit into,
 * with no ocean outlet so total soil mass is a closed budget (H-004). */
function makeRampWorld(): WorldState {
  const w = 10;
  const h = 8;
  const terrain = new Grid2D(w, h);
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      let e = x * 0.5 + 2;
      if (x === 4 && z === 3) e = 0.5;
      terrain.set(x, z, e);
    }
  }
  const world = new WorldState(terrain);
  world.soilDepth.fill(2.5);
  world.vegCover.fill(0);
  world.ensureStructureFresh();
  return world;
}

function channelCell(world: WorldState, pit: number): number {
  const w = 10;
  const h = 8;
  let channelI = 0;
  let bestA = 0;
  for (let i = 0; i < w * h; i++) {
    if (i === pit) continue;
    const acc = world.flowAccumulation![i]!;
    if (acc > bestA) {
      bestA = acc;
      channelI = i;
    }
  }
  if (bestA < config.erosionMinAccumulation) {
    throw new Error("erosion-intensity: no channel cell above accumulation gate");
  }
  return channelI;
}

describe("Erosion intensity force dial (C-022)", () => {
  it("regime table is monotonic calm < moderate=1 < stormy", () => {
    const calm = erosionById("calm");
    const moderate = erosionById("moderate");
    const stormy = erosionById("stormy");
    expect(calm.intensity).toBeLessThan(moderate.intensity);
    expect(moderate.intensity).toBe(1);
    expect(stormy.intensity).toBeGreaterThan(moderate.intensity);
  });

  it("untouched dial (default 1) matches an explicit moderate setting — neutral default", () => {
    const pit = 3 * 10 + 4;

    const untouched = makeRampWorld();
    const explicit = makeRampWorld();
    explicit.setErosionIntensity(erosionById("moderate").intensity);

    for (let n = 0; n < 12; n++) {
      untouched.runGeomorphologyStep(1);
      explicit.runGeomorphologyStep(1);
    }

    expect(untouched.soilDepth.data[pit]).toBe(explicit.soilDepth.data[pit]);
    expect(untouched.stateHash()).toBe(explicit.stateHash());
  });

  it("stormy erodes the channel more than calm on identical terrain, both conserving mass (H-004)", () => {
    const pit = 3 * 10 + 4;

    const calmWorld = makeRampWorld();
    const stormyWorld = makeRampWorld();
    const channelI = channelCell(calmWorld, pit);

    const chH0 = calmWorld.soilDepth.data[channelI]!;
    const sum0Calm = sumSoilDepth(calmWorld);
    const sum0Stormy = sumSoilDepth(stormyWorld);

    calmWorld.setErosionIntensity(erosionById("calm").intensity);
    stormyWorld.setErosionIntensity(erosionById("stormy").intensity);

    for (let n = 0; n < 12; n++) {
      calmWorld.runGeomorphologyStep(1);
      stormyWorld.runGeomorphologyStep(1);
    }

    const calmLoss = chH0 - calmWorld.soilDepth.data[channelI]!;
    const stormyLoss = chH0 - stormyWorld.soilDepth.data[channelI]!;

    expect(calmLoss).toBeGreaterThan(0);
    expect(stormyLoss).toBeGreaterThan(calmLoss);

    // H-004: no unexplained mass loss under either regime (production may add a
    // little; nothing may vanish — this ramp world has no ocean outlet).
    expect(sumSoilDepth(calmWorld) + 1e-6).toBeGreaterThanOrEqual(sum0Calm);
    expect(sumSoilDepth(stormyWorld) + 1e-6).toBeGreaterThanOrEqual(sum0Stormy);
  });

  it("replay determinism under an explicit stormy dial (T-001)", () => {
    const a = makeRampWorld();
    const b = makeRampWorld();
    a.setErosionIntensity(erosionById("stormy").intensity);
    b.setErosionIntensity(erosionById("stormy").intensity);
    for (let n = 0; n < 6; n++) {
      a.runGeomorphologyStep(1);
      b.runGeomorphologyStep(1);
    }
    expect(a.stateHash()).toBe(b.stateHash());
  });

  it("no cell targeting — the setter takes only a global multiplier (C-004)", () => {
    expect(WorldState.prototype.setErosionIntensity.length).toBe(1);
  });
});

function sumSoilDepth(world: WorldState): number {
  let sum = 0;
  for (let i = 0; i < world.soilDepth.data.length; i++) {
    sum += world.soilDepth.data[i]!;
  }
  return sum;
}
