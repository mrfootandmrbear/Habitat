/**
 * Climate-capped woody shrub HSI (Slice N10).
 * Rule: docs/slices/N10-composition.md — warmer f_temp × cover facilitation ×
 * moisture × salt-intolerant × upland inundation.
 * Stage-3 structural guild; still W-003 catalogue (no timers — ES-001).
 */

import { config } from "../../config";
import { clamp01, factorMoisture } from "./hsiComposition";
import {
  factorInundationUpland,
  tidalHydroperiod,
} from "./inundationComposition";
import { factorSalinity } from "./salinityComposition";
import { factorTemperature } from "./temperatureComposition";
import { herbCoverFraction } from "./arrivalComposition";

export const SHRUB_LIMITING_TEMPERATURE = 0;
export const SHRUB_LIMITING_COVER = 1;
export const SHRUB_LIMITING_MOISTURE = 2;
export const SHRUB_LIMITING_SALINITY = 3;
export const SHRUB_LIMITING_INUNDATION = 4;

export type ShrubLimitingId =
  | typeof SHRUB_LIMITING_TEMPERATURE
  | typeof SHRUB_LIMITING_COVER
  | typeof SHRUB_LIMITING_MOISTURE
  | typeof SHRUB_LIMITING_SALINITY
  | typeof SHRUB_LIMITING_INUNDATION;

export const SHRUB_LIMITING_LABELS: Record<ShrubLimitingId, string> = {
  [SHRUB_LIMITING_TEMPERATURE]: "temperature",
  [SHRUB_LIMITING_COVER]: "cover",
  [SHRUB_LIMITING_MOISTURE]: "moisture",
  [SHRUB_LIMITING_SALINITY]: "salinity",
  [SHRUB_LIMITING_INUNDATION]: "inundation",
};

/**
 * Cover facilitation — stage filter. Bare → 0; saturates as pioneer cover rises.
 * Michaelis form so halfSat is inspectable (N-004).
 */
export function factorCoverFacilitation(
  coverFraction: number,
  halfSat: number,
): number {
  const c = clamp01(coverFraction);
  const h = Math.max(halfSat, 1e-6);
  return clamp01(c / (c + h));
}

export type ShrubHsiSample = {
  hsi: number;
  limiting: ShrubLimitingId;
  limitingGap: number;
  fTemp: number;
  fCover: number;
  fMoisture: number;
  fSalinity: number;
  fInundation: number;
};

/** Pure shrub Liebig — no WorldState (T-006). */
export function evaluateShrubHsi(args: {
  airTempC?: number;
  tempKillC?: number;
  tempOptC?: number;
  herbBiomass?: number;
  herbBiomassMax?: number;
  coverHalfSat?: number;
  moisture?: number;
  porosity?: number;
  salinity?: number;
  elevMeters?: number;
  mlwMeters?: number;
  mhwMeters?: number;
}): ShrubHsiSample {
  const kill = args.tempKillC ?? config.shrubTempKillC;
  const opt = args.tempOptC ?? config.shrubTempOptC;
  const fTemp = factorTemperature(args.airTempC ?? opt, kill, opt);
  const herbFrac = herbCoverFraction(
    args.herbBiomass ?? 0,
    args.herbBiomassMax ?? config.herbBiomassMax,
  );
  const fCover = factorCoverFacilitation(
    herbFrac,
    args.coverHalfSat ?? config.shrubCoverHalfSat,
  );
  const fMoisture = factorMoisture(
    args.moisture ?? config.soilPorosity,
    args.porosity ?? config.soilPorosity,
  );
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

  const factors: [ShrubLimitingId, number][] = [
    [SHRUB_LIMITING_TEMPERATURE, fTemp],
    [SHRUB_LIMITING_COVER, fCover],
    [SHRUB_LIMITING_MOISTURE, fMoisture],
    [SHRUB_LIMITING_SALINITY, fSalinity],
    [SHRUB_LIMITING_INUNDATION, fInundation],
  ];
  let limiting: ShrubLimitingId = SHRUB_LIMITING_TEMPERATURE;
  let hsi = fTemp;
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
    fTemp,
    fCover,
    fMoisture,
    fSalinity,
    fInundation,
  };
}
