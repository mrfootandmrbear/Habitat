/**
 * L8 / C-025 — discrete deep-time skip menu (separate from the L6 continuous
 * rate ladder). Each preset binds an integration floor; invoking one advances
 * exactly that duration then returns control at the caller's L6 rate.
 *
 * C-024 reconciliation (Locked): compressed band periods stay as shipped for
 * continuous L6 (**C-008** immediacy). Skip floors state their own coarsening:
 * the ladder starts at the bound floor and runs every coarser band with dt
 * scaled to the calendar span advanced. Rates are not silently retuned under
 * the L6 dial.
 */
import { config } from "../config";
import type { TimescaleBand } from "./registry/types";
import type { WorldState } from "./WorldState";

/** Finest band that still runs during a skip (coarser bands always run above it). */
export type IntegrationFloor = TimescaleBand;

export type SkipPresetId =
  | "1day"
  | "1month"
  | "6months"
  | "1year"
  | "5years"
  | "10years"
  | "25years"
  | "50years"
  | "100years"
  | "1000years";

export type SkipPreset = {
  id: SkipPresetId;
  label: string;
  /** Human floor name for the HUD (C-025). */
  floorLabel: string;
  floor: IntegrationFloor;
  /** Exact sim-minutes to advance (360-day calendar). */
  durationSimMinutes: number;
};

/** One logged skip — sparse schedule travels with the run (T-001 / T-003 / C-005). */
export type SkipAction = {
  simMinutesAtAction: number;
  presetId: SkipPresetId;
  floor: IntegrationFloor;
  durationSimMinutes: number;
};

const MINUTES_PER_DAY = config.minutesPerDay;
const DAYS_PER_YEAR = 360;

function yearsToMinutes(years: number): number {
  return years * DAYS_PER_YEAR * MINUTES_PER_DAY;
}

function daysToMinutes(days: number): number {
  return days * MINUTES_PER_DAY;
}

/**
 * Floor table from C-024/C-025 framing — Locked as the shipped binding unless a
 * probe forces a boundary move (stated in the commit body).
 */
export const SKIP_PRESETS: readonly SkipPreset[] = [
  {
    id: "1day",
    label: "1 day",
    floor: "event",
    floorLabel: "event",
    durationSimMinutes: daysToMinutes(1),
  },
  {
    id: "1month",
    label: "1 month",
    floor: "daily",
    floorLabel: "daily",
    durationSimMinutes: daysToMinutes(30),
  },
  {
    id: "6months",
    label: "6 months",
    floor: "seasonal",
    floorLabel: "seasonal",
    durationSimMinutes: daysToMinutes(180),
  },
  {
    id: "1year",
    label: "1 year",
    floor: "seasonal",
    floorLabel: "seasonal",
    durationSimMinutes: yearsToMinutes(1),
  },
  {
    id: "5years",
    label: "5 years",
    floor: "annual",
    floorLabel: "annual",
    durationSimMinutes: yearsToMinutes(5),
  },
  {
    id: "10years",
    label: "10 years",
    floor: "annual",
    floorLabel: "annual",
    durationSimMinutes: yearsToMinutes(10),
  },
  {
    id: "25years",
    label: "25 years",
    floor: "annual",
    floorLabel: "annual",
    durationSimMinutes: yearsToMinutes(25),
  },
  {
    id: "50years",
    label: "50 years",
    floor: "decadal",
    floorLabel: "decadal",
    durationSimMinutes: yearsToMinutes(50),
  },
  {
    id: "100years",
    label: "100 years",
    floor: "decadal",
    floorLabel: "decadal",
    durationSimMinutes: yearsToMinutes(100),
  },
  {
    id: "1000years",
    label: "1000 years",
    floor: "decadal",
    floorLabel: "decadal",
    durationSimMinutes: yearsToMinutes(1000),
  },
];

export function skipPresetById(id: SkipPresetId): SkipPreset {
  const found = SKIP_PRESETS.find((p) => p.id === id);
  if (!found) throw new Error(`unknown skip preset: ${id}`);
  return found;
}

/** Sim-years represented by one compressed decadal band commit (deep-time fiction). */
export const YEARS_PER_DECADAL_BAND = 10;

/**
 * Advance `world` by exactly `durationSimMinutes` starting the ladder at `floor`.
 * Mutates clock phase boxes so a subsequent `stepEvent` continues coherently.
 */
export function advanceAtFloor(
  world: WorldState,
  floor: IntegrationFloor,
  durationSimMinutes: number,
): void {
  if (durationSimMinutes <= 0) return;

  switch (floor) {
    case "event":
      advanceEventFloor(world, durationSimMinutes);
      break;
    case "daily":
      advanceDailyFloor(world, durationSimMinutes);
      break;
    case "seasonal":
      advanceSeasonalFloor(world, durationSimMinutes);
      break;
    case "annual":
      advanceAnnualFloor(world, durationSimMinutes);
      break;
    case "decadal":
      advanceDecadalFloor(world, durationSimMinutes);
      break;
    default: {
      const _exhaustive: never = floor;
      throw new Error(`unknown floor: ${_exhaustive}`);
    }
  }
}

function advanceEventFloor(world: WorldState, durationSimMinutes: number): void {
  const steps = Math.round(durationSimMinutes / config.eventDtMinutes);
  for (let i = 0; i < steps; i++) {
    world.stepEvent();
  }
}

function advanceDailyFloor(world: WorldState, durationSimMinutes: number): void {
  const days = Math.round(durationSimMinutes / MINUTES_PER_DAY);
  for (let d = 0; d < days; d++) {
    world.commitSkipDay();
  }
}

function advanceSeasonalFloor(
  world: WorldState,
  durationSimMinutes: number,
): void {
  const days = Math.round(durationSimMinutes / MINUTES_PER_DAY);
  const period = config.seasonalDailySteps;
  const commits = Math.floor(days / period);
  const remainderDays = days - commits * period;
  for (let i = 0; i < commits; i++) {
    world.commitSkipSeasonal();
  }
  for (let d = 0; d < remainderDays; d++) {
    world.commitSkipDay();
  }
}

function advanceAnnualFloor(
  world: WorldState,
  durationSimMinutes: number,
): void {
  const days = Math.round(durationSimMinutes / MINUTES_PER_DAY);
  const period = config.annualDailySteps;
  const commits = Math.floor(days / period);
  const remainderDays = days - commits * period;
  for (let i = 0; i < commits; i++) {
    world.commitSkipAnnual();
  }
  // Remainder may still cross seasonal boundaries — use daily commits so
  // seasonal/annual/decadal counters stay exact.
  for (let d = 0; d < remainderDays; d++) {
    world.commitSkipDay();
  }
}

function advanceDecadalFloor(
  world: WorldState,
  durationSimMinutes: number,
): void {
  const years = durationSimMinutes / yearsToMinutes(1);
  const commits = Math.round(years / YEARS_PER_DECADAL_BAND);
  for (let i = 0; i < commits; i++) {
    world.commitSkipDecadal();
  }
  // Exact residual years (sub-decade) fall to annual floor so HUD duration
  // matches the preset label even when years % 10 !== 0.
  const residualYears = years - commits * YEARS_PER_DECADAL_BAND;
  if (residualYears > 1e-9) {
    advanceAnnualFloor(world, yearsToMinutes(residualYears));
  }
}
