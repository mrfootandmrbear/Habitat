/**
 * The time control in real-world units (Slice L6; T-002 Locked — "exact
 * multipliers are tuning parameters rather than constitutional decisions").
 *
 * The old control was a multiplier against a base nobody could state: "1×" was
 * 54,000× real time and true real time was unreachable. Every rate below is
 * declared as **sim-time delivered per wall-second** and the machine scale is
 * *derived* from `config.eventDtMinutes` and `config.wallSecondsPerEventStep`
 * here and nowhere else, so a label cannot drift away from the clock.
 *
 * The ceiling is honest: `sustainableRates()` offers only rates whose steady
 * demand fits `config.maxStepsPerFrame` at 60 fps. Rates above it are not
 * offered rather than offered-and-discarded — that was the L1 defect.
 *
 * S-009 holds: this changes wall-clock cadence only. The fixed timestep, every
 * band period, and every authoritative outcome are untouched.
 */
import { config } from "../config";

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

/** Sim-seconds one event step delivers — the clock's own quantum. */
export const SIM_SECONDS_PER_EVENT_STEP = config.eventDtMinutes * SECONDS_PER_MINUTE;

/** Sim-seconds in one sim-day, from the world's own calendar. */
export const SIM_SECONDS_PER_DAY = config.minutesPerDay * SECONDS_PER_MINUTE;

/** Habitat's calendar is 360 days of 24 hours (SIMULATION_MODEL §6.1). */
export const SIM_DAYS_PER_YEAR = 360;

export type TimeRateId =
  | "pause"
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month";

/**
 * Fraction of the per-frame catch-up ceiling a rate may consume in steady
 * state. The remainder is what pays deferred debt back down (L1) — a rate that
 * used the whole ceiling could never catch up from a single stalled frame.
 */
export const CATCH_UP_HEADROOM = 0.75;

export type TimeRateSpec = {
  id: TimeRateId;
  /** What the button says. */
  label: string;
  /** Screen-reader / hint expansion. */
  description: string;
  /** Sim-seconds delivered per wall-second. 0 is pause. */
  simSecondsPerWallSecond: number;
};

/**
 * Every nameable rate, slowest first. `second` is true real time — one
 * simulated second per wall-second — which the old "1×" missed by a factor of
 * 54,000.
 *
 * The ladder deliberately runs *past* what the machine can hold; the ceiling is
 * applied by `sustainableRates()`, so what the player is offered is the result
 * of a throughput measurement rather than a hand-picked end of a list.
 */
export const TIME_RATE_LADDER: TimeRateSpec[] = [
  {
    id: "pause",
    label: "Pause",
    description: "Paused — no simulated time passes",
    simSecondsPerWallSecond: 0,
  },
  {
    id: "second",
    label: "1 s/s",
    description: "Real time — one simulated second per second",
    simSecondsPerWallSecond: 1,
  },
  {
    id: "minute",
    label: "1 min/s",
    description: "One simulated minute per second",
    simSecondsPerWallSecond: SECONDS_PER_MINUTE,
  },
  {
    id: "hour",
    label: "1 h/s",
    description: "One simulated hour per second",
    simSecondsPerWallSecond: SECONDS_PER_HOUR,
  },
  {
    id: "day",
    label: "1 day/s",
    description: "One simulated day per second",
    simSecondsPerWallSecond: SIM_SECONDS_PER_DAY,
  },
  {
    id: "week",
    label: "1 week/s",
    description: "Seven simulated days per second",
    simSecondsPerWallSecond: 7 * SIM_SECONDS_PER_DAY,
  },
  {
    id: "month",
    label: "1 month/s",
    description: "Thirty simulated days per second",
    simSecondsPerWallSecond: 30 * SIM_SECONDS_PER_DAY,
  },
];

/** Event steps a rate demands per wall-second. */
export function stepsPerWallSecond(rate: TimeRateSpec): number {
  return rate.simSecondsPerWallSecond / SIM_SECONDS_PER_EVENT_STEP;
}

/** Event steps a rate demands per rendered frame at `fps`. */
export function stepsPerFrame(rate: TimeRateSpec, fps = 60): number {
  return stepsPerWallSecond(rate) / fps;
}

/**
 * The `SimClock` time scale that delivers this rate. Derived, never typed:
 * the clock charges `wallSecondsPerEventStep` of scaled wall time per step.
 */
export function timeScaleFor(rate: TimeRateSpec): number {
  return stepsPerWallSecond(rate) * config.wallSecondsPerEventStep;
}

/**
 * Whether the machine can hold this rate in steady state and still have catch-up
 * left over. Pause is trivially sustainable.
 */
export function isSustainable(rate: TimeRateSpec, fps = 60): boolean {
  return (
    stepsPerFrame(rate, fps) <= config.maxStepsPerFrame * CATCH_UP_HEADROOM
  );
}

/** The offered ladder — the honest ceiling, not a hand-picked end of the list. */
export function sustainableRates(fps = 60): TimeRateSpec[] {
  return TIME_RATE_LADDER.filter((r) => isSustainable(r, fps));
}

/**
 * Button copy for a rate, including the "fastest sustainable" suffix when
 * this rate actually is the fastest one currently offered — derived from
 * `sustainableRates()` like every other label here, not hardcoded to a
 * specific rate id (BUILD_GUIDE §4.52). On a machine that only sustains
 * `month` instead of `week`, the suffix moves with it instead of going stale.
 */
export function rateDescription(rate: TimeRateSpec, fps = 60): string {
  const offered = sustainableRates(fps);
  const fastest = offered[offered.length - 1];
  const isFastestSustained =
    fastest?.id === rate.id && rate.simSecondsPerWallSecond > 0;
  return isFastestSustained
    ? `${rate.description} — the fastest this machine sustains`
    : rate.description;
}

export function rateById(id: TimeRateId): TimeRateSpec {
  const found = TIME_RATE_LADDER.find((r) => r.id === id);
  if (!found) throw new Error(`unknown time rate: ${id}`);
  return found;
}

/**
 * Elapsed **simulation** time in real units (S-009: the sim clock is the
 * readout; wall time is presentation). Years and days come from the world's
 * own 360-day calendar.
 */
export function formatSimElapsed(simMinutes: number): string {
  const totalDays = simMinutes / config.minutesPerDay;
  if (totalDays >= SIM_DAYS_PER_YEAR) {
    const years = Math.floor(totalDays / SIM_DAYS_PER_YEAR);
    const days = Math.floor(totalDays - years * SIM_DAYS_PER_YEAR);
    return `${years}y ${days}d`;
  }
  if (totalDays >= 1) {
    const days = Math.floor(totalDays);
    const hours = Math.floor((totalDays - days) * 24);
    return `${days}d ${hours}h`;
  }
  const hours = Math.floor(simMinutes / 60);
  const minutes = Math.floor(simMinutes - hours * 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}
