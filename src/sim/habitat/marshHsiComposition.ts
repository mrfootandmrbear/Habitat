/**
 * Salt-marsh engineer HSI (C-016 / Slice N9).
 * Rule: docs/slices/N9-composition.md — inundation hump × salt-tolerant × temp.
 * Distinct from upland herb f_inundation (zero when wet) and strand f_shore.
 */

import { config } from "../../config";
import { factorInundationMarsh, tidalHydroperiod } from "./inundationComposition";
import { factorSalinityTolerant } from "./salinityComposition";
import { factorTemperature } from "./temperatureComposition";

export const MARSH_LIMITING_INUNDATION = 0;
export const MARSH_LIMITING_SALINITY = 1;
export const MARSH_LIMITING_TEMPERATURE = 2;

export type MarshLimitingId =
  | typeof MARSH_LIMITING_INUNDATION
  | typeof MARSH_LIMITING_SALINITY
  | typeof MARSH_LIMITING_TEMPERATURE;

export const MARSH_LIMITING_LABELS: Record<MarshLimitingId, string> = {
  [MARSH_LIMITING_INUNDATION]: "inundation",
  [MARSH_LIMITING_SALINITY]: "salinity",
  [MARSH_LIMITING_TEMPERATURE]: "temperature",
};

export type MarshHsiSample = {
  hsi: number;
  limiting: MarshLimitingId;
  limitingGap: number;
  fInundation: number;
  fSalinity: number;
  fTemp: number;
  hydroperiod: number;
};

/** Pure marsh Liebig — no WorldState (T-006). */
export function evaluateMarshHsi(args: {
  elevMeters?: number;
  mlwMeters?: number;
  mhwMeters?: number;
  salinity?: number;
  airTempC?: number;
  tempKillC?: number;
  tempOptC?: number;
  salinityFullThrough?: number;
}): MarshHsiSample {
  const hasTide =
    args.elevMeters !== undefined &&
    args.mlwMeters !== undefined &&
    args.mhwMeters !== undefined &&
    args.mhwMeters > args.mlwMeters;
  const hydroperiod = hasTide
    ? tidalHydroperiod(args.elevMeters!, args.mlwMeters!, args.mhwMeters!)
    : 0;
  const fInundation = factorInundationMarsh(hydroperiod);
  const fSalinity = factorSalinityTolerant(
    args.salinity ?? 0,
    args.salinityFullThrough ?? config.marshSalinityFullThrough,
  );
  const kill = args.tempKillC ?? config.marshTempKillC;
  const opt = args.tempOptC ?? config.marshTempOptC;
  const fTemp = factorTemperature(args.airTempC ?? opt, kill, opt);
  const factors: [MarshLimitingId, number][] = [
    [MARSH_LIMITING_INUNDATION, fInundation],
    [MARSH_LIMITING_SALINITY, fSalinity],
    [MARSH_LIMITING_TEMPERATURE, fTemp],
  ];
  let limiting: MarshLimitingId = MARSH_LIMITING_INUNDATION;
  let hsi = fInundation;
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
    fInundation,
    fSalinity,
    fTemp,
    hydroperiod,
  };
}
