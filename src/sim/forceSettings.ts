/**
 * Force dial snapshot for branch reproducibility (C-005 / C-004).
 * Registry saves alone omit rain / sea / tide / wind / heat IDs — they live here.
 * No cell or place arguments (THESIS §9).
 */
import { HEAT_REGIMES, heatById, type HeatId } from "./climate/atmosphere";
import { type RainRegimeId } from "./climate/rainRegime";
import {
  SEA_LEVEL_REGIMES,
  seaLevelById,
  type SeaLevelId,
} from "./climate/seaLevel";
import { TIDE_REGIMES, tideById, type TideId } from "./climate/tidalEnvelope";
import { WIND_REGIMES, windById, type WindId } from "./climate/windRegime";
import {
  SEASON_REGIMES,
  seasonById,
  type SeasonId,
} from "./climate/seasonRegime";
import {
  EROSION_REGIMES,
  erosionById,
  type ErosionId,
} from "./climate/erosionRegime";
import type { WorldState } from "./WorldState";

export type ForceSettings = {
  rain: RainRegimeId;
  heat: HeatId;
  sea: SeaLevelId;
  tide: TideId;
  wind: WindId;
  season: SeasonId;
  erosion: ErosionId;
};

export const DEFAULT_FORCE_SETTINGS: ForceSettings = {
  rain: "dry",
  heat: "warm",
  sea: "mid",
  tide: "off",
  wind: "west",
  season: "typical",
  erosion: "moderate",
};

/** Apply global force dials — no cell targeting (C-004). */
export function applyForces(world: WorldState, forces: ForceSettings): void {
  world.setRainRegime(forces.rain);
  world.setAirTemperature(heatById(forces.heat).airTempC);
  world.setSeaLevel(seaLevelById(forces.sea).meters);
  world.setTidalAmplitude(tideById(forces.tide).amplitudeMeters);
  const w = windById(forces.wind);
  world.setWind(w.ux, w.uz);
  world.setSeasonPressure(seasonById(forces.season).pressure);
  world.setErosionIntensity(erosionById(forces.erosion).intensity);
}

/**
 * Capture dial IDs from a live world (reverse-map meters / temps to panel IDs).
 * Prefer an explicit UI snapshot when available — this recovers after load/fork.
 */
export function captureForcesFromWorld(world: WorldState): ForceSettings {
  return {
    rain: world.rainRegime,
    heat: heatIdFromTemp(world.airTemperature),
    sea: seaIdFromMeters(world.seaLevel),
    tide: tideIdFromAmplitude(world.tidalAmplitude),
    wind: windIdFromComponents(world.wind.ux, world.wind.uz),
    season: seasonIdFromPressure(world.seasonPressure),
    erosion: erosionIdFromIntensity(world.erosionIntensity),
  };
}

export function forcesEqual(a: ForceSettings, b: ForceSettings): boolean {
  return (
    a.rain === b.rain &&
    a.heat === b.heat &&
    a.sea === b.sea &&
    a.tide === b.tide &&
    a.wind === b.wind &&
    a.season === b.season &&
    a.erosion === b.erosion
  );
}

function heatIdFromTemp(tempC: number): HeatId {
  let best: HeatId = HEAT_REGIMES[0]!.id;
  let bestDist = Infinity;
  for (const h of HEAT_REGIMES) {
    const d = Math.abs(h.airTempC - tempC);
    if (d < bestDist) {
      bestDist = d;
      best = h.id;
    }
  }
  return best;
}

function seaIdFromMeters(meters: number | undefined): SeaLevelId {
  for (const r of SEA_LEVEL_REGIMES) {
    if (r.meters === undefined && meters === undefined) return r.id;
    if (
      r.meters !== undefined &&
      meters !== undefined &&
      Math.abs(r.meters - meters) < 1e-6
    ) {
      return r.id;
    }
  }
  return "none";
}

function tideIdFromAmplitude(amp: number): TideId {
  let best: TideId = TIDE_REGIMES[0]!.id;
  let bestDist = Infinity;
  for (const t of TIDE_REGIMES) {
    const d = Math.abs(t.amplitudeMeters - amp);
    if (d < bestDist) {
      bestDist = d;
      best = t.id;
    }
  }
  return best;
}

function windIdFromComponents(ux: number, uz: number): WindId {
  let best: WindId = WIND_REGIMES[0]!.id;
  let bestDist = Infinity;
  for (const w of WIND_REGIMES) {
    const d = (w.ux - ux) ** 2 + (w.uz - uz) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = w.id;
    }
  }
  return best;
}

function seasonIdFromPressure(pressure: number): SeasonId {
  let best: SeasonId = SEASON_REGIMES[0]!.id;
  let bestDist = Infinity;
  for (const s of SEASON_REGIMES) {
    const d = Math.abs(s.pressure - pressure);
    if (d < bestDist) {
      bestDist = d;
      best = s.id;
    }
  }
  return best;
}

function erosionIdFromIntensity(intensity: number): ErosionId {
  let best: ErosionId = EROSION_REGIMES[0]!.id;
  let bestDist = Infinity;
  for (const e of EROSION_REGIMES) {
    const d = Math.abs(e.intensity - intensity);
    if (d < bestDist) {
      bestDist = d;
      best = e.id;
    }
  }
  return best;
}
