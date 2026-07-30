/**
 * Authored rainfall regimes (Slice 8c / C-004 force dial; C-003 direction).
 * Intensity is a global multiplier — never a cell or place (THESIS §9).
 */
export type RainRegimeId = "dry" | "light" | "moderate" | "heavy";

export type RainRegime = {
  id: RainRegimeId;
  /** Control label (exact name used in playtests). */
  label: string;
  /** Multiplier on base rain depth per event when the regime is active. */
  intensity: number;
};

export const RAIN_REGIMES: readonly RainRegime[] = [
  { id: "dry", label: "Rain: dry", intensity: 0 },
  { id: "light", label: "Rain: light", intensity: 0.5 },
  { id: "moderate", label: "Rain: moderate", intensity: 1 },
  { id: "heavy", label: "Rain: heavy", intensity: 2.5 },
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
