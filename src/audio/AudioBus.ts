/**
 * Slice A audio observer — sonifies registry fields without writing them (T-006).
 *
 * C-014 hypothesis (Open): sampled/mixed sources from field values; silence is a
 * first-class state (AUD-002), not a missing asset. Does not consume sim RNG (T-001).
 *
 * AUD-001 / AUD-002 / AUD-003 — Locked intent; this module is the machine scaffold only.
 */

/** Observer contract — mirrors predictionObserver (reads only, empty writes). */
export const audioObserver = {
  id: "audio",
  reads: ["water.surfaceDepth"] as const,
  writes: [] as const,
};

/** Ambient source id driven by water.surfaceDepth (C-014 field→source mapping). */
export const WATER_AMBIENT_SOURCE = "ambient.water" as const;

/**
 * Depth (m) at which ambient water level saturates to 1.
 * Local to audio — not a sim constant; keep out of config.ts while Slice 10 owns that hub.
 */
export const WATER_LEVEL_SATURATION_M = 0.25;

/** Depths at or below this count as dry for silence-as-signal (AUD-002). */
export const WATER_SILENCE_EPSILON_M = 1e-6;

/**
 * Readonly surface-depth sample — no mutators, no WorldState handle.
 * Callers pass a snapshot so the bus cannot alias live buffers.
 */
export type SurfaceDepthReader = {
  width: number;
  height: number;
  getSurfaceDepth(x: number, z: number): number;
};

/** Mix state for one ambient source — pure data; no AudioContext required for Tier-M. */
export type AudioMix = {
  /** Gain for ambient.water in [0, 1]. True 0 when silent (AUD-002). */
  level: number;
  /** True when mean surface depth is ~0 — silence as ecological signal. */
  silent: boolean;
  /** Which source this mix drives. */
  source: typeof WATER_AMBIENT_SOURCE;
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
