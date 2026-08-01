# Coastal base-level & substrate coupling composition

**Cited:** [hydrology/geomorphology review](../reviews/2026-07-31-hydrology-geomorphology-review.md) §3–§4; C-015 Locked; C-009 Locked; T-001 Locked; SIMULATION_MODEL §10.1/§10.2.

## Three findings, three independent fixes

The review's §3 was actually two separate mismatches sharing one section number, plus §4 was a third, unrelated gap. All three are corrected here, none by adding a new mechanic — all three are boundary-condition and rate-lookup corrections inside code that already exists.

## 1. Ocean stage is `seaLevel`, not bed elevation

`fluxStep`'s ocean-neighbor branch held the neighbor surface at `terrain[ni]` — the seabed — so a land cell's head difference against the ocean was overstated by the ocean's entire water column. `seaLevel` never appeared in `fluxStep` at all, despite being the actual physical base level under C-015. Fixed by holding the ocean-neighbor stage at `seaLevel` instead, threaded through as a new trailing optional parameter (`seaLevel?: number`, defaulting to the old bed-elevation behavior when omitted, so callers that never pass `oceanCells` — the existing stability unit tests — are unaffected). `WorldState.runSurfaceWaterStep` now passes `this.seaLevelMeters` alongside `this.oceanCells`.

A land cell can never itself be an ocean cell (`oceanCells` is exactly `elevation < seaLevel`), so its bed is always `>= seaLevel` and the diff this produces is always the cell's actual freeboard above sea stage — never negative, i.e. this fix does not introduce marine ingress/backwater on its own (the review notes that gap separately; it is not queued here).

## 2. The structural (Priority-Flood) and dynamic (fluxStep) boundary models disagreed about non-outlet rim cells

`priorityFloodFill` seeds the *entire* perimeter as open by default — every rim cell gets `depressionDepth == 0` by construction, since it's a fill seed, not something the flood filled. That seeding cannot change: it's what lets nested interior depressions resolve to two different spill levels at all (`depression.test.ts`'s "nested basin" fixture would break with zero or partial seeds — verified by hand before ruling this approach out). `fluxStep`, meanwhile, only actually drains named outlets on that same rim (`outletCells`, from `computePerimeterOutlets` — edge-minima local minima only, empty when the rim has no relief at all, e.g. `generateMountain`'s exactly-flat, `elevationFloor`-clamped shelf). The two models therefore disagree at every rim cell that is not a genuine outlet: the structural signal says "free-draining" (`depression == 0`), the dynamics say "sealed" (no-flow mirror, `outletCells` doesn't contain it) — and `runGeomorphologyStep`'s ponded-cell gate (`a >= aMin && depression <= 1e-6`) trusted the structural signal alone, applying dry-land hillslope incision to cells that can actually pond.

Fixed at the consumer, not the fill: `runGeomorphologyStep` now additionally excludes a cell from hillslope erosion when it sits on the grid perimeter, has no sea level, and is not in `outletCells` (`sealedRim`). This is a narrow, three-line addition — no change to `priorityFloodFill`, `computeD8FlowDirection`, or any of their existing exact-value fixture tests, all of which still pass unmodified. It does not touch `depressionDepth`, `flowAccumulation`, or `filledElevation`, and does not change anything for a cell that is a genuine outlet, or for any seaLevel-set (island/ocean) world, where `fluxStep`'s absorbing behavior is already driven by the same `oceanCells` set Priority-Flood was seeded with — those two were never in disagreement.

Confirmed with a hand-built, guaranteed-flat-rim pyramid terrain (Chebyshev distance to border, `src/sim/coastalBaseLevel.test.ts`) that `computePerimeterOutlets` returns empty and that a rim cell with real accumulated flow gets no soil-depth loss from a `runGeomorphologyStep` call, where the pre-fix gate (`a >= aMin && depression <= 1e-6` alone) would have judged it eligible.

## 3. Coastal erosion is now substrate-aware — without silently recalibrating shore-retreat magnitude

Hillslope erosion already reads `substrateProps(mat).erosionK` per cell; coastal erosion used one global `config.shoreErosionK` instead, so sand and rock shores retreated identically. The literal fix — substituting `substrateProps(mat).erosionK` directly in place of `shoreErosionK` — was rejected after checking the numbers: `substrates.ts`'s `erosionK` values (loam `0.003`, sand `0.007`, rock `0.00015`) were calibrated for the *hillslope* formula's units, and `loam`'s value was deliberately set equal to the pre-Slice-S global hillslope rate for exactly this reason (`substrates.ts`'s own header comment). `shoreErosionK` (`0.08`) was never unified with that table — a literal substitution would have collapsed coastal erosion to roughly 1/27th its calibrated magnitude on the default (loam) substrate, an order-of-magnitude, undocumented gameplay change the review never asked for.

