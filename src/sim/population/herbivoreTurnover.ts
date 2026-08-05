/**
 * Trait-rate derivation from stage turnover (A1 / C-027 §3.3, BUILD_GUIDE
 * §4.66). "A population's trait mean cannot move faster than its
 * individuals are replaced" — `traitRate` is the fraction of the standing
 * population freshly matured this band, read from the current stage state
 * each step, not a stored constant. The only tuned input feeding it
 * (`herbivoreJuvenileMaturationRate`) is an ordinary demographic rate, the
 * same category as the existing per-guild mortality rates in config.ts.
 */
export function turnoverFraction(maturedThisBand: number, density: number): number {
  if (density <= 1e-9) return 0;
  return Math.min(1, Math.max(0, maturedThisBand) / density);
}
