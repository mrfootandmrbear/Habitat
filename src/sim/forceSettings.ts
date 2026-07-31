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
import type { WorldState } from "./WorldState";

export type ForceSettings = {
  rain: RainRegimeId;
  heat: HeatId;
  sea: SeaLevelId;
  tide: TideId;
  wind: WindId;
};

export const DEFAULT_FORCE_SETTINGS: ForceSettings = {
  rain: "dry",
  heat: "warm",
  sea: "mid",
  tide: "off",
  wind: "west",
};

/** Apply global force dials — no cell targeting (C-004). */
export function applyForces(world: WorldState, forces: ForceSettings): void {
  world.setRainRegime(forces.rain);
  world.setAirTemperature(heatById(forces.heat).airTempC);
  world.setSeaLevel(seaLevelById(forces.sea).meters);
  world.setTidalAmplitude(tideById(forces.tide).amplitudeMeters);
  const w = windById(forces.wind);
  world.setWind(w.ux, w.uz);
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
  };
}

export function forcesEqual(a: ForceSettings, b: ForceSettings): boolean {
  return (
    a.rain === b.rain &&
    a.heat === b.heat &&
    a.sea === b.sea &&
    a.tide === b.tide &&
    a.wind === b.wind
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
