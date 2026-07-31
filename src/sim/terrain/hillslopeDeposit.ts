/**
 * Exner-lite inland deposit weights (GEO-002 / NATURAL_PROCESS_MATH §3.8).
 *
 * Steal (Mei-class / fluvial capacity fudge):
 * deposit where transport capacity drops — low slope, Priority-Flood
 * depressions, local minima — not Hjulström velocity gates.
 *
 * Rejected: virtual-pipe SWE authority, droplet particle sim, second sediment
 * Process, multi-grain Hjulström thresholds as the primary law.
 */

/** Transport-capacity proxy C ∝ slope · √Â (same shape as channel forcing). */
export function transportCapacityProxy(slope: number, aNorm: number): number {
  return Math.max(0, slope) * Math.sqrt(Math.max(aNorm, 1e-6));
}

/**
 * Weight for receiving hillslope sediment this band.
 * Concentrated flow blocks sheet dropout, but Priority-Flood depressions
 * and local minima always accept load (Exner sinks).
 */
export function hillslopeDepositWeight(opts: {
  slope: number;
  depressionDepth: number;
  aNorm: number;
  isLocalMin: boolean;
  /** Channel cell actively forced this band (accumulation gate + slope). */
  concentratedFlow: boolean;
}): number {
  const basin = Math.max(0, opts.depressionDepth);
  const pit = opts.isLocalMin ? 1 : 0;
  if (opts.concentratedFlow && basin <= 0 && !opts.isLocalMin) return 0;
  const capacity = transportCapacityProxy(opts.slope, opts.aNorm);
  const underCapacity = 1 / (1 + capacity * 20);
  const flat = 1 / (1 + opts.slope * 8);
  return underCapacity * flat + basin * 2 + pit;
}

/** True when elev[i] is strictly below every orthogonal neighbor. */
export function isLocalMinimum(
  elev: Float32Array,
  width: number,
  height: number,
  x: number,
  z: number,
): boolean {
  const i = z * width + x;
  const c = elev[i]!;
  if (x > 0 && elev[i - 1]! <= c) return false;
  if (x + 1 < width && elev[i + 1]! <= c) return false;
  if (z > 0 && elev[i - width]! <= c) return false;
  if (z + 1 < height && elev[i + width]! <= c) return false;
  let n = 0;
  if (x > 0) n++;
  if (x + 1 < width) n++;
  if (z > 0) n++;
  if (z + 1 < height) n++;
  return n >= 2;
}