Fixed by applying the substrate table as a **ratio against loam** rather than a direct substitution: `kCoast = shoreErosionK · (substrateProps(mat).erosionK / loamErosionK) · erosionScale`. On loam — the default substrate everywhere a world hasn't been explicitly painted — the ratio is exactly `1`, so `kCoast` is numerically identical to the pre-fix formula; sand and rock diverge proportionally to the same table hillslope erosion already trusts. This is the same "loam matches the pre-S global knobs" convention `substrates.ts` documents for itself, applied to a second process instead of invented fresh.

## What moved, and why that's expected

`aNorm`-downstream probes moved again, for the same structural reason §4.49 named: `deep-time`, `baseflow-persist`, `disturbance-recovery`, `hillslope-deposit`, `erosion-intensity`, `substrate-contrast`, `substrate-deposit` — every one of these is a `generateMountain`-based, no-sea-level scenario whose rim is exactly flat (no relief), so finding 2's `sealedRim` exclusion is live on every one of them; soil depth left un-eroded at the rim compounds over repeated decadal steps into a different flow network on later steps (elevation changes mark structure dirty), which is why even interior, non-rim metrics moved. `island-drainage` and `orographic-wind` moved from finding 1 (ocean stage) changing how much water actually crosses the shoreline. All nine baselines were refreshed (`npm run probe -- <scenario> --write-baseline`) after confirming every correctness test — conservation, determinism, bounds — still passes; only committed baseline *numbers* were stale, not behavior.

`paired-storm`, `berm-reroute`, `basin-fill`, `tidal-envelope`, `shore-exposure`, `longshore-drift`, and every island/seaLevel-set biology probe (arrival, HSI, guild) stayed within tolerance unchanged.

## Tests

`src/sim/coastalBaseLevel.test.ts`:

- A single-step coastal outflow matches the `seaLevel`-relative head difference exactly, contrasted against a local reproduction of the pre-fix bed-elevation formula on the same inputs (finding 1).
- Land-side drainage toward the ocean is identical regardless of the ocean cell's own bed depth (shallow vs. a much deeper bed, same `seaLevel`) — the pre-fix formula, reproduced locally, diverges between the two within a few steps (finding 1).
- A hand-built, guaranteed-flat-rim pyramid terrain: `computePerimeterOutlets` returns empty, a rim cell has real accumulated flow, and `runGeomorphologyStep` does not reduce its soil depth (finding 2).
- A sand shore retreats measurably faster than a rock shore under identical wind/exposure forcing, isolating the windward (exposed) shore only so lee-side deposition doesn't dilute the comparison (finding 3).
- A loam shore still erodes under the new formula, confirming the ratio-based fix is live, not a no-op (finding 3).

## Deferred

- Marine backwater/ingress (water flowing from ocean onto land when sea stage exceeds a coastal cell's surface) is not modeled — finding 1 only fixes the stage value equalized *toward*; a land cell's bed is always `>= seaLevel` by construction, so this fix cannot produce ingress on its own, and the review does not ask for it here.
- The general open-boundary/base-level *model* (what "open" means beyond ocean cells and named perimeter outlets) is unchanged for `priorityFloodFill` and `computeD8FlowDirection` themselves — only the one consumer (hillslope erosion's ponded gate) that was reading the structural signal as if it meant something the dynamics didn't agree with.
- §4.52 (encoding delta correctness) is next; nothing here touches presentation.
