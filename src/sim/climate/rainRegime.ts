/**
 * Mean rainfall / climate intensity dial (Slice 8c / Slice F / C-004).
 * Intensity is a global average depth multiplier the preserve lives under —
 * not a storm on/off switch (owner 2026-07-30: climate mean for vegetation).
 * Never a cell or place argument (THESIS §9).
 *
 * wetFraction stays 1 for non-arid regimes so every event receives the mean;
 * intensity alone sets how wet the climate is (duty-cycle pulses removed).
 */
export type RainRegimeId = "dry" | "light" | "moderate" | "heavy";

export type RainRegime = {
  id: RainRegimeId;
  /** Control label (exact name used in playtests). */
  label: string;
  /**
   * Multiplier on base rain depth per event — the climate mean intensity.
   * Calibrated so daily mean ≈ prior storm-duty regimes (light≈0.17, mod≈0.35, wet≈0.63).
   */
  intensity: number;
  /**
   * Fraction of event steps that receive the mean (0 or 1 for climate dial).
   * Kept for API compatibility; arid = 0, all others = 1.
   */
  wetFraction: number;
};

export const RAIN_REGIMES: readonly RainRegime[] = [
  { id: "dry", label: "Rainfall: arid", intensity: 0, wetFraction: 0 },
  { id: "light", label: "Rainfall: light", intensity: 0.17, wetFraction: 1 },
  {
    id: "moderate",
    label: "Rainfall: moderate",
    intensity: 0.35,
    wetFraction: 1,
  },
  { id: "heavy", label: "Rainfall: wet", intensity: 0.63, wetFraction: 1 },
] as const;

export function rainRegimeById(id: RainRegimeId): RainRegime {
  const r = RAIN_REGIMES.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown rain regime '${id}'`);
  return r;
}

/** Mean depth (m) per cell this event under the climate dial (C-004 — no location). */
export function rainDepthForRegime(
  regime: RainRegime,
  baseDepthPerEvent: number,
): number {
  return baseDepthPerEvent * regime.intensity;
}

/**
 * Whether this event step receives the climate mean.
 * With Slice F climate dial, non-arid regimes rain every event.
 */
export function regimeRainsThisEvent(
  regime: RainRegime,
  eventIndexInDay: number,
  dailyEventSteps: number,
): boolean {
  if (regime.intensity <= 0 || regime.wetFraction <= 0) return false;
  if (regime.wetFraction >= 1) return true;
  const wetEvents = Math.max(
    1,
    Math.round(dailyEventSteps * regime.wetFraction),
  );
  return eventIndexInDay < wetEvents;
}
