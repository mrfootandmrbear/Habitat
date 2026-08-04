/**
 * Slice A / A+ audio observer — sonifies registry fields without writing them (T-006).
 *
 * C-014 hypothesis (Open): sampled/mixed sources from field values; silence is a
 * first-class state (AUD-002), not a missing asset. Does not consume sim RNG (T-001).
 *
 * AUD-001 / AUD-002 — water bed from water.surfaceDepth.
 * AUD-003 — recovery bed from veg.cover (visible life field; no invented wildlife).
 */

/** Observer contract — reads only, writes nothing (T-006). */
export const audioObserver = {
  id: "audio",
  reads: ["water.surfaceDepth", "veg.cover"] as const,
  writes: [] as const,
};

/** Ambient source id driven by water.surfaceDepth (C-014 field→source mapping). */
export const WATER_AMBIENT_SOURCE = "ambient.water" as const;

/** Ambient source id driven by veg.cover (AUD-003 recovery bed). */
export const LIFE_AMBIENT_SOURCE = "ambient.life" as const;

export type AmbientSourceId =
  | typeof WATER_AMBIENT_SOURCE
  | typeof LIFE_AMBIENT_SOURCE;

/**
 * Depth (m) at which ambient water level saturates to 1.
 * Local to audio — not a sim constant; keep out of config.ts while Slice 10 owns that hub.
 */
export const WATER_LEVEL_SATURATION_M = 0.25;

/** Depths at or below this count as dry for silence-as-signal (AUD-002). */
export const WATER_SILENCE_EPSILON_M = 1e-6;

/**
 * Cover at which ambient life level saturates to 1.
 * Cover is already [0,1]; saturation at 1 keeps the map identity above epsilon.
 */
export const LIFE_LEVEL_SATURATION = 1;

/** Cover at or below this counts as bare — silence for the recovery bed (AUD-002). */
export const LIFE_SILENCE_EPSILON = 1e-6;

/**
 * Readonly surface-depth sample — no mutators, no WorldState handle.
 * Callers pass a snapshot so the bus cannot alias live buffers.
 */
export type SurfaceDepthReader = {
  width: number;
  height: number;
  getSurfaceDepth(x: number, z: number): number;
};

/** Readonly cover sample — same snapshot contract as surface depth. */
export type CoverReader = {
  width: number;
  height: number;
  getCover(x: number, z: number): number;
};

/** Mix state for one ambient source — pure data; no AudioContext required for Tier-M. */
export type AudioMix = {
  /** Gain in [0, 1]. True 0 when silent (AUD-002). */
  level: number;
  /** True when the driving field is absent — silence as ecological signal. */
  silent: boolean;
  /** Which source this mix drives. */
  source: AmbientSourceId;
};

/** Two-bed soundscape — water + life; each independently silent (AUD-003). */
export type Soundscape = {
  water: AudioMix;
  life: AudioMix;
};

/**
 * Map mean surface depth → ambient water gain.
 * Monotonic non-decreasing; ~0 → 0 (meaningful silence, not a broken mixer).
 */
export function mapWaterDepthToLevel(
  meanDepth: number,
  saturationM = WATER_LEVEL_SATURATION_M,
  silenceEpsilon = WATER_SILENCE_EPSILON_M,
): number {
  if (!(meanDepth > silenceEpsilon)) return 0;
  if (saturationM <= 0) return 1;
  const t = meanDepth / saturationM;
  return t >= 1 ? 1 : t;
}

/**
 * Map mean veg.cover → ambient life gain (AUD-003).
 * Monotonic; bare → 0; full cover → 1.
 */
export function mapCoverToLevel(
  meanCover: number,
  saturation = LIFE_LEVEL_SATURATION,
  silenceEpsilon = LIFE_SILENCE_EPSILON,
): number {
  if (!(meanCover > silenceEpsilon)) return 0;
  if (saturation <= 0) return 1;
  const t = meanCover / saturation;
  return t >= 1 ? 1 : t;
}

/** Mean of a surface-depth reader (field aggregate for one ambient bed). */
export function meanSurfaceDepth(water: SurfaceDepthReader): number {
  const n = water.width * water.height;
  if (n === 0) return 0;
  let sum = 0;
  for (let z = 0; z < water.height; z++) {
    for (let x = 0; x < water.width; x++) {
      sum += water.getSurfaceDepth(x, z);
    }
  }
  return sum / n;
}

/** Mean of a cover reader. */
export function meanCover(cover: CoverReader): number {
  const n = cover.width * cover.height;
  if (n === 0) return 0;
  let sum = 0;
  for (let z = 0; z < cover.height; z++) {
    for (let x = 0; x < cover.width; x++) {
      sum += cover.getCover(x, z);
    }
  }
  return sum / n;
}

/**
 * Sample ambient water mix from a readonly surface-depth snapshot.
 * Deterministic from field values alone — no stochastic draws, no sim RNG.
 */
export function sampleAudioMix(
  water: SurfaceDepthReader,
  saturationM = WATER_LEVEL_SATURATION_M,
  silenceEpsilon = WATER_SILENCE_EPSILON_M,
): AudioMix {
  const mean = meanSurfaceDepth(water);
  const level = mapWaterDepthToLevel(mean, saturationM, silenceEpsilon);
  return {
    level,
    silent: level === 0,
    source: WATER_AMBIENT_SOURCE,
  };
}

/**
 * Sample ambient life / recovery mix from a readonly cover snapshot (AUD-003).
 */
export function sampleLifeAudioMix(
  cover: CoverReader,
  saturation = LIFE_LEVEL_SATURATION,
  silenceEpsilon = LIFE_SILENCE_EPSILON,
): AudioMix {
  const mean = meanCover(cover);
  const level = mapCoverToLevel(mean, saturation, silenceEpsilon);
  return {
    level,
    silent: level === 0,
    source: LIFE_AMBIENT_SOURCE,
  };
}

/** Sample both beds from independent snapshots. */
export function sampleSoundscape(
  water: SurfaceDepthReader,
  cover: CoverReader,
): Soundscape {
  return {
    water: sampleAudioMix(water),
    life: sampleLifeAudioMix(cover),
  };
}

/** Frozen copy so the audio path cannot alias live WorldState buffers. */
export function snapshotSurfaceDepthReader(
  width: number,
  height: number,
  depths: Float32Array,
): SurfaceDepthReader {
  const copy = depths.slice();
  return {
    width,
    height,
    getSurfaceDepth(x: number, z: number): number {
      return copy[z * width + x] ?? 0;
    },
  };
}

/** Frozen cover snapshot (T-006). */
export function snapshotCoverReader(
  width: number,
  height: number,
  covers: Float32Array,
): CoverReader {
  const copy = covers.slice();
  return {
    width,
    height,
    getCover(x: number, z: number): number {
      return copy[z * width + x] ?? 0;
    },
  };
}
