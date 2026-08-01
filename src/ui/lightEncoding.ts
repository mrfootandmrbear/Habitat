import { rgbDistance } from "./colorDistance";

/**
 * Tier-P inspector encoding for Slice 11 understory-light contrast.
 * `light` is clamp01'd upstream (vegetation/lightCompetition.ts); the old
 * `*3` multiplier clipped the ramp at light=1/3, so the top two-thirds of
 * the real domain rendered as one flat color (BUILD_GUIDE §4.52). Dropped
 * so the ramp stays injective — and the clip point lands at 1.0 — across
 * the field's actual range.
 */
export function understoryLightRgb(
  light: number,
): readonly [number, number, number] {
  const t = Math.min(1, Math.max(0, light));
  return [0.12 + 0.78 * t, 0.16 + 0.7 * t, 0.28 + 0.32 * t];
}

export function lightEncodingDelta(a: number, b: number): number {
  const ca = understoryLightRgb(a);
  const cb = understoryLightRgb(b);
  return rgbDistance(ca, cb);
}
