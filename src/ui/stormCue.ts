/**
 * Storm / weather presentation helpers (C-020 G1 / G5).
 * Observer-only — never writes WorldState (T-006).
 */

import type { RainRegimeId } from "../sim/climate/rainRegime";

/** Cloud still charged enough to read as a spell in the sky. */
export const CLOUD_SPELL_FLOOR = 1e-5;

/**
 * Veil / streak strength by climate archetype (G5).
 * Arid rare storms stay lighter than temperate light showers.
 */
export function stormCueStrength(regime: RainRegimeId): number {
  switch (regime) {
    case "dry":
      return 0.28;
    case "light":
      return 0.52;
    case "moderate":
      return 0.78;
    case "heavy":
      return 1;
  }
}

/**
 * Whether the storm front should stay armed (G1).
 * Holds across a wet block even when individual event steps are dry
 * (monsoon inter-storm gaps / dry suffixes inside wet days at 16×).
 */
export function stormSpellArmed(input: {
  rainingThisTick: boolean;
  cloudWater: number;
  wetDay: boolean;
}): boolean {
  return (
    input.rainingThisTick ||
    input.wetDay ||
    input.cloudWater > CLOUD_SPELL_FLOOR
  );
}

/** Soft fade near a toroidal wrap edge so teleports are invisible (G2). */
export function wrapEdgeFade(
  x: number,
  z: number,
  halfExtent: number,
  pad: number,
): number {
  if (pad <= 0 || halfExtent <= 0) return 1;
  const dx = halfExtent - Math.abs(x);
  const dz = halfExtent - Math.abs(z);
  const d = Math.min(dx, dz);
  return Math.min(1, Math.max(0, d / pad));
}

/**
 * Presentation snow-cover target 0..1 (G3) — melt-on-contact sim still;
 * this is a short-lived ground hold only.
 */
export function snowCoverTarget(
  phase: number,
  spellActive: boolean,
  strength: number,
): number {
  if (!spellActive || phase < 2) return 0;
  return Math.min(1, Math.max(0, strength)) * 0.55;
}

/**
 * How many of the existing cloud bodies release at once (G6). Regime
 * intensity maps onto a discrete count of the same fixed cloud pool instead
 * of a wider faucet plane, so "how much rain" reads as "how many clouds are
 * working the sky" — the framing this dial was missing. Deterministic
 * function of the regime dial only; no new RNG (C-003 stays Open).
 */
export function releasingCloudCount(
  regime: RainRegimeId,
  totalClouds: number,
): number {
  if (totalClouds <= 0) return 0;
  const strength = stormCueStrength(regime);
  return Math.max(
    1,
    Math.min(totalClouds, Math.round(strength * totalClouds)),
  );
}

export type FogRange = { near: number; far: number };

/**
 * Weather-responsive haze (G9). `Scene.ts`'s fixed 70–140 band sits beyond
 * where the camera normally works at `worldSize=48` and never reacted to
 * weather — inert render cost, not a signal. Pulling both bounds in with
 * cloud cover and storm veil strength gives the haze something to say
 * (visibility drops in the weather) and relaxes it back to `base` on a dry
 * day instead of holding one constant backdrop.
 */
export function weatherFogRange(
  base: FogRange,
  veilStrength: number,
  cloudCover: number,
): FogRange {
  const v = Math.min(1, Math.max(0, veilStrength));
  const c = Math.min(1, Math.max(0, cloudCover));
  const pull = 1 - 0.55 * (v * 0.7 + c * 0.3);
  return { near: base.near * pull, far: base.far * pull };
}
