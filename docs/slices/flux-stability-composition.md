# Surface-flux stability guard composition

**Cited:** [hydrology/geomorphology review](../reviews/2026-07-31-hydrology-geomorphology-review.md) §2; T-001 Locked; H-004 Locked; §2.1 Equilibrium / Bounds invariant classes.

## Two independent defects, one function

`fluxStep`'s per-face flux (`diff * localFlow * dt`) had no relationship to how much water the pair of columns actually needed to exchange to equalize — nothing stopped it from moving more than half the head difference in a single step, which overshoots level and reverses sign next step (checkerboard sloshing, the standard failure mode of an explicit virtual-pipe scheme with no CFL-style bound). Separately, `localFlow = flowRate·(baseRoughness/max(n, 1e-4))` had no floor on `n`, so a zero or uninitialized roughness cell could run at up to 300× base flow. Both are fixed inside `fluxStep` itself, at the two lines the review named.

## The per-face cap is `diff * 0.5`, not a tuning constant

Transferring exactly half the head difference between two same-footprint cells brings both to the same surface level in one step; transferring any more overshoots. So `diff * 0.5` isn't a chosen safety margin — it's the exact equalization bound for a single face, independent of `flowRate`, `dt`, or roughness. `fluxStep` now takes `Math.min(diff * localFlow * dt, diff * 0.5)` per face, before the existing total-outflow cap (`available = w · maxOutflowFraction`) is applied. The two caps compose without conflict: the per-face cap bounds what one pair of cells can exchange; the total-outflow cap (unchanged) bounds how much of a cell's own water can leave across all its faces combined in one step.

## The roughness floor matches an invariant the write path already keeps in real arithmetic — but "real arithmetic" isn't what's stored

The review's suggested fix, `n ≥ baseRoughness`, was checked against the only production writer of `surface.roughness` before landing it: `WorldState.runVegetationStep` writes `rough[i] = baseRoughness + physical · vegRoughnessBonus`, where `physical ≥ 0` — every value this codebase actually produces is `≥ baseRoughness` in exact arithmetic. The field's declared inspector range (`[0.01, 0.3]`, `WorldState.ts:2473`) is a generic Manning's-n reference range, not a claim about this field's achievable runtime minimum.

First landed as `nCell = Math.max(roughness?.[i] ?? baseRoughness, baseRoughness)`, expecting it to be a no-op against real writes and a hard stop against a degenerate one — the same shape as the flat-routing fix in §4.49. It moved the T-001 golden hash instead. Cause: `surface.roughness` is `Float32Array`-backed, and storing an f64 value that is exactly `baseRoughness` (`0.03`) rounds to the nearest float32 on write — `0.029999999329447746`, a hair *below* the f64 literal `0.03` used as the floor. Flooring against the raw constant therefore bumped **every ordinary bare-ground cell** up by ~6.7e-10, not just a genuinely degenerate input; with ~933k affected cell-evaluations across a 100-year deep-time run, that is not noise the hash tolerates. Fixed by flooring against `Math.fround(baseRoughness)` instead — the float32 representation of the constant, matching what the storage round-trip actually produces — which leaves every real bare-ground write untouched and still catches a genuinely-below input (zero, uninitialized). Regression test: `src/sim/fluxStability.test.ts`'s last case asserts `Math.max(stored, Math.fround(baseRoughness)) === stored` while `Math.max(stored, baseRoughness) !== stored`, pinning the exact failure mode.

## Why the shipped fix doesn't move a baseline

Traced both bounds against the values `fluxStep` is actually called with (`WorldState.ts:920`: `flowRate = 0.156`, `dt = config.eventFluxDt = 1`, bare-ground roughness `= baseRoughness`): `localFlow · dt = 0.156`, well under the `0.5` cap, so the per-face bound never engages at any parameter combination the game exercises today — this one was inert as predicted. The roughness floor, once corrected to compare against `Math.fround(baseRoughness)`, is inert too: confirmed by the T-001 golden hash and the full probe suite passing unchanged (`docs/evidence/*.baseline.json` untouched) after the fix, where they did not before it.

## Tests

`src/sim/fluxStability.test.ts`, direct unit tests against `fluxStep` (no `WorldState` needed, matching `hydrology.determinism.test.ts`'s existing style for this function):

- A synthetic two-column head-difference case (`2.0` / `0.6`) at `flowRate 10, dt 1` — roughly 64× the production `flowRate · dt` product — equalizes to exactly `1.3` / `1.3` in one step, not past it.
- The same case run for 5 repeated steps stays at `1.3` / `1.3` — no drift, no re-opening.
- A local reproduction of the pre-fix formula (no cap) on the same starting values, run for 3 steps, alternates sign every step — the regression this closes, demonstrated rather than asserted.
- A degenerate all-zero roughness array produces output close to no roughness array at all (both floor to ~`baseRoughness`), proving the floor engages rather than merely existing in source.
- `Math.max(storedBareGroundRoughness, Math.fround(baseRoughness))` leaves a real float32-stored bare-ground value untouched, while `Math.max(storedBareGroundRoughness, baseRoughness)` (the raw constant) would not — pins the float32-rounding failure mode above.

## Deferred

- The ocean-neighbor stage still reads bed elevation rather than `seaLevel` (`fluxStep.ts` ocean branch) — that's §4.51's, not this slice's; the per-face cap applies there too but does not touch what stage value is being equalized toward.
- No new probe scenario was added — the fix is covered by the unit tests above and provably does not move any existing probe baseline.
