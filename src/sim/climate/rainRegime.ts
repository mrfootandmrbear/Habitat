/**
 * Climate rainfall dial (Slice F / C-004 / Slice R).
 * Global regimes only — no cell targeting (THESIS §9).
 *
 * Archetypes (owner 2026-07-30):
 *   arid     → desert storm frequency (rare, short)
 *   light    → occasional temperate showers
 *   moderate → ordinary rain events
 *   wet      → monsoon wet-block, then dry
 *
 * Intensity is a climate-mean multiplier on `rainDepthPerEvent`, calibrated so
 * cycle-average daily depth ≈ real-world annual budgets (not the old Slice F
 * cartoon rates that flooded the island at 16×). Spells stay contiguous.
 * Deterministic (T-001); no free weather RNG while C-003 is Open.
 */

export type RainRegimeId = "dry" | "light" | "moderate" | "heavy";

export type RainRegime = {
  id: RainRegimeId;
  /** Control label (exact name used in playtests). */
  label: string;
  /**
   * Target climate mean as a fraction of (base × events/day).
   * Chosen so daily mean ≈ annualMm / 365 (see annualMmApprox).
   */
  intensity: number;
  /** Approximate annual precip (mm) this intensity targets — documentation. */
  annualMmApprox: number;
  /** Days in one repeating climate cycle. */
  cycleDays: number;
  /** Contiguous wet days at the start of each cycle. */
  wetDays: number;
  /**
   * Contiguous fraction of each wet day that the storm occupies
   * (prefix of the day — one event chunk, not a flash train).
   */
  stormFraction: number;
};

/**
 * base=0.00125 m/event, N=96 → full-on = 120 mm/day.
 * intensity = (annualMm/365/1000) / (0.00125*96)
 *
 * Arid storms are rare but sharp; monsoon spends most of its budget in a
 * multi-day wet block.
 */
export const RAIN_REGIMES: readonly RainRegime[] = [
  {
    id: "dry",
    label: "Rainfall: arid",
    // ~200 mm/yr desert — rare sharp storms (~13 mm), long dry gaps.
    annualMmApprox: 200,
    intensity: 200 / 365 / 1000 / (0.00125 * 96),
    cycleDays: 24,
    wetDays: 1,
    stormFraction: 0.16,
  },
  {
    id: "light",
    label: "Rainfall: light",
    annualMmApprox: 550,
    intensity: 550 / 365 / 1000 / (0.00125 * 96),
    cycleDays: 8,
    wetDays: 1,
    stormFraction: 0.4,
  },
  {
    id: "moderate",
    label: "Rainfall: moderate",
    annualMmApprox: 1000,
    intensity: 1000 / 365 / 1000 / (0.00125 * 96),
    cycleDays: 6,
    wetDays: 1,
    stormFraction: 0.55,
  },
  {
    id: "heavy",
    label: "Rainfall: wet",
    // Wet-tropical / monsoon annual; delivered in a long wet block.
    annualMmApprox: 2200,
    intensity: 2200 / 365 / 1000 / (0.00125 * 96),
    cycleDays: 14,
    wetDays: 8,
    stormFraction: 0.8,
  },
] as const;

export function rainRegimeById(id: RainRegimeId): RainRegime {
  const r = RAIN_REGIMES.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown rain regime '${id}'`);
  return r;
}

function stormEventsPerWetDay(
  regime: RainRegime,
  dailyEventSteps: number,
): number {
  return Math.max(
    1,
    Math.round(dailyEventSteps * Math.min(1, regime.stormFraction)),
  );
}

/** Day-in-cycle is wet (monsoon block / storm day). */
export function regimeIsWetDay(regime: RainRegime, dayIndex: number): boolean {
  if (regime.intensity <= 0 || regime.wetDays <= 0 || regime.cycleDays <= 0) {
    return false;
  }
  const d =
    ((dayIndex % regime.cycleDays) + regime.cycleDays) % regime.cycleDays;
  return d < regime.wetDays;
}

/**
 * Depth (m) per cell on a raining event.
 * Sized so the mean over a full cycle matches intensity · base · N_events/day.
 */
export function rainDepthForRegime(
  regime: RainRegime,
  baseDepthPerEvent: number,
  dailyEventSteps: number = 96,
): number {
  if (regime.intensity <= 0 || regime.wetDays <= 0) return 0;
  const stormEvents = stormEventsPerWetDay(regime, dailyEventSteps);
  const wetEventsPerCycle = regime.wetDays * stormEvents;
  if (wetEventsPerCycle <= 0) return 0;
  const cycleEventBudget =
    regime.intensity * baseDepthPerEvent * dailyEventSteps * regime.cycleDays;
  return cycleEventBudget / wetEventsPerCycle;
}

/**
 * Whether this event is inside an active storm spell.
 * Contiguous prefix of each wet day — one extended chunk, not a flash.
 */
export function regimeRainsThisEvent(
  regime: RainRegime,
  eventIndexInDay: number,
  dailyEventSteps: number,
  dayIndex: number = 0,
): boolean {
  if (!regimeIsWetDay(regime, dayIndex)) return false;
  const stormEvents = stormEventsPerWetDay(regime, dailyEventSteps);
  return eventIndexInDay >= 0 && eventIndexInDay < stormEvents;
}

/** Mean depth per cell per day, averaged over a full climate cycle. */
export function rainDailyMeanDepth(
  regime: RainRegime,
  baseDepthPerEvent: number,
  dailyEventSteps: number,
): number {
  if (regime.intensity <= 0) return 0;
  let sum = 0;
  const depth = rainDepthForRegime(
    regime,
    baseDepthPerEvent,
    dailyEventSteps,
  );
  for (let day = 0; day < regime.cycleDays; day++) {
    for (let i = 0; i < dailyEventSteps; i++) {
      if (regimeRainsThisEvent(regime, i, dailyEventSteps, day)) sum += depth;
    }
  }
  return sum / regime.cycleDays;
}

/** Storm events in one wet day (exported for atmosphere dawn charge). */
export function regimeStormEventsPerWetDay(
  regime: RainRegime,
  dailyEventSteps: number,
): number {
  return stormEventsPerWetDay(regime, dailyEventSteps);
}
