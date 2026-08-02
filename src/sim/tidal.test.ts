import { describe, expect, it } from "vitest";
import { WorldState } from "./WorldState";
import {
  generateIsland,
  paintIslandSoilDepth,
  DEFAULT_SEA_LEVEL_METERS,
} from "./terrain/generateIsland";
import { paintSubstrateMosaic } from "./terrain/substrates";
import {
  countIntertidal,
  fillIntertidalMask,
  foreshoreEncodingFrac,
  meanHighWater,
  meanLowWater,
  tideById,
} from "./climate/tidalEnvelope";
import { evaluateHsi, LIMITING_INUNDATION } from "./habitat/hsiComposition";
import { intertidalEncodingDelta } from "../ui/terrainEncoding";
import { config } from "../config";

describe("Slice 17 tidal envelope (C-016)", () => {
  it("MHW/MLW are symmetric around sea level", () => {
    const sea = 2;
    const amp = 0.75;
    expect(meanHighWater(sea, amp)).toBeCloseTo(2.75);
    expect(meanLowWater(sea, amp)).toBeCloseTo(1.25);
  });

  it("tideById has no cell arguments and off is zero amplitude", () => {
    expect(tideById("off").amplitudeMeters).toBe(0);
    expect(tideById("spring").amplitudeMeters).toBeGreaterThan(
      tideById("neap").amplitudeMeters,
    );
  });

  it("absent sea or zero amplitude yields empty intertidal", () => {
    const bare = new WorldState(generateIsland(24, 24, 8, 3));
    expect(bare.intertidalCellCount()).toBe(0);

    const seaOnly = new WorldState(generateIsland(24, 24, 8, 3), {
      seaLevel: DEFAULT_SEA_LEVEL_METERS,
    });
    expect(seaOnly.intertidalCellCount()).toBe(0);
    expect(seaOnly.meanHighWater).toBe(DEFAULT_SEA_LEVEL_METERS);
    expect(seaOnly.meanLowWater).toBe(DEFAULT_SEA_LEVEL_METERS);
  });

  it("widening the envelope grows intertidal cell count monotonically", () => {
    const terrain = generateIsland(48, 48, 10, 11);
    const amps = [0.35, 0.75, 1.4];
    let prev = 0;
    for (const amp of amps) {
      const world = new WorldState(terrain.clone(), {
        seaLevel: DEFAULT_SEA_LEVEL_METERS,
        tidalAmplitude: amp,
      });
      const n = world.intertidalCellCount();
      expect(n).toBeGreaterThan(prev);
      prev = n;
    }
  });

  it("same envelope → identical hash; no per-event phase in stepEvent", () => {
    const opts = {
      seaLevel: DEFAULT_SEA_LEVEL_METERS,
      tidalAmplitude: 0.75,
    };
    const a = new WorldState(generateIsland(32, 32, 10, 7), opts);
    const b = new WorldState(generateIsland(32, 32, 10, 7), opts);
    expect(a.stateHash()).toBe(b.stateHash());
    const before = a.intertidalCellCount();
    for (let i = 0; i < 16; i++) a.stepEvent();
    expect(a.intertidalCellCount()).toBe(before);
    expect(a.meanHighWater).toBe(b.meanHighWater);
    expect(a.meanLowWater).toBe(b.meanLowWater);
  });

  it("setTidalAmplitude is a global dial (force API)", () => {
    const world = new WorldState(generateIsland(32, 32, 10, 5), {
      seaLevel: DEFAULT_SEA_LEVEL_METERS,
    });
    expect(world.intertidalCellCount()).toBe(0);
    world.setTidalAmplitude(tideById("mean").amplitudeMeters);
    expect(world.intertidalCellCount()).toBeGreaterThan(0);
    world.setTidalAmplitude(0);
    expect(world.intertidalCellCount()).toBe(0);
  });

  it("fillIntertidalMask marks only the band between MLW and MHW", () => {
    const elev = new Float32Array([0.5, 1.5, 2.0, 2.5, 4.0]);
    const out = new Float32Array(5);
    fillIntertidalMask(out, elev, 1.25, 2.75);
    expect([...out]).toEqual([0, 1, 1, 1, 0]);
    expect(countIntertidal(out)).toBe(3);
  });

  it("foreshore fraction grows with MHW under fixed sea", () => {
    const elev = generateIsland(48, 48, 10, 21).data;
    const sea = DEFAULT_SEA_LEVEL_METERS;
    const narrow = foreshoreEncodingFrac(elev, sea, meanHighWater(sea, 0.35));
    const wide = foreshoreEncodingFrac(elev, sea, meanHighWater(sea, 1.4));
    expect(wide).toBeGreaterThan(narrow);
  });

  it("intertidal tint clears Tier-P encoding floor", () => {
    expect(intertidalEncodingDelta(config.soilPorosity)).toBeGreaterThan(0.08);
  });

  it("evaluateHsi reaches LIMITING_INUNDATION when hydroperiod dominates the argmin (freeze regression)", () => {
    // habitat.limitingFactor's registered range once stopped at LIMITING_SPRAY
    // (5), predating the inundation (C-016) and light (C-007/C-011) arms.
    // Off tide, hydroperiod is always 0 and f_inundation is always 1, so
    // LIMITING_INUNDATION (6) can never win the argmin — the stale bound went
    // unnoticed. On tide, a submerged/foreshore cell can drive f_inundation
    // below every other factor, and stepEvent's daily assertBounds threw
    // "Bounds/NaN (daily): habitat.limitingFactor[i]=6 not in [0, 5]",
    // pausing the sim (felt like a freeze — reachable only with tide on).
    // A direct Liebig call — every other factor forced to its full 1.0 (mid
    // moisture fill, ample depth/groundwater, no salt/spray, opt temp, open
    // sky), mid-tide elevation so hydroperiod = 0.5 and f_inundation = 0 —
    // isolates the argmin from whole-island ecosystem timing (§4.47 changed
    // how cover/light combine, which shifts *when* any given cell reaches
    // this state, but not whether the argmin itself can reach id 6).
    const sample = evaluateHsi({
      moisture: 0.5,
      soilDepth: 1,
      groundwater: 1,
      porosity: 1,
      depthRef: 1,
      gwRef: 1,
      elevMeters: 0,
      mlwMeters: -1,
      mhwMeters: 1,
    });
    expect(sample.fInundation).toBe(0);
    expect(sample.limiting).toBe(LIMITING_INUNDATION);
  });

  it("a tidal heavy-rain sim run never throws (freeze regression, registered-range smoke test)", () => {
    // Complements the direct evaluateHsi proof above with the actual failure
    // path: a running sim under tide + heavy rain, where any cell reaching
    // id 6 or 7 must not trip the daily assertBounds check.
    const terrain = generateIsland(24, 24, 8, 3);
    const world = new WorldState(terrain, {
      seaLevel: DEFAULT_SEA_LEVEL_METERS,
      tidalAmplitude: tideById("spring").amplitudeMeters,
      windUx: 1,
      windUz: 0,
    });
    paintIslandSoilDepth(
      world.soilDepth.data,
      world.terrain.data,
      world.width,
      world.height,
      world.oceanCells,
    );
    paintSubstrateMosaic(
      world.soilMaterial.data,
      world.width,
      world.height,
      world.oceanCells,
      3,
      { elev: world.terrain.data },
    );
    world.setRainRegime("heavy");

    for (let day = 0; day < 60; day++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        expect(() => world.stepEvent()).not.toThrow();
      }
    }
  });
});
