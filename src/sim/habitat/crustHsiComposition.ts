/**
 * Cryptogam / biological crust HSI (Slice N11).
 * Rule: docs/slices/N11-composition.md — moisture × open canopy × salt-intolerant ×
 * upland inundation. Stage-2 cover bootstrap; still W-003 catalogue (no timers — ES-001).
 */

import { config } from "../../config";
import { clamp01, factorMoisture } from "./hsiComposition";
import {
  factorInundationUpland,
  tidalHydroperiod,
} from "./inundationComposition";
import { factorSalinity } from "./salinityComposition";
import { herbCoverFraction } from "./arrivalComposition";

export const CRUST_LIMITING_MOISTURE = 0;
export const CRUST_LIMITING_OPEN = 1;
export const CRUST_LIMITING_SALINITY = 2;
export const CRUST_LIMITING_INUNDATION = 3;

export type CrustLimitingId =
  | typeof CRUST_LIMITING_MOISTURE
  | typeof CRUST_LIMITING_OPEN
  | typeof CRUST_LIMITING_SALINITY
  | typeof CRUST_LIMITING_INUNDATION;

export const CRUST_LIMITING_LABELS: Record<CrustLimitingId, string> = {
  [CRUST_LIMITING_MOISTURE]: "moisture",
  [CRUST_LIMITING_OPEN]: "open canopy",
  [CRUST_LIMITING_SALINITY]: "salinity",
  [CRUST_LIMITING_INUNDATION]: "inundation",
};

/**
 * Open-canopy factor — stage-2 bootstrap prefers bare ground.
 * Dense pioneer/woody cover shade-limits crust (opposite of shrub facilitation).
 */
export function factorOpenCanopy(canopyFraction: number): number {
  return clamp01(1 - clamp01(canopyFraction));
}

/** Stacked non-crust cover fraction for the open-canopy arm (capped at 1). */
export function canopyCoverFraction(args: {
  herbBiomass?: number;
  herbBiomassMax?: number;
  strandBiomass?: number;
  strandBiomassMax?: number;
  binderBiomass?: number;
  binderBiomassMax?: number;
  marshBiomass?: number;
  marshBiomassMax?: number;
  shrubBiomass?: number;
  shrubBiomassMax?: number;
}): number {
  return Math.min(
    1,
    herbCoverFraction(
      args.herbBiomass ?? 0,
      args.herbBiomassMax ?? config.herbBiomassMax,
    ) +
      herbCoverFraction(
        args.strandBiomass ?? 0,
        args.strandBiomassMax ?? config.strandBiomassMax,
      ) +
      herbCoverFraction(
        args.binderBiomass ?? 0,
        args.binderBiomassMax ?? config.binderBiomassMax,
      ) +
      herbCoverFraction(
        args.marshBiomass ?? 0,
        args.marshBiomassMax ?? config.marshBiomassMax,
      ) +
      herbCoverFraction(
        args.shrubBiomass ?? 0,
        args.shrubBiomassMax ?? config.shrubBiomassMax,
      ),
  );
}

export type CrustHsiSample = {
  hsi: number;
  limiting: CrustLimitingId;
  limitingGap: number;
  fMoisture: number;
  fOpen: number;
  fSalinity: number;
  fInundation: number;
};

/** Pure crust Liebig — no WorldState (T-006). */
export function evaluateCrustHsi(args: {
  moisture?: number;
  porosity?: number;
  herbBiomass?: number;
  herbBiomassMax?: number;
  strandBiomass?: number;
  strandBiomassMax?: number;
  binderBiomass?: number;
  binderBiomassMax?: number;
  marshBiomass?: number;
  marshBiomassMax?: number;
  shrubBiomass?: number;
  shrubBiomassMax?: number;
  salinity?: number;
  elevMeters?: number;
  mlwMeters?: number;
  mhwMeters?: number;
}): CrustHsiSample {
  const fMoisture = factorMoisture(
    args.moisture ?? config.soilPorosity,
    args.porosity ?? config.soilPorosity,
  );
  const canopy = canopyCoverFraction(args);
  const fOpen = factorOpenCanopy(canopy);
  const fSalinity = factorSalinity(args.salinity ?? 0);
  const hasTide =
    args.elevMeters !== undefined &&
    args.mlwMeters !== undefined &&
    args.mhwMeters !== undefined &&
    args.mhwMeters > args.mlwMeters;
  const hydroperiod = hasTide
    ? tidalHydroperiod(args.elevMeters!, args.mlwMeters!, args.mhwMeters!)
    : 0;
  const fInundation = factorInundationUpland(hydroperiod);

  const factors: [CrustLimitingId, number][] = [
    [CRUST_LIMITING_MOISTURE, fMoisture],
    [CRUST_LIMITING_OPEN, fOpen],
    [CRUST_LIMITING_SALINITY, fSalinity],
    [CRUST_LIMITING_INUNDATION, fInundation],
  ];
  let limiting: CrustLimitingId = CRUST_LIMITING_MOISTURE;
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
    fOpen,
    fSalinity,
    fInundation,
  };
}
