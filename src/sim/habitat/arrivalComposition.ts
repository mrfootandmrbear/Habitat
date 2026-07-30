/**
 * Arrival / establishment composition (Slice 12).
 * Rule: docs/slices/12-composition.md — NATURAL_PROCESS_MATH seed kernel × Liebig HSI.
 *
 * Continuous deterministic establishment (C-003 Open forbids stochastic arrivals).
 * Zero suitability blocks establishment (C-007 arrival gate).
 */

import { clamp01 } from "./hsiComposition";

/** Distance in cell units from (x,z) to the nearest preserve perimeter cell. */
export function distanceToPreserveEdge(
  x: number,
  z: number,
  width: number,
  height: number,
): number {
  const dx = Math.min(x, width - 1 - x);
  const dz = Math.min(z, height - 1 - z);
  return Math.min(dx, dz);
}

/**
 * Isotropic exponential seed pressure from a fixed external perimeter source.
 * Highest at the edge, decays toward the interior.
 */
export function seedPressureAt(
  x: number,
  z: number,
  width: number,
  height: number,
  seedSourceStrength: number,
  seedMeanDistance: number,
): number {
  const d = distanceToPreserveEdge(x, z, width, height);
  const mean = Math.max(seedMeanDistance, 1e-6);
  return seedSourceStrength * Math.exp(-d / mean);
}

/**
 * Establishment probability: p = 1 − exp(−seedBank · HSI · scale).
 * Zero HSI ⇒ zero probability.
 */
export function establishmentProbability(
  seedBank: number,
  habitatSuitability: number,
  establishmentScale: number,
): number {
  const seed = Math.max(0, seedBank);
  const hsi = clamp01(habitatSuitability);
  if (seed <= 0 || hsi <= 0) return 0;
  const scale = Math.max(0, establishmentScale);
  return 1 - Math.exp(-seed * hsi * scale);
}

/**
 * Continuous biomass increment toward resource-derived capacity (ES-006).
 * Capacity = herbBiomassMax · HSI — never a fixed ecological K.
 */
export function nextHerbBiomass(args: {
  biomass: number;
  seedBank: number;
  habitatSuitability: number;
  establishmentScale: number;
  establishmentRate: number;
  biomassMax: number;
  dt: number;
}): number {
  const hsi = clamp01(args.habitatSuitability);
  const capacity = Math.max(0, args.biomassMax) * hsi;
  const p = establishmentProbability(
    args.seedBank,
    hsi,
    args.establishmentScale,
  );
  const growth =
    p * Math.max(0, args.establishmentRate) * Math.max(0, args.dt);
  const next = Math.min(capacity, Math.max(0, args.biomass + growth));
  return next;
}
