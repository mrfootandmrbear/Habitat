/** Tier-P inspector encoding for Slice 11 understory-light contrast. */
export function understoryLightRgb(
  light: number,
): readonly [number, number, number] {
  const t = Math.min(1, Math.max(0, light) * 3);
  return [0.12 + 0.78 * t, 0.16 + 0.7 * t, 0.28 + 0.32 * t];
}

export function lightEncodingDelta(a: number, b: number): number {
  const ca = understoryLightRgb(a);
  const cb = understoryLightRgb(b);
  return Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]);
}
