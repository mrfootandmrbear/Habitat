/**
 * Herbivore trait-mean pressure targets + the shared first-order trait law
 * (A1 / C-027 §3.3-§3.4, BUILD_GUIDE §4.66).
 *
 * traitMean += traitRate · (pressureOptimum(habitatState) − traitMean) · dt
 *
 * `pressureOptimum` is a deterministic function of fields the sim already
 * computes (terrain slope, climate.airTemperature, tidal hydroperiod) — no
 * new pressure invented, reused per C-027 §3.3. `traitRate` is never passed
 * in here as a constant; callers derive it from stage turnover
 * (herbivoreTurnover.ts) before calling `nextTraitMean`.
 */

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

function clamp(x: number, lo: number, hi: number): number {
  if (Number.isNaN(x)) return lo;
  return Math.min(hi, Math.max(lo, x));
}

/**
 * limbLength pressure axis: terrain ruggedness (rise/run slope, saturating).
 * Referent (AD-001): mountain goats/chamois carry proportionally longer,
 * stockier limbs on rugged terrain than plains grazers on flat ground.
 */
export function limbLengthOptimum(
  slopeRiseRun: number,
  referenceSlope: number,
  min: number,
  max: number,
): number {
  const ruggedness = clamp01(Math.max(0, slopeRiseRun) / Math.max(1e-6, referenceSlope));
  return min + ruggedness * (max - min);
}

/**
 * insulation pressure axis: climate.airTemperature — the same driving field
 * vegetation's own kill-threshold term reads (temperatureComposition.ts).
 * Colder → higher insulation optimum; a linear coat-thickness response, not
 * vegetation's unimodal survival-gate curve (a different law for a different
 * kind of trait — plasticity, not a kill threshold).
 */
export function insulationOptimum(
  airTempC: number,
  warmRefC: number,
  coldRefC: number,
  min: number,
  max: number,
): number {
  if (!(warmRefC > coldRefC)) return min;
  const cold = clamp01((warmRefC - airTempC) / (warmRefC - coldRefC));
  return min + cold * (max - min);
}

/**
 * webbing pressure axis: fraction of time inundated (tidal hydroperiod,
 * NS-008) — the pressure axis IS the fraction itself, already normalized
 * [0,1] by `tidalHydroperiod`, no further shaping law needed.
 */
export function webbingOptimum(
  hydroperiodFraction: number,
  min: number,
  max: number,
): number {
  return min + clamp01(hydroperiodFraction) * (max - min);
}

export type NextTraitMeanInput = {
  traitMean: number;
  pressureOptimum: number;
  /** Derived from stage turnover (herbivoreTurnover.ts) — never hand-tuned. */
  traitRate: number;
  envelopeMin: number;
  envelopeMax: number;
  dt: number;
};

/**
 * The one first-order trait law (§3.3), envelope-clamped (§3.3 "adaptive
 * room is finite") — a population that would need to sit outside its
 * species envelope stays at the envelope edge instead of exceeding it; the
 * resulting standing mismatch is what `mismatchMortalityRate` (below) prices.
 */
export function nextTraitMean(input: NextTraitMeanInput): number {
  const dt = Math.max(0, input.dt);
  const rate = Math.max(0, input.traitRate);
  const next =
    input.traitMean + rate * (input.pressureOptimum - input.traitMean) * dt;
  return clamp(next, input.envelopeMin, input.envelopeMax);
}

/**
 * Mismatch mortality/capacity cost (E-006/E-009): normalized as a fraction
 * of the trait's own envelope span so traits with different natural ranges
 * (limbLength ~0.4 span, insulation/webbing 1.0 span) contribute comparably.
 */
export function traitMismatchMortalityRate(
  pressureOptimum: number,
  traitMean: number,
  envelopeMin: number,
  envelopeMax: number,
  mismatchScale: number,
): number {
  const span = Math.max(1e-6, envelopeMax - envelopeMin);
  const clampedOptimum = clamp(pressureOptimum, envelopeMin, envelopeMax);
  const normalizedMismatch = Math.abs(clampedOptimum - traitMean) / span;
  return Math.max(0, mismatchScale) * normalizedMismatch;
}

export type WebbingLatchInput = {
  current: 0 | 1;
  traitMean: number;
  attachThreshold: number;
  detachThreshold: number;
};

/**
 * Two-value hysteresis latch (§3.4) — a bare single threshold flickers as
 * the trait mean wobbles across it; the detach threshold sits well below
 * attach, matching the honest ecology (a morphological change acquired over
 * generations does not come off the moment one wet decade ends).
 */
export function webbingLatch(input: WebbingLatchInput): 0 | 1 {
  if (input.current === 0) {
    return input.traitMean >= input.attachThreshold ? 1 : 0;
  }
  return input.traitMean <= input.detachThreshold ? 0 : 1;
}
