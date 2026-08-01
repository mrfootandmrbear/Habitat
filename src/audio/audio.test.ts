import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateMountain } from "../sim/terrain/generateMountain";
import { WorldState } from "../sim/WorldState";
import {
  LIFE_LEVEL_SATURATION,
  LIFE_SILENCE_EPSILON,
  WATER_LEVEL_SATURATION_M,
  WATER_SILENCE_EPSILON_M,
  audioObserver,
  mapCoverToLevel,
  mapWaterDepthToLevel,
  meanCover,
  meanSurfaceDepth,
  sampleAudioMix,
  sampleLifeAudioMix,
  sampleSoundscape,
  snapshotCoverReader,
  snapshotSurfaceDepthReader,
} from "./AudioBus";
import { applyMixToGain } from "./webAudioHook";

const audioDir = dirname(fileURLToPath(import.meta.url));

describe("AUD / C-014 audioObserver contract", () => {
  it("declares reads and empty writes (write isolation)", () => {
    expect(audioObserver.writes).toEqual([]);
    expect(audioObserver.reads).toContain("water.surfaceDepth");
    expect(audioObserver.reads).toContain("veg.cover");
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

describe("mapCoverToLevel monotonicity + silence (AUD-003)", () => {
  it("bare / absent cover → level 0 and silent", () => {
    expect(mapCoverToLevel(0)).toBe(0);
    expect(mapCoverToLevel(LIFE_SILENCE_EPSILON)).toBe(0);
    expect(mapCoverToLevel(-0.01)).toBe(0);

    const bare = new Float32Array(16);
    const mix = sampleLifeAudioMix(snapshotCoverReader(4, 4, bare));
    expect(mix.level).toBe(0);
    expect(mix.silent).toBe(true);
    expect(mix.source).toBe("ambient.life");
  });

  it("raising mean cover raises mapped level (monotonic)", () => {
    const covers = [0, 0.1, 0.25, 0.5, 1];
    const levels = covers.map((c) => mapCoverToLevel(c));
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]!).toBeGreaterThanOrEqual(levels[i - 1]!);
    }
    expect(levels[0]).toBe(0);
    expect(mapCoverToLevel(LIFE_LEVEL_SATURATION)).toBe(1);
    // Explicit scaffold numbers for C-014 / AUD-003 dossier
    expect(mapCoverToLevel(0.25)).toBeCloseTo(0.25, 5);
    expect(mapCoverToLevel(0.5)).toBeCloseTo(0.5, 5);
  });

  it("same cover → identical mix (RNG isolation / determinism)", () => {
    const covers = new Float32Array(9);
    covers[4] = 0.4;
    const a = sampleLifeAudioMix(snapshotCoverReader(3, 3, covers));
    const b = sampleLifeAudioMix(snapshotCoverReader(3, 3, covers));
    expect(a).toEqual(b);
    expect(a.silent).toBe(false);
    expect(a.level).toBeCloseTo(
      mapCoverToLevel(meanCover(snapshotCoverReader(3, 3, covers))),
      6,
    );
  });

  it("soundscape beds are independent — dry water + green cover", () => {
    const dry = new Float32Array(4);
    const green = new Float32Array(4);
    green.fill(0.6);
    const scape = sampleSoundscape(
      snapshotSurfaceDepthReader(2, 2, dry),
      snapshotCoverReader(2, 2, green),
    );
    expect(scape.water.silent).toBe(true);
    expect(scape.water.level).toBe(0);
    expect(scape.life.silent).toBe(false);
    expect(scape.life.level).toBeCloseTo(0.6, 5);
  });
});

describe("AudioBus write isolation (T-006)", () => {
  it("sampling a snapshot then mutating the copy does not change WorldState", () => {
    const world = new WorldState(generateMountain(16, 16, 4, 7));
    world.water.fill(0.05);
    world.vegCover.fill(0.3);
    const hashBefore = world.stateHash();
    const waterBefore = world.water.data.slice();
    const coverBefore = world.vegCover.data.slice();

    const waterReader = snapshotSurfaceDepthReader(16, 16, world.water.data);
    const coverReader = snapshotCoverReader(16, 16, world.vegCover.data);
    const mix = sampleAudioMix(waterReader);
    const life = sampleLifeAudioMix(coverReader);
    expect(mix.silent).toBe(false);
    expect(mix.level).toBeGreaterThan(0);
    expect(life.silent).toBe(false);
    expect(life.level).toBeGreaterThan(0);

    // Snapshot owns a copy — mutating the original live buffer after snapshot
    // must not change a prior mix, and sampling must not write back.
    world.water.fill(0.9);
    world.vegCover.fill(0.95);
    expect(sampleAudioMix(waterReader)).toEqual(mix);
    expect(sampleLifeAudioMix(coverReader)).toEqual(life);

    expect(world.stateHash()).not.toBe(hashBefore); // live buffer did change via test
    // Restore and prove audio path alone left hash intact before our fill
    world.water.data.set(waterBefore);
    world.vegCover.data.set(coverBefore);
    expect(world.stateHash()).toBe(hashBefore);
    sampleSoundscape(
      snapshotSurfaceDepthReader(16, 16, world.water.data),
      snapshotCoverReader(16, 16, world.vegCover.data),
    );
    expect(world.stateHash()).toBe(hashBefore);
    expect([...world.water.data]).toEqual([...waterBefore]);
    expect([...world.vegCover.data]).toEqual([...coverBefore]);
  });

  it("sampleSoundscape never mutates water, terrain, soil, cover, or ledgers", () => {
    const world = new WorldState(generateMountain(12, 12, 3, 2));
    world.water.fill(0.08);
    world.vegCover.fill(0.2);
    const hashBefore = world.stateHash();
    const waterBefore = world.water.data.slice();
    const terrainBefore = world.terrain.data.slice();
    const soilBefore = world.soilMoisture.data.slice();
    const coverBefore = world.vegCover.data.slice();
    const precip = world.precipitationLedger;
    const infil = world.infiltrationLedger;
    const et = world.etLedger;

    sampleSoundscape(
      snapshotSurfaceDepthReader(12, 12, world.water.data),
      snapshotCoverReader(12, 12, world.vegCover.data),
    );

    expect(world.stateHash()).toBe(hashBefore);
    expect([...world.water.data]).toEqual([...waterBefore]);
    expect([...world.terrain.data]).toEqual([...terrainBefore]);
    expect([...world.soilMoisture.data]).toEqual([...soilBefore]);
    expect([...world.vegCover.data]).toEqual([...coverBefore]);
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

  it("applyMixToGain accepts ambient.life bed", () => {
    const target = { gain: { value: 0 } };
    applyMixToGain({ level: 0.55, silent: false, source: "ambient.life" }, target);
    expect(target.gain.value).toBe(0.55);
  });

  it("createAmbientBeds returns null without AudioContext (Wave 0 / CI)", async () => {
    const { createAmbientBeds, unlockAmbientAudio } = await import("./webAudioHook");
    // Vitest/Node has no Web Audio — beds must stay optional (T-006 CI path).
    expect(createAmbientBeds()).toBeNull();
    expect(await unlockAmbientAudio()).toBeNull();
  });
});
