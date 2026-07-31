/**
 * Season force dial (C-021) — phenology-pressure multiplier on the seasonal
 * establishment tick. Distinct axis from Heat (C-020/C-004): Heat gates
 * whether growth can happen (temperature-limited HSI); season scales how
 * strongly the seasonal tick pushes growth once it can (day-length /
 * growing-season referent, N-004). No cell or place arguments (C-004).
 * `typical` = 1 is the neutral default — every seasonal establishment call
 * that predates this dial must reproduce identical output.
 */

export type SeasonId = "short" | "typical" | "long";

export type SeasonRegime = {
  id: SeasonId;
  /** Control label (exact name used in playtests). */
  label: string;
  /** Multiplier on seasonal establishment dt. 1 = today's unscaled behavior. */
  pressure: number;
};

export const SEASON_REGIMES: readonly SeasonRegime[] = [
  { id: "short", label: "Season: short", pressure: 0.6 },
  { id: "typical", label: "Season: typical", pressure: 1 },
  { id: "long", label: "Season: long", pressure: 1.4 },
] as const;

export function seasonById(id: SeasonId): SeasonRegime {
  const found = SEASON_REGIMES.find((r) => r.id === id);
  if (!found) throw new Error(`Unknown season id: ${id}`);
  return found;
}
