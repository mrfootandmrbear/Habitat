/**
 * Activity gate for the event band (SIMULATION_MODEL §6.2 / Slice L7).
 * Pure function of authoritative state — identical on replay (T-001).
 *
 * Surface activity follows fluxStep's `w <= 0` continue, not presentation
 * `dryEpsilon`: any positive depth still moves under flux, and skipping it
 * would diverge from an ungated run (hash-identity ship gate).
 */

export type EventBandGateInput = {
  surfaceDepth: ArrayLike<number>;
  burning: ArrayLike<number>;
  /** True when this event will discharge precip (storm window while armed). */
  willPrecipitate: boolean;
};

/**
 * Whether surface flow + fire must run this event step.
 * Atmosphere is excluded from the gate (cloud decay / dawn charge) — see L7.
 */
export function eventBandActive(input: EventBandGateInput): boolean {
  if (input.willPrecipitate) return true;
  const depths = input.surfaceDepth;
  for (let i = 0; i < depths.length; i++) {
    if (depths[i]! > 0) return true;
  }
  const burning = input.burning;
  for (let i = 0; i < burning.length; i++) {
    if (burning[i]! > 0.5) return true;
  }
  return false;
}
