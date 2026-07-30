/** Sea level force dial — global only, no cell targeting (C-015 / C-004). */
export type SeaLevelId = "none" | "low" | "mid" | "high";

export type SeaLevelRegime = {
  id: SeaLevelId;
  label: string;
  /** Metres on elevation datum; undefined = legacy closed/perimeter mode. */
  meters: number | undefined;
};

export const SEA_LEVEL_REGIMES: readonly SeaLevelRegime[] = [
  { id: "none", label: "Sea: off (legacy)", meters: undefined },
  { id: "low", label: "Sea: low", meters: 1.2 },
  { id: "mid", label: "Sea: mid", meters: 2 },
  { id: "high", label: "Sea: high", meters: 3.5 },
] as const;

export function seaLevelById(id: SeaLevelId): SeaLevelRegime {
  const found = SEA_LEVEL_REGIMES.find((r) => r.id === id);
  if (!found) throw new Error(`Unknown sea level id: ${id}`);
  return found;
}

/** Encode shoreline presence for Tier-P proxy (land adjacent to ocean). */
export function shorelineEncodingDelta(
  width: number,
  height: number,
  elev: Float32Array,
  seaLevel: number,
): number {
  let shore = 0;
  let land = 0;
  const isOcean = (i: number) => elev[i]! < seaLevel;
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const i = z * width + x;
      if (isOcean(i)) continue;
      land++;
      const neighbors = [
        z > 0 ? i - width : -1,
        z < height - 1 ? i + width : -1,
        x > 0 ? i - 1 : -1,
        x < width - 1 ? i + 1 : -1,
      ];
      for (const ni of neighbors) {
        if (ni >= 0 && isOcean(ni)) {
          shore++;
          break;
        }
      }
    }
  }
  if (land === 0) return 0;
  // Fraction of land that is shoreline — readable when > ~0.05 on an island.
  return shore / land;
}
