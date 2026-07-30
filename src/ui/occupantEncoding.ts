/**
 * Tier-P encoding for Slice 12 first-occupant herb biomass.
 * Shoots read as bright green against bare / pre-arrival terrain.
 */

export type OccupantRgb = readonly [number, number, number];

const BARE: OccupantRgb = [0x8b / 255, 0x73 / 255, 0x55 / 255];
const SHOOT: OccupantRgb = [0x2e / 255, 0xc4 / 255, 0x4e / 255];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Inspector / proxy color from herb biomass (kg DM·m⁻²). */
export function herbBiomassRgb(
  biomass: number,
  biomassMax: number,
): OccupantRgb {
  const t = Math.min(1, Math.max(0, biomass / Math.max(biomassMax, 1e-6)));
  // Emphasize early shoots so first arrival clears the perceptual floor.
  const u = Math.min(1, Math.sqrt(t) * 1.35);
  return [lerp(BARE[0], SHOOT[0], u), lerp(BARE[1], SHOOT[1], u), lerp(BARE[2], SHOOT[2], u)];
}

export function occupantEncodingDelta(
  beforeBiomass: number,
  afterBiomass: number,
  biomassMax: number,
): number {
  const a = herbBiomassRgb(beforeBiomass, biomassMax);
  const b = herbBiomassRgb(afterBiomass, biomassMax);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * Presentation strength for instanced shoots [0,1].
 * Zero below a visible threshold so empty cells stay empty.
 */
export function shootVisibility(biomass: number, biomassMax: number): number {
  const t = Math.min(1, Math.max(0, biomass / Math.max(biomassMax, 1e-6)));
  if (t < 0.02) return 0;
  return Math.min(1, Math.sqrt(t) * 1.2);
}
