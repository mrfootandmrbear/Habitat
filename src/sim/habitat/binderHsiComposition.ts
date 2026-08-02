/**
 * Sandy crest sand-binder HSI (C-009 / Slice N5).
 * Rule: docs/slices/N5-composition.md — drainage × exposure × sand × burial.
 * Distinct from wet-site herb and strand splash pioneer.
 * Burial uses longshore transport divergence (∂Q/∂x), not |longshore|
 * magnitude — uniform drift nets zero burial pressure (§4.46).
 */

import { config } from "../../config";
import {
  SUBSTRATE_CLAY,
  SUBSTRATE_LOAM,
  SUBSTRATE_ROCK,
  SUBSTRATE_SAND,
} from "../terrain/substrates";
import { clamp01, triangularHump } from "./hsiComposition";

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

/**
 * Crest exposure hump — same triangular form as marsh inundation.
 * Inland (0) and extreme fetch (1) both limit; mid-crest peaks.
 */
export function factorCrestExposure(shoreExposure: number): number {
  return triangularHump(shoreExposure, 0.5);
}

/**
 * Sand substrate affinity (C-009 table). Look up by class id — never hardcode
 * process forks per material (T-004). Always clamp01 (review §2.5).
 */
export function factorSandSubstrate(materialClassId: number): number {
  const id = Math.round(materialClassId);
  if (id === SUBSTRATE_SAND) return 1;
  if (id === SUBSTRATE_LOAM) return clamp01(config.binderLoamSandFactor);
  if (id === SUBSTRATE_CLAY || id === SUBSTRATE_ROCK) return 0;
  return 0;
}

/**
 * Discrete divergence of the signed longshore tendency field.
 * Mirror edges so a uniform field yields exactly 0 (no spurious burial).
 */
export function longshoreTransportDivergence(
  longshore: Float32Array,
  i: number,
  width: number,
  height: number,
): number {
  const x = i % width;
  const z = (i / width) | 0;
  const q = longshore[i]!;
  const qW = x > 0 ? longshore[i - 1]! : q;
  const qE = x < width - 1 ? longshore[i + 1]! : q;
  const qN = z > 0 ? longshore[i - width]! : q;
  const qS = z < height - 1 ? longshore[i + width]! : q;
  return 0.5 * (qE - qW) + 0.5 * (qS - qN);
}

/**
 * Burial suitability under accretion (transport convergence = −divergence).
 * Hump peaks at moderate accretion — sand binders need burial to stay
 * vigorous; zero and extreme both limit (C-011).
 */
export function factorBurialTolerance(
  transportDivergence: number,
  optimum?: number,
): number {
  const accretion = clamp01(Math.max(0, -transportDivergence));
  const peak = clamp01(optimum ?? config.binderBurialOptimum);
  return triangularHump(accretion, peak);
}

/** Pure binder Liebig — no WorldState (T-006). */
export function evaluateBinderHsi(args: {
  moisture: number;
  porosity: number;
  shoreExposure: number;
  materialClassId: number;
  /** ∂Q divergence; omit → 0 (uniform / unknown). */
  transportDivergence?: number;
  burialOptimum?: number;
}): BinderHsiSample {
  const fDrainage = factorDrainage(args.moisture, args.porosity);
  const fExposure = factorCrestExposure(args.shoreExposure);
  const fSand = factorSandSubstrate(args.materialClassId);
  const fBurial = factorBurialTolerance(
    args.transportDivergence ?? 0,
    args.burialOptimum,
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
