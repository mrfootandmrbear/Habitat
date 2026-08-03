# Slice — L5 guild competition / successional displacement (C-023)

**Cited:** [living-world review](../reviews/2026-07-31-living-world-review.md) §4; **C-023 Locked** (owner delegated, 2026-08-03); ES-006 Locked; C-011; T-001 Locked; T-005. **New Process? no** — extends `habitatProcess` (daily band, already registered), no new `SimScheduler` entry. D-007 clip gate does not apply.

## What was wrong

Six guilds shared one seed schedule and stacked additively (now product-complement, §4.47) into `physicalCover`, but **no guild was ever displaced**: shrub reads facilitation from herb's cover, crust is shaded by all five others, yet nothing that establishes ever recedes because something else out-competed it. Every cell converges to "whatever suits it, at maximum, simultaneously" — succession as parallel accumulation, not replacement. Named as the one genuinely new policy question in the review; filed **C-023** Open, gated on **L2** (local seed rain) and **L3** (mortality as a rate) — without a mortality *rate*, a suppressed guild has no mechanism to decline, so building competition first would have measured nothing.

## The decision

Owner delegated the choice in session (2026-08-03): adopt the leading direction as written. **Shrub is the one structurally taller guild** among the six — DESIGN_WIKI §4 already calls it the woody/shrub layer, distinct from the five herbaceous/biological-crust guilds. That is a real stratification a person's own intuition already contains (a shrub casting shade over the grass under it), not an invented dominance rank (C-011 / N-004) — the failure mode the register's own constraints explicitly warn against. Scoped narrowly to **shrub → herb**: herb is the one guild whose Liebig HSI already carries an open-sky light arm (`factorLight`, N7 / C-007) for the mechanism to attenuate; strand, binder, marsh, and crust have no light arm in their HSI today (checked directly — `strandHsiComposition.ts` / `binderHsiComposition.ts` / `marshHsiComposition.ts` read shore/salinity/temperature/drainage/burial only) and are unaffected by this change. Widening competition to a second structural tier, or adding a light arm to those four, is future work under this same Locked mechanism — not a reopening of C-023.

## Mechanism

`runHabitatStep` (`WorldState.ts`) now computes `shrubCover = herbCoverFraction(shrubBiomass, shrubBiomassMax)` per cell and attenuates the cell's open-sky `terrainInsolation` through it via the existing Beer–Lambert `evaluateLight` (`vegetation/lightCompetition.ts`, unchanged) before passing the result to `evaluateHsi` as herb's `insolation` argument. This is the exact function §4.47 already made correct (`understoryLight = I₀·(1 − cover)`) — L5 is a new *call site*, not a new light law. At zero shrub cover the attenuated value is bit-identical to the raw open-sky value (`1 − 0 = 1`), so cells with no shrub see no change — the no-competition regression case.

`habitatProcess.reads` gains `veg.biomass.shrub`, declared `lagged` (daily band reading a seasonal-band field — same cross-band shape `dispersalProcess` already declares for its own `veg.biomass.*` reads).

## Why this isn't a new Process

`habitatProcess` already exists, already runs daily, already writes `habitat.suitability`. This slice adds one more read and one more term inside its existing step function — no new entry in `SimScheduler`, so D-007's clip gate (required before a slice registering a new `Process`) does not apply.

## Tests

`src/sim/successionDisplace.test.ts`: bare shrub leaves insolation exactly unchanged (`evaluateLight(I, 0).understoryLight === I`, the regression case as a pure-function identity, not just an integration-level near-match); 70%-cover shrub measurably attenuates insolation, matching the `I·(1 − cover)` identity directly; a 30-tick WorldState run shows herb rising, peaking, then declining under a live shrub canopy while a shrub-suppressed twin (identical terrain/moisture/temperature/seed) rises monotonically to the same ceiling herb has always reached and never declines; `habitatProcess` declares `veg.biomass.shrub` in both `reads` and `lagged`.

`succession-displace` probe (new — `docs/evidence/succession-displace.baseline.json`): same shape at scenario scale, CI-judged. Competing twin — herb peak ≈1.690, final ≈0.975 (decline 0.715); shrub final ≈1.524. No-competition twin — herb final ≈2.083 (above its own peak, i.e. still rising, never suppressed), shrub final exactly 0. Replay-hash identity asserted (T-001); every assertion is a thrown `Error` on the specific named invariant (declined-from-peak, shrub-non-trivial, control-shrub-exactly-zero, control-not-itself-declining), not a tolerance band.

## Baselines moved (stated)

Only **`deep-time`** — a real but small effect on its default long mountain run (shrub establishes on a minority of cells there and rarely reaches the cover fraction the succession-displace probe's warm fixture reaches by construction): `lateDelta.coverDelta` moves 0.0263 → 0.0263 (Δ ≈ 4.4e-6, at the tolerance edge) and the `p005` replay hashes move (expected — any state change moves a full-state hash). `meanElev` / `meanSoilDepth` / `massResidual` move only at the 1e-10–1e-6 level (conservation intact). Every other probe (29 scenarios refreshed under §4.48, all of them, plus every scenario not touched by that slice) stayed within tolerance unchanged — L5's footprint is narrow because shrub cover dense enough to matter is currently rare outside a fixture built to produce it.

No golden T-001 hash moved.

## Next-but-one

Track R / Living wave both close out with this slice (§4.48 + C-023 + L5 shipped together). Remaining Living-wave item **L8** (deep-time ladder) stays blocked on **C-024** + **C-025**, both owner-judged and Open. Animal work (**F-001** Deferred, **C-027** framing-only) stays off tip per AGENTS.md.
