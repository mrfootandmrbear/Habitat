/**
 * Occupant shoot sway — presentation only (T-006 / L4).
 * Pure functions so Tier-P can assert wind→amplitude without WebGL.
 */

export type SwayGuild = "herb" | "strand" | "binder" | "marsh" | "shrub" | "crust";

/** How much the guild bends under wind (woody stiff, crust almost still). */
export function guildFlex(guild: SwayGuild): number {
  switch (guild) {
    case "shrub":
      return 0.35;
    case "crust":
      return 0.12;
    case "marsh":
      return 0.85;
    case "strand":
    case "binder":
      return 0.9;
    default:
      return 1;
  }
}

/**
 * Living fraction for sway. Standing dead (biomass above capacity = max·HSI)
 * still draws a shoot but does not bend like green tissue.
 */
export function livingVitality(
  biomass: number,
  biomassMax: number,
  hsi: number,
): number {
  if (!(biomass > 0) || !(biomassMax > 0)) return 0;
  const capacity = biomassMax * Math.max(0, Math.min(1, hsi));
  if (capacity >= biomass) return 1;
  return Math.max(0, Math.min(1, capacity / biomass));
}

/**
 * Peak lean (radians) before the sine. Zero at calm wind — motion is a
 * readout of forcing, not ambient decoration (C-011).
 */
export function swayAmplitude(
  windMagnitude: number,
  flex: number,
  vitality: number,
): number {
  const w = Math.max(0, windMagnitude);
  if (w <= 0 || flex <= 0 || vitality <= 0) return 0;
  // Cap so a storm lays the sward over without flipping cones underground.
  const lean = Math.min(0.85, w * 0.55) * flex * vitality;
  return lean;
}

/**
 * Share of peak amplitude that flutters; the rest is a held lean. A
 * windswept plant leans steady into the prevailing wind and flutters a
 * little on top — it does not swing symmetrically through vertical like a
 * pendulum, which reads as an animated character rather than a forced plant.
 */
const FLUTTER_FRACTION = 0.3;

/**
 * Instantaneous tilt from one sine, biased toward a held downwind lean with
 * a small flutter riding on top (never crosses back past the lean's own
 * midpoint, let alone vertical). Phase is stable per cell index.
 */
export function swayTilt(
  amplitude: number,
  phase: number,
  timeSec: number,
  angularFreq = 2.4,
): number {
  if (!(amplitude > 0)) return 0;
  const flutter = amplitude * FLUTTER_FRACTION;
  const lean = amplitude - flutter;
  return lean + flutter * Math.sin(timeSec * angularFreq + phase);
}

/** Cell-stable phase from grid index (matches OccupantMesh yaw salt). */
export function swayPhase(x: number, z: number): number {
  return (x * 17 + z * 31) * 0.07;
}
