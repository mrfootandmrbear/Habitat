/**
 * Sandy crest sand-binder HSI (C-009 / Slice N5).
 * Rule: docs/slices/N5-composition.md — drainage × exposure × sand × burial.
 * Distinct from wet-site herb and strand splash pioneer.
 * Burial uses |shore.longshore| as remobilization proxy (no stress.burial store).
 */

import { config } from "../../config";
import {
  SUBSTRATE_CLAY,
  SUBSTRATE_LOAM,
  SUBSTRATE_ROCK,
  SUBSTRATE_SAND,
} from "../terrain/substrates";
import { clamp01 } from "./hsiComposition";

export const BINDER_LIMITING_DRAINAGE = 0;
export const BINDER_LIMITING_EXPOSURE = 1;
export const BINDER_LIMITING_SAND = 2;
export const BINDER_LIMITING_BURIAL = 3;

export type BinderLimitingId =
  | typeof BINDER_LIMITING_DRAINAGE
  | typeof BINDER_LIMITING_EXPOSURE
  | typeof BINDER_LIMITING_SAND
  | typeof BINDER_LIMITING_BURIAL;

export const BINDER_LIMITING_LABELS: Record<BinderLimitingId, string> = {
  [BINDER_LIMITING_DRAINAGE]: "drainage",
  [BINDER_LIMITING_EXPOSURE]: "exposure",
  [BINDER_LIMITING_SAND]: "substrate",
  [BINDER_LIMITING_BURIAL]: "burial",
};

export type BinderHsiSample = {
  hsi: number;
  limiting: BinderLimitingId;
  limitingGap: number;
  fDrainage: number;
  fExposure: number;
  fSand: number;
  fBurial: number;
};

/** Dry-crest affinity — wet hollow → 0. */
export function factorDrainage(moisture: number, porosity: number): number {
  const cap = Math.max(porosity, 1e-6);
  return clamp01(1 - Math.max(0, moisture) / cap);
}

/** Windward / crest affinity from fetch×wind exposure (C-017). */
export function factorCrestExposure(shoreExposure: number): number {
  return clamp01(shoreExposure);
}

/**
 * Sand substrate affinity (C-009 table). Look up by class id — never hardcode
 * process forks per material (T-004).
 */
export function factorSandSubstrate(materialClassId: number): number {
  const id = Math.round(materialClassId);
  if (id === SUBSTRATE_SAND) return 1;
  if (id === SUBSTRATE_LOAM) return config.binderLoamSandFactor;
  if (id === SUBSTRATE_CLAY || id === SUBSTRATE_ROCK) return 0;
  return 0;
}

/**
 * Burial tolerance under coastal remobilization pressure (|longshore|).
 * Binders hold under moderate remobilization; extreme flux still limits.
 */
export function factorBurialTolerance(
  longshoreTendency: number,
  tolerance?: number,
): number {
  const pressure = clamp01(Math.abs(longshoreTendency));
  const tol = clamp01(tolerance ?? config.binderBurialTolerance);
  return clamp01(1 - pressure * (1 - tol));
}

/** Pure binder Liebig — no WorldState (T-006). */
export function evaluateBinderHsi(args: {
  moisture: number;
  porosity: number;
  shoreExposure: number;
  materialClassId: number;
  longshoreTendency?: number;
  burialTolerance?: number;
}): BinderHsiSample {
  const fDrainage = factorDrainage(args.moisture, args.porosity);
  const fExposure = factorCrestExposure(args.shoreExposure);
  const fSand = factorSandSubstrate(args.materialClassId);
  const fBurial = factorBurialTolerance(
    args.longshoreTendency ?? 0,
    args.burialTolerance,
  );
  const factors: [BinderLimitingId, number][] = [
    [BINDER_LIMITING_DRAINAGE, fDrainage],
    [BINDER_LIMITING_EXPOSURE, fExposure],
    [BINDER_LIMITING_SAND, fSand],
    [BINDER_LIMITING_BURIAL, fBurial],
  ];
  let limiting: BinderLimitingId = BINDER_LIMITING_DRAINAGE;
  let hsi = fDrainage;
  for (const [id, f] of factors) {
    if (f < hsi || (f === hsi && id < limiting)) {
      hsi = f;
      limiting = id;
    }
  }
  let second = 1;
  for (const [id, f] of factors) {
    if (id === limiting) continue;
    if (f < second) second = f;
  }
  return {
    hsi,
    limiting,
    limitingGap: Math.max(0, second - hsi),
    fDrainage,
    fExposure,
    fSand,
    fBurial,
  };
}
