/**
 * Liebig HSI composition (Slice 9 + Slice 20 salinity).
 * Rule: docs/slices/9-composition.md — NATURAL_PROCESS_MATH §3.3 min form.
 * Salinity: docs/slices/20-composition.md (C-018).
 *
 * HSI = min(f_moisture, f_depth, f_groundwater, f_salinity); limiting = argmin.
 * Not a health score (N-002); the arrival gate under C-007.
 */

import { factorSalinity } from "./salinityComposition";

export const LIMITING_MOISTURE = 0;
export const LIMITING_DEPTH = 1;
export const LIMITING_GROUNDWATER = 2;
export const LIMITING_SALINITY = 3;

export type LimitingFactorId =
  | typeof LIMITING_MOISTURE
  | typeof LIMITING_DEPTH
  | typeof LIMITING_GROUNDWATER
  | typeof LIMITING_SALINITY;

export const LIMITING_LABELS: Record<LimitingFactorId, string> = {
  [LIMITING_MOISTURE]: "moisture",
  [LIMITING_DEPTH]: "depth",
  [LIMITING_GROUNDWATER]: "groundwater",
  [LIMITING_SALINITY]: "salinity",
};

export type HsiSample = {
  hsi: number;
  limiting: LimitingFactorId;
  /** Gap from HSI to the second-smallest factor (≥ 0). */
  limitingGap: number;
  fMoisture: number;
  fDepth: number;
  fGroundwater: number;
  fSalinity: number;
};

export function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

export function factorMoisture(moisture: number, porosity: number): number {
  return clamp01(moisture / Math.max(porosity, 1e-6));
}

export function factorDepth(depthMeters: number, depthRef: number): number {
  return clamp01(depthMeters / Math.max(depthRef, 1e-6));
}

export function factorGroundwater(gwMeters: number, gwRef: number): number {
  return clamp01(gwMeters / Math.max(gwRef, 1e-6));
}

/** Pure Liebig evaluation — no WorldState (T-006 friendly). */
export function evaluateHsi(args: {
  moisture: number;
  soilDepth: number;
  groundwater: number;
  porosity: number;
  depthRef: number;
  gwRef: number;
  /** Porewater salinity fraction [0,1]; default 0 (fresh). */
  salinity?: number;
}): HsiSample {
  const fMoisture = factorMoisture(args.moisture, args.porosity);
  const fDepth = factorDepth(args.soilDepth, args.depthRef);
  const fGroundwater = factorGroundwater(args.groundwater, args.gwRef);
  const fSalinity = factorSalinity(args.salinity ?? 0);
  const factors: [LimitingFactorId, number][] = [
    [LIMITING_MOISTURE, fMoisture],
    [LIMITING_DEPTH, fDepth],
    [LIMITING_GROUNDWATER, fGroundwater],
    [LIMITING_SALINITY, fSalinity],
  ];
  // Stable tie-break: lowest factor id wins.
  let limiting: LimitingFactorId = LIMITING_MOISTURE;
  let hsi = fMoisture;
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
    fMoisture,
    fDepth,
    fGroundwater,
    fSalinity,
  };
}
