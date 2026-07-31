/**
 * Onshore spray stress for Liebig HSI (C-017).
 * Derived from shore.exposure (already onshore × fetch) — not a second salt ledger.
 * Real-world referent: wind-driven salt spray on the windward face (N-004).
 * Suitability falls as exposure rises; strand pioneers omit this arm (hold via f_shore).
 */

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/**
 * Herb / inland guild spray suitability: 1 inland, 0 at full shore exposure.
 * Stress magnitude is shore.exposure itself (no second onshore multiply).
 */
export function factorSpray(shoreExposure: number): number {
  return clamp01(1 - clamp01(shoreExposure));
}
