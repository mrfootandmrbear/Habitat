import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateMountain } from "../sim/terrain/generateMountain";
import { WorldState } from "../sim/WorldState";
import {
  WATER_LEVEL_SATURATION_M,
  WATER_SILENCE_EPSILON_M,
  audioObserver,
  mapWaterDepthToLevel,
  meanSurfaceDepth,
  sampleAudioMix,
  snapshotSurfaceDepthReader,
} from "./AudioBus";
import { applyMixToGain } from "./webAudioHook";

const audioDir = dirname(fileURLToPath(import.meta.url));

describe("AUD / C-014 audioObserver contract", () => {
  it("declares reads and empty writes (write isolation)", () => {
    expect(audioObserver.writes).toEqual([]);
    expect(audioObserver.reads).toContain("water.surfaceDepth");
  });

  it("source module does not call Math.random or world RNG APIs", () => {
    const stripComments = (src: string): string =>
      src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
    const busSrc = stripComments(
      readFileSync(join(audioDir, "AudioBus.ts"), "utf8"),
    );
    const hookSrc = stripComments(
      readFileSync(join(audioDir, "webAudioHook.ts"), "utf8"),
    );
    for (const src of [busSrc, hookSrc]) {
      expect(src).not.toMatch(/Math\.random\s*\(/);
      expect(src).not.toMatch(/\brandom\s*\(/);
      expect(src).not.toMatch(/\bnextFloat\b/);
      expect(src).not.toMatch(/\bseededRng\b/);
    }
  });
});

describe("mapWaterDepthToLevel monotonicity + silence (AUD-002)", () => {
  it("zero / absent field → level 0 and silent", () => {
    expect(mapWaterDepthToLevel(0)).toBe(0);
    expect(mapWaterDepthToLevel(WATER_SILENCE_EPSILON_M)).toBe(0);
    expect(mapWaterDepthToLevel(-0.01)).toBe(0);

    const dry = new Float32Array(16);
    const mix = sampleAudioMix(snapshotSurfaceDepthReader(4, 4, dry));
    expect(mix.level).toBe(0);
    expect(mix.silent).toBe(true);
    expect(mix.source).toBe("ambient.water");
  });

  it("raising mean depth raises mapped level (monotonic)", () => {
    const depths = [0, 0.01, 0.05, 0.1, 0.25, 0.5, 1];
    const levels = depths.map((d) => mapWaterDepthToLevel(d));
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]!).toBeGreaterThanOrEqual(levels[i - 1]!);
    }
    expect(levels[0]).toBe(0);
    expect(mapWaterDepthToLevel(WATER_LEVEL_SATURATION_M)).toBe(1);
    expect(mapWaterDepthToLevel(WATER_LEVEL_SATURATION_M * 2)).toBe(1);
    // Explicit scaffold numbers for C-014 dossier / deliverable
    expect(mapWaterDepthToLevel(0.05)).toBeCloseTo(0.2, 5);
    expect(mapWaterDepthToLevel(0.125)).toBeCloseTo(0.5, 5);
  });

  it("same depths → identical mix (RNG isolation / determinism)", () => {
    const depths = new Float32Array(9);
    depths[4] = 0.1;
    const a = sampleAudioMix(snapshotSurfaceDepthReader(3, 3, depths));
    const b = sampleAudioMix(snapshotSurfaceDepthReader(3, 3, depths));
    expect(a).toEqual(b);
    expect(a.silent).toBe(false);
    expect(a.level).toBeCloseTo(mapWaterDepthToLevel(meanSurfaceDepth(
      snapshotSurfaceDepthReader(3, 3, depths),
    )), 6);
  });
});

describe("AudioBus write isolation (T-006)", () => {
  it("sampling a snapshot then mutating the copy does not change WorldState", () => {
    const world = new WorldState(generateMountain(16, 16, 4, 7));
    world.water.fill(0.05);
    const hashBefore = world.stateHash();
    const waterBefore = world.water.data.slice();

    const reader = snapshotSurfaceDepthReader(16, 16, world.water.data);
    const mix = sampleAudioMix(reader);
    expect(mix.silent).toBe(false);
    expect(mix.level).toBeGreaterThan(0);

    // Snapshot owns a copy — mutating the original live buffer after snapshot
    // must not change a prior mix, and sampling must not write back.
    world.water.fill(0.9);
    const mixAfterLiveMutate = sampleAudioMix(reader);
    expect(mixAfterLiveMutate).toEqual(mix);

    expect(world.stateHash()).not.toBe(hashBefore); // live buffer did change via test
    // Restore and prove audio path alone left hash intact before our fill
    world.water.data.set(waterBefore);
    expect(world.stateHash()).toBe(hashBefore);
    sampleAudioMix(snapshotSurfaceDepthReader(16, 16, world.water.data));
    expect(world.stateHash()).toBe(hashBefore);
    expect([...world.water.data]).toEqual([...waterBefore]);
  });

  it("sampleAudioMix never mutates water, terrain, soil, or ledgers", () => {
    const world = new WorldState(generateMountain(12, 12, 3, 2));
    world.water.fill(0.08);
    const hashBefore = world.stateHash();
    const waterBefore = world.water.data.slice();
    const terrainBefore = world.terrain.data.slice();
    const soilBefore = world.soilMoisture.data.slice();
    const precip = world.precipitationLedger;
    const infil = world.infiltrationLedger;
    const et = world.etLedger;

    sampleAudioMix(snapshotSurfaceDepthReader(12, 12, world.water.data));

    expect(world.stateHash()).toBe(hashBefore);
    expect([...world.water.data]).toEqual([...waterBefore]);
    expect([...world.terrain.data]).toEqual([...terrainBefore]);
    expect([...world.soilMoisture.data]).toEqual([...soilBefore]);
    expect(world.precipitationLedger).toBe(precip);
    expect(world.infiltrationLedger).toBe(infil);
    expect(world.etLedger).toBe(et);
  });
});

describe("webAudioHook no-op without context", () => {
  it("applyMixToGain is a no-op when target is null", () => {
    expect(() =>
      applyMixToGain({ level: 0.5, silent: false, source: "ambient.water" }, null),
    ).not.toThrow();
  });

  it("applyMixToGain writes 0 when silent", () => {
    const target = { gain: { value: 0.9 } };
    applyMixToGain({ level: 0.4, silent: true, source: "ambient.water" }, target);
    expect(target.gain.value).toBe(0);
  });

  it("applyMixToGain writes level when not silent", () => {
    const target = { gain: { value: 0 } };
    applyMixToGain({ level: 0.35, silent: false, source: "ambient.water" }, target);
    expect(target.gain.value).toBe(0.35);
  });
});
