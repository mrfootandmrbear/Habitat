/**
 * Soil porewater salinity (Slice 20 / C-018).
 * Rule: docs/slices/20-composition.md — one concentration on the water column.
 *
 * S ∈ [0, 1]; 1 = seawater-equivalent. Dilution / concentration conserve salt
 * mass against water volume; no separate salt ledger (H-004 residual unchanged).
 */

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/** Non-halophyte suitability: fresh → 1, seawater → 0. */
export function factorSalinity(salinity: number): number {
  return clamp01(1 - Math.max(0, salinity));
}

/**
 * Strand / splash-pioneer salinity arm (C-018 / C-018 guild response).
 * Full through moderate–high pore salt where herb fails; collapses only at
 * hypersaline extreme (S → 1). Not spray (C-017).
 */
export function factorSalinityTolerant(
  salinity: number,
  fullThrough = 0.9,
): number {
  const s = Math.max(0, salinity);
  const plateau = Math.min(1, Math.max(0, fullThrough));
  if (s <= plateau) return 1;
  const span = Math.max(1e-6, 1 - plateau);
  return clamp01(1 - (s - plateau) / span);
}

/**
 * Freshwater infiltrate dilutes pore salinity (incoming S = 0).
 * `storageBefore` / `infiltrate` are water-column depths (m).
 */
export function diluteSalinity(
  salinity: number,
  storageBefore: number,
  infiltrate: number,
): number {
  if (!(infiltrate > 0)) return clamp01(salinity);
  const before = Math.max(0, storageBefore);
  const after = before + infiltrate;
  if (after <= 1e-12) return clamp01(salinity);
  return clamp01((clamp01(salinity) * before) / after);
}

/**
 * ET removes water; salt stays → concentrate, capped at 1.
 */
export function concentrateSalinity(
  salinity: number,
  storageBefore: number,
  removed: number,
): number {
  if (!(removed > 0)) return clamp01(salinity);
  const before = Math.max(0, storageBefore);
  if (before <= 1e-12) return clamp01(salinity);
  const after = before - removed;
  if (after <= 1e-12) return 1;
  return clamp01((clamp01(salinity) * before) / after);
}

/**
 * Mix toward seawater on shoreline / inundated cells.
 * `mixFraction` in [0, 1] is the day's approach rate (α·dt clamped).
 */
export function mixTowardSeawater(
  salinity: number,
  mixFraction: number,
  seawater = 1,
): number {
  const a = clamp01(mixFraction);
  const s = clamp01(salinity);
  const target = clamp01(seawater);
  return clamp01(s + a * (target - s));
}
