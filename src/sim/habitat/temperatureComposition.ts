/**
 * Temperature suitability for Liebig HSI (C-004 / C-020).
 * One Heat dial field — climate.airTemperature — also gates plants.
 * Real-world referent: growing-season warmth vs frost kill (N-004).
 */

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/**
 * Piecewise ramp: 0 at/below kill, 1 at/above opt, linear between.
 * Guild cold tolerance is data (T-004); herb uses config.herbTempKillC / OptC.
 */
export function factorTemperature(
  airTempC: number,
  killC: number,
  optC: number,
): number {
  if (!(optC > killC)) return airTempC >= optC ? 1 : 0;
  if (airTempC <= killC) return 0;
  if (airTempC >= optC) return 1;
  return clamp01((airTempC - killC) / (optC - killC));
}
