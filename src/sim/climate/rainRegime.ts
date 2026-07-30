/**
 * Authored rainfall regimes (Slice 8c / C-004 force dial; C-003 direction).
 * Intensity is a global multiplier — never a cell or place (THESIS §9).
 * wetFraction gates how many events per day actually rain (storm duty cycle).
 */
export type RainRegimeId = "dry" | "light" | "moderate" | "heavy";

export type RainRegime = {
  id: RainRegimeId;
  /** Control label (exact name used in playtests). */
  label: string;
  /** Multiplier on base rain depth per event when the regime is raining. */
  intensity: number;
  /**
   * Fraction of event steps in each sim-day that receive rain (0–1).
   * Front-loaded in the day so storms are contiguous pulses, not random.
   */
  wetFraction: number;
};

export const RAIN_REGIMES: readonly RainRegime[] = [
  { id: "dry", label: "Rain: dry", intensity: 0, wetFraction: 0 },
  { id: "light", label: "Rain: light", intensity: 0.85, wetFraction: 0.2 },
  { id: "moderate", label: "Rain: moderate", intensity: 1, wetFraction: 0.35 },
  { id: "heavy", label: "Rain: heavy", intensity: 1.4, wetFraction: 0.45 },
] as const;

export function rainRegimeById(id: RainRegimeId): RainRegime {
  const r = RAIN_REGIMES.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown rain regime '${id}'`);
  return r;
}

/** Depth (m) to add per cell this event under the regime (C-004 — no location). */
export function rainDepthForRegime(
  regime: RainRegime,
  baseDepthPerEvent: number,
): number {
  return baseDepthPerEvent * regime.intensity;
}

/**
 * Whether this event step within the day receives rain under the regime.
 * `eventIndexInDay` is in [0, dailyEventSteps).
 */
export function regimeRainsThisEvent(
  regime: RainRegime,
  eventIndexInDay: number,
  dailyEventSteps: number,
): boolean {
  if (regime.intensity <= 0 || regime.wetFraction <= 0) return false;
  const wetEvents = Math.max(
    1,
    Math.round(dailyEventSteps * regime.wetFraction),
  );
  return eventIndexInDay < wetEvents;
}
