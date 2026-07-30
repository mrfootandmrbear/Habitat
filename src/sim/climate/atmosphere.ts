/**
 * Atmospheric precip delivery (full C-020 / §4.21).
 * Climate dial → cloud water → discharge; phase from air temperature.
 * Deterministic (T-001); no cell targeting (C-004 / THESIS §9).
 */

import {
  rainDepthForRegime,
  regimeIsWetDay,
  regimeRainsThisEvent,
  regimeStormEventsPerWetDay,
  type RainRegime,
} from "./rainRegime";

/** 0 = rain, 1 = sleet, 2 = snow — real-world referents (N-004). */
export type PrecipPhase = 0 | 1 | 2;

export const PRECIP_PHASE_RAIN: PrecipPhase = 0;
export const PRECIP_PHASE_SLEET: PrecipPhase = 1;
export const PRECIP_PHASE_SNOW: PrecipPhase = 2;

/** Heat dial → air temperature (°C). */
export type HeatId = "warm" | "mild" | "cold";

export type HeatRegime = {
  id: HeatId;
  label: string;
  airTempC: number;
};

export const HEAT_REGIMES: readonly HeatRegime[] = [
  { id: "warm", label: "Heat: warm", airTempC: 16 },
  { id: "mild", label: "Heat: mild", airTempC: 1 },
  { id: "cold", label: "Heat: cold", airTempC: -8 },
] as const;

export function heatById(id: HeatId): HeatRegime {
  const found = HEAT_REGIMES.find((x) => x.id === id);
  if (!found) throw new Error(`Unknown heat id: ${id}`);
  return found;
}

/** Rain above this; sleet in the narrow band; snow below. */
export function precipPhaseFromTemp(airTempC: number): PrecipPhase {
  if (airTempC > 2) return PRECIP_PHASE_RAIN;
  if (airTempC > -1) return PRECIP_PHASE_SLEET;
  return PRECIP_PHASE_SNOW;
}

export type AtmosphereStepInput = {
  regime: RainRegime;
  airTempC: number;
  cloudWater: number;
  dayIndex: number;
  eventIndexInDay: number;
  dailyEventSteps: number;
  baseDepthPerEvent: number;
  /** Per-event decay when the day is dry. */
  dryDecay?: number;
};

export type AtmosphereStepResult = {
  cloudWater: number;
  precipPhase: PrecipPhase;
  /** Mean-cell liquid depth to deliver this event (0 if none). */
  dischargeDepth: number;
  raining: boolean;
};

/**
 * At dawn of each wet day, charge the full day's storm budget into the cloud
 * (storm is a wet-day prefix — there is no pre-storm wet window to drip-charge).
 * Discharge during the storm chunk; decay on dry days.
 * Cycle-mean precip matches `rainDepthForRegime` when every storm event runs.
 */
export function stepAtmosphere(input: AtmosphereStepInput): AtmosphereStepResult {
  const dryDecay = input.dryDecay ?? 0.82;
  const phase = precipPhaseFromTemp(input.airTempC);
  let cloud = Math.max(0, input.cloudWater);

  const wet = regimeIsWetDay(input.regime, input.dayIndex);
  const stormDepth = rainDepthForRegime(
    input.regime,
    input.baseDepthPerEvent,
    input.dailyEventSteps,
  );
  const raining =
    stormDepth > 0 &&
    regimeRainsThisEvent(
      input.regime,
      input.eventIndexInDay,
      input.dailyEventSteps,
      input.dayIndex,
    );

  if (wet && stormDepth > 0 && input.eventIndexInDay === 0) {
    const stormEvents = regimeStormEventsPerWetDay(
      input.regime,
      input.dailyEventSteps,
    );
    cloud += stormDepth * stormEvents;
  } else if (!wet) {
    cloud *= dryDecay;
    if (cloud < 1e-9) cloud = 0;
  }

  let dischargeDepth = 0;
  if (raining && cloud > 0) {
    dischargeDepth = Math.min(stormDepth, cloud);
    cloud = Math.max(0, cloud - dischargeDepth);
  }

  return {
    cloudWater: cloud,
    precipPhase: phase,
    dischargeDepth,
    raining: dischargeDepth > 0,
  };
}
