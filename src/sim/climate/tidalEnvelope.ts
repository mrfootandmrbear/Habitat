/**
 * Tidal envelope force dial — MHW / MLW globals only (C-016 / C-004).
 * No per-event tidal phase (S-009). No cell or place arguments.
 */

export type TideId = "off" | "neap" | "mean" | "spring";

export type TideRegime = {
  id: TideId;
  /** Control label (exact name used in playtests). */
  label: string;
  /** Half-range amplitude (m) around sea level. 0 = empty envelope. */
  amplitudeMeters: number;
};

export const TIDE_REGIMES: readonly TideRegime[] = [
  { id: "off", label: "Tide: off", amplitudeMeters: 0 },
  { id: "neap", label: "Tide: neap", amplitudeMeters: 0.35 },
  { id: "mean", label: "Tide: mean", amplitudeMeters: 0.75 },
  { id: "spring", label: "Tide: spring", amplitudeMeters: 1.4 },
] as const;

export function tideById(id: TideId): TideRegime {
  const found = TIDE_REGIMES.find((r) => r.id === id);
  if (!found) throw new Error(`Unknown tide id: ${id}`);
  return found;
}

/** Mean high water (m) for a sea datum and half-range amplitude. */
export function meanHighWater(seaLevel: number, amplitudeMeters: number): number {
  return seaLevel + Math.max(0, amplitudeMeters);
}

/** Mean low water (m) for a sea datum and half-range amplitude. */
export function meanLowWater(seaLevel: number, amplitudeMeters: number): number {
  return seaLevel - Math.max(0, amplitudeMeters);
}

/**
 * Fill `out` with 1 where MLW ≤ elev < MHW, else 0.
 * Amplitude ≤ 0 → all zeros (empty envelope).
 */
export function fillIntertidalMask(
  out: Float32Array,
  elevation: Float32Array,
  mlw: number,
  mhw: number,
): void {
  const n = elevation.length;
  if (!(mhw > mlw)) {
    out.fill(0);
    return;
  }
  for (let i = 0; i < n; i++) {
    const z = elevation[i]!;
    out[i] = z >= mlw && z < mhw ? 1 : 0;
  }
}

/** Count of cells marked intertidal in a 0/1 mask. */
export function countIntertidal(mask: Float32Array): number {
  let n = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]! > 0) n++;
  }
  return n;
}

/**
 * Land foreshore fraction under an envelope: seaLevel ≤ elev < MHW, not ocean.
 * Used for Tier-P "shore zone grows" without inspector.
 */
export function foreshoreEncodingFrac(
  elevation: Float32Array,
  seaLevel: number,
  mhw: number,
): number {
  let land = 0;
  let foreshore = 0;
  for (let i = 0; i < elevation.length; i++) {
    const z = elevation[i]!;
    if (z < seaLevel) continue;
    land++;
    if (z < mhw) foreshore++;
  }
  if (land === 0) return 0;
  return foreshore / land;
}
