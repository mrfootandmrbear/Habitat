/**
 * Strand splash pioneer HSI (C-018 / Slice N4).
 * Rule: docs/slices/N4-composition.md — shore × salt-tolerant × temp.
 * Distinct from wet-site herb Liebig (rejects reusing herb f_salinity = 1−S).
 * Spray is an herb Liebig arm only (C-017); strand holds via f_shore.
 * Burial deferred (W-003).
 */

import { config } from "../../config";
import { clamp01 } from "./hsiComposition";
import { factorSalinityTolerant } from "./salinityComposition";
import { factorTemperature } from "./temperatureComposition";

export const STRAND_LIMITING_SHORE = 0;
export const STRAND_LIMITING_SALINITY = 1;
export const STRAND_LIMITING_TEMPERATURE = 2;

export type StrandLimitingId =
  | typeof STRAND_LIMITING_SHORE
  | typeof STRAND_LIMITING_SALINITY
  | typeof STRAND_LIMITING_TEMPERATURE;

export const STRAND_LIMITING_LABELS: Record<StrandLimitingId, string> = {
  [STRAND_LIMITING_SHORE]: "shore",
  [STRAND_LIMITING_SALINITY]: "salinity",
  [STRAND_LIMITING_TEMPERATURE]: "temperature",
};

export type StrandHsiSample = {
  hsi: number;
  limiting: StrandLimitingId;
  limitingGap: number;
  fShore: number;
  fSalinity: number;
  fTemp: number;
};

/** Shore affinity from fetch×wind exposure (C-017) — inland → 0. */
export function factorShore(shoreExposure: number): number {
  return clamp01(shoreExposure);
}

/** Pure strand Liebig — no WorldState (T-006). */
export function evaluateStrandHsi(args: {
  shoreExposure: number;
  salinity?: number;
  airTempC?: number;
  tempKillC?: number;
  tempOptC?: number;
  salinityFullThrough?: number;
}): StrandHsiSample {
  const fShore = factorShore(args.shoreExposure);
  const fSalinity = factorSalinityTolerant(
    args.salinity ?? 0,
    args.salinityFullThrough ?? config.strandSalinityFullThrough,
  );
  const kill = args.tempKillC ?? config.strandTempKillC;
  const opt = args.tempOptC ?? config.strandTempOptC;
  const fTemp = factorTemperature(args.airTempC ?? opt, kill, opt);
  const factors: [StrandLimitingId, number][] = [
    [STRAND_LIMITING_SHORE, fShore],
    [STRAND_LIMITING_SALINITY, fSalinity],
    [STRAND_LIMITING_TEMPERATURE, fTemp],
  ];
  let limiting: StrandLimitingId = STRAND_LIMITING_SHORE;
  let hsi = fShore;
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
    fShore,
    fSalinity,
    fTemp,
  };
}
