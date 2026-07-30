/**
 * Global wind force dial (Slice F / C-004 / C-020 lite).
 * Direction only — no cell or place arguments (THESIS §9).
 */
export type WindId = "calm" | "west" | "east" | "south" | "north";

export type WindRegime = {
  id: WindId;
  /** Control label (exact name used in playtests). */
  label: string;
  /** Unit wind components (ux eastward, uz southward on the grid). */
  ux: number;
  uz: number;
};

export const WIND_REGIMES: readonly WindRegime[] = [
  { id: "calm", label: "Wind: calm", ux: 0, uz: 0 },
  { id: "west", label: "Wind: from west", ux: 1, uz: 0 },
  { id: "east", label: "Wind: from east", ux: -1, uz: 0 },
  { id: "south", label: "Wind: from south", ux: 0, uz: -1 },
  { id: "north", label: "Wind: from north", ux: 0, uz: 1 },
] as const;

export function windById(id: WindId): WindRegime {
  const found = WIND_REGIMES.find((r) => r.id === id);
  if (!found) throw new Error(`Unknown wind id: ${id}`);
  return found;
}
