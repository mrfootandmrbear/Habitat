import { describe, expect, it } from "vitest";
import { WorldState } from "./WorldState";
import { generateIsland, DEFAULT_SEA_LEVEL_METERS } from "./terrain/generateIsland";
import {
  countIntertidal,
  fillIntertidalMask,
  foreshoreEncodingFrac,
  meanHighWater,
  meanLowWater,
  tideById,
} from "./climate/tidalEnvelope";
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
});
