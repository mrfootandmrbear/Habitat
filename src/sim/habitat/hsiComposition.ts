/**
 * Liebig HSI composition (Slice 9 + Slice 20 salinity + Heat + spray + inundation + light).
 * Rule: docs/slices/9-composition.md — NATURAL_PROCESS_MATH §3.3 min form.
 * Salinity: docs/slices/20-composition.md (C-018).
 * Temperature: docs/slices/N2-composition.md (C-004 / C-020 hypothesis).
 * Spray: docs/slices/N3-composition.md (C-017) — distinct from soil salt.
 * Inundation: docs/slices/N8-composition.md (C-016) — ≠ salinity, ≠ spray.
 * Light: docs/slices/N7-composition.md (C-007 / C-011) — open-sky I₀, not understory.
 *
 * HSI = min(f_moisture, f_depth, f_groundwater, f_salinity, f_temp, f_spray, f_inundation, f_light); limiting = argmin.
 * Not a health score (N-002); the arrival gate under C-007.
 */

import { config } from "../../config";
import {
  factorInundationUpland,
  tidalHydroperiod,
} from "./inundationComposition";
import { factorLight } from "./lightComposition";
import { factorSalinity } from "./salinityComposition";
import { factorSpray } from "./sprayComposition";
import { factorTemperature } from "./temperatureComposition";

export const LIMITING_MOISTURE = 0;
export const LIMITING_DEPTH = 1;
export const LIMITING_GROUNDWATER = 2;
export const LIMITING_SALINITY = 3;
export const LIMITING_TEMPERATURE = 4;
export const LIMITING_SPRAY = 5;
export const LIMITING_INUNDATION = 6;
export const LIMITING_LIGHT = 7;

export type LimitingFactorId =
  | typeof LIMITING_MOISTURE
  | typeof LIMITING_DEPTH
  | typeof LIMITING_GROUNDWATER
  | typeof LIMITING_SALINITY
  | typeof LIMITING_TEMPERATURE
  | typeof LIMITING_SPRAY
  | typeof LIMITING_INUNDATION
  | typeof LIMITING_LIGHT;

export const LIMITING_LABELS: Record<LimitingFactorId, string> = {
  [LIMITING_MOISTURE]: "moisture",
  [LIMITING_DEPTH]: "depth",
  [LIMITING_GROUNDWATER]: "groundwater",
  [LIMITING_SALINITY]: "salinity",
  [LIMITING_TEMPERATURE]: "temperature",
  [LIMITING_SPRAY]: "spray",
  [LIMITING_INUNDATION]: "inundation",
  [LIMITING_LIGHT]: "light",
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
  fTemp: number;
  fSpray: number;
  fInundation: number;
  fLight: number;
};

export function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/**
 * Triangular hump on [0,1]: peaks at `peak`, zero at `peak±0.5` (clamped).
 * Shared shape for marsh inundation, upland taper mirror, exposure, burial, moisture.
 */
export function triangularHump(x: number, peak = 0.5): number {
  return clamp01(1 - 2 * Math.abs(clamp01(x) - peak));
}

/**
 * Herb/shrub moisture: hump peaking at half field capacity.
 * Saturation and bone-dry both limit (wet-side penalty).
 */
export function factorMoisture(moisture: number, porosity: number): number {
  const fill = clamp01(moisture / Math.max(porosity, 1e-6));
  return triangularHump(fill, 0.5);
}

/**
 * Crust moisture: peaks at low–moderate fill — desiccation-adapted, not
 * saturation-loving (C-011). Asymmetric: 0 at bone-dry, 1 at 25% fill, 0
 * again by mid-wet (symmetric triangularHump would leave dry at 0.5).
 */
export function factorMoistureCrust(moisture: number, porosity: number): number {
  const fill = clamp01(moisture / Math.max(porosity, 1e-6));
  const peak = 0.25;
  const wetZero = 0.55;
  if (fill <= peak) return clamp01(fill / Math.max(peak, 1e-6));
  if (fill >= wetZero) return 0;
  return clamp01(1 - (fill - peak) / (wetZero - peak));
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
  /** Air temperature (°C); default warm enough that f_temp = 1. */
  airTempC?: number;
  /** Guild frost kill (°C); required with airTempC for a non-default gate. */
  tempKillC?: number;
  /** Guild optimum (°C); required with airTempC for a non-default gate. */
  tempOptC?: number;
  /** Shore exposure [0,1]; default 0 so inland / legacy call sites stay full. */
  shoreExposure?: number;
  /**
   * Terrain elev + MHW/MLW for inundation (C-016). Omit or pass non-positive
   * range → f_inundation = 1 (no tide / inland legacy).
   */
  elevMeters?: number;
  mlwMeters?: number;
  mhwMeters?: number;
  /**
   * Insolation [0,1] reaching this guild's own canopy layer (C-007 / C-011).
   * Omit → f_light = 1 (flat / legacy call sites). For germination-stage
   * arrival this is open-sky terrainInsolation; for an understory guild
   * shaded by a taller one, the caller pre-attenuates it through that
   * guild's Beer–Lambert canopy (L5 / C-023 — herb reads insolation under
   * shrub's cover, not the unrelated generic `light.understory` field). What
   * this function must never receive is the *reported display* understory
   * value from a guild's own self-shading — that would double-count a
   * canopy against itself.
   */
  insolation?: number;
}): HsiSample {
  const fMoisture = factorMoisture(args.moisture, args.porosity);
  const fDepth = factorDepth(args.soilDepth, args.depthRef);
  const fGroundwater = factorGroundwater(args.groundwater, args.gwRef);
  const fSalinity = factorSalinity(
    args.salinity ?? 0,
    config.herbSalinityFullThrough,
  );
  const kill = args.tempKillC ?? config.herbTempKillC;
  const opt = args.tempOptC ?? config.herbTempOptC;
  // Missing airTemp → treat as at/above opt so legacy call sites stay full.
  const fTemp = factorTemperature(args.airTempC ?? opt, kill, opt);
  const fSpray = factorSpray(args.shoreExposure ?? 0);
  const elev = args.elevMeters;
  const mlw = args.mlwMeters;
  const mhw = args.mhwMeters;
  const hydroperiod =
    elev !== undefined && mlw !== undefined && mhw !== undefined
      ? tidalHydroperiod(elev, mlw, mhw)
      : 0;
  const fInundation = factorInundationUpland(hydroperiod);
  // Missing insolation → full light so pure-factor unit tests stay focused.
  const fLight =
    args.insolation !== undefined ? factorLight(args.insolation) : 1;
  const factors: [LimitingFactorId, number][] = [
    [LIMITING_MOISTURE, fMoisture],
    [LIMITING_DEPTH, fDepth],
    [LIMITING_GROUNDWATER, fGroundwater],
    [LIMITING_SALINITY, fSalinity],
    [LIMITING_TEMPERATURE, fTemp],
    [LIMITING_SPRAY, fSpray],
    [LIMITING_INUNDATION, fInundation],
    [LIMITING_LIGHT, fLight],
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
    fTemp,
    fSpray,
    fInundation,
    fLight,
  };
}
