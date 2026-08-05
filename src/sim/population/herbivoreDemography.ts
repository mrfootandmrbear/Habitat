/**
 * Herbivore stage-structured demography (A1 / C-027 §3.2-§3.3, BUILD_GUIDE §4.66).
 * Two stages — juvenile, adult — the minimum structure that makes "turnover"
 * (§3.3) a real quantity read from state rather than a name for a constant.
 * `capacity` is always a caller-computed value, never stored (ES-006).
 */

export type HerbivoreStage = {
  juvenile: number;
  adult: number;
};

export type NextHerbivoreStageInput = {
  juvenile: number;
  adult: number;
  /** Habitat/forage-derived capacity (individuals·km⁻²) — computed each step. */
  capacity: number;
  /** Fraction of juveniles maturing to adult per unit dt. */
  maturationRate: number;
  /** Juveniles produced per adult per unit dt at full capacity headroom. */
  birthRatePerAdult: number;
  /** Baseline adult mortality per unit dt, before any trait-mismatch cost. */
  adultMortalityRate: number;
  /** Added mortality-rate term from trait/pressure mismatch (E-006/E-009). */
  mismatchMortalityRate: number;
  dt: number;
};

/**
 * Capacity-limited births + juvenile maturation + adult mortality, first
 * order in each term (same rate-not-clamp shape L3 ships for guild biomass).
 * Returns the juvenile cohort that matured this step alongside the new
 * stage state, so callers can derive turnover (herbivoreTurnover.ts) from
 * the same step rather than re-deriving it from before/after density.
 */
export function nextHerbivoreStage(
  input: NextHerbivoreStageInput,
): HerbivoreStage & { matured: number } {
  const dt = Math.max(0, input.dt);
  const density = Math.max(0, input.juvenile) + Math.max(0, input.adult);
  const headroom =
    input.capacity > 0 ? Math.max(0, 1 - density / input.capacity) : 0;
  const births =
    Math.max(0, input.birthRatePerAdult) *
    Math.max(0, input.adult) *
    headroom *
    dt;
  const matured =
    Math.max(0, input.maturationRate) * Math.max(0, input.juvenile) * dt;
  const adultMortality =
    (Math.max(0, input.adultMortalityRate) +
      Math.max(0, input.mismatchMortalityRate)) *
    Math.max(0, input.adult) *
    dt;

  const juvenile = Math.max(0, input.juvenile + births - matured);
  const adult = Math.max(0, input.adult + matured - adultMortality);

  return { juvenile, adult, matured };
}
