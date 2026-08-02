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
 * Unimodal thermal performance curve: 0 at/below kill, 1 at opt, then a
 * right-skewed upper limb down to critical (default crit sits 1.5× the
 * kill→opt span above opt so the warm side is longer than the cold rise).
 * Guild cold tolerance is data (T-004); herb uses config.herbTempKillC / OptC.
 */
export function factorTemperature(
  airTempC: number,
  killC: number,
  optC: number,
  critC?: number,
): number {
  if (!(optC > killC)) return airTempC >= optC ? 1 : 0;
  const span = optC - killC;
  const crit = critC ?? optC + 1.5 * span;
  if (!(crit > optC)) {
    if (airTempC <= killC) return 0;
    if (airTempC >= optC) return 1;
    return clamp01((airTempC - killC) / span);
  }
  if (airTempC <= killC || airTempC >= crit) return 0;
  if (airTempC <= optC) return clamp01((airTempC - killC) / span);
  return clamp01((crit - airTempC) / (crit - optC));
}
