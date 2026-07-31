/**
 * Erosion intensity force dial (C-022) — storminess / disturbance-regime
 * multiplier on the existing hillslope + coastal erosion terms in
 * geomorphology (GEO-002 / T-004: one law, dialled intensity — never a
 * second erosion Process). Soil production is weathering, not disturbance,
 * and is never scaled by this dial. No cell or place arguments (C-004).
 * `moderate` = 1 is the neutral default — every geomorphology call that
 * predates this dial must reproduce identical output.
 */

export type ErosionId = "calm" | "moderate" | "stormy";

export type ErosionRegime = {
  id: ErosionId;
  /** Control label (exact name used in playtests). */
  label: string;
  /** Multiplier on hillslope + coastal erosion terms. 1 = today's unscaled behavior. */
  intensity: number;
};

export const EROSION_REGIMES: readonly ErosionRegime[] = [
  { id: "calm", label: "Erosion: calm", intensity: 0.4 },
  { id: "moderate", label: "Erosion: moderate", intensity: 1 },
  { id: "stormy", label: "Erosion: stormy", intensity: 2.2 },
] as const;

export function erosionById(id: ErosionId): ErosionRegime {
  const found = EROSION_REGIMES.find((r) => r.id === id);
  if (!found) throw new Error(`Unknown erosion id: ${id}`);
  return found;
}
