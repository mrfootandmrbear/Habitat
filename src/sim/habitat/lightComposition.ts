/**
 * Open-sky aspect light for Liebig HSI (C-007 / C-011).
 * Derived from light.insolation (terrain I₀) — not Beer–Lambert understoryLight.
 * Real-world referent: slope/aspect sets establishment light before canopy competition (N-004).
 */

import { config } from "../../config";

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/**
 * Horizontal-reference insolation for the representative sun
 * (same value flat terrain receives under config.solarAltitudeDegrees).
 */
export function horizontalInsolation(
  solarAltitudeDegrees: number = config.solarAltitudeDegrees,
): number {
  return Math.sin((solarAltitudeDegrees * Math.PI) / 180);
}

/**
 * Herb arrival light suitability: 1 on flat / south-of-flat aspects,
 * falls as open-sky I₀ drops below the horizontal reference.
 * Steep north faces can reach 0. Never uses understory attenuation.
 */
export function factorLight(
  insolation: number,
  reference: number = horizontalInsolation(),
): number {
  const ref = Math.max(reference, 1e-6);
  return clamp01(insolation / ref);
}
