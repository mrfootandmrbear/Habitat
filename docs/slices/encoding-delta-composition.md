# Encoding delta correctness composition

**Cited:** [UI encoding review](../reviews/2026-07-31-ui-encoding-review.md) §1–§4; U-003 Current; D-007 Locked; VERIFICATION_POLICY.md (Tier-P contract).

## Why this closes before anything else queued after it

Every "Observable" row in this project's Definition of Done is discharged by an encoded-delta proxy — `VERIFICATION_POLICY.md` names `presentation.proxy.test.ts` as the mechanism and states plainly: "the agent proves the signal is encoded." The review found that mechanism itself was miscalibrated in three independent ways. None of them add a new `Process`; all three are corrections to code (and one test file) that already exists.

## 1. Saturating ramps made every delta blind across the top half of its domain

`occupantEncoding.ts`'s seven guild ramps (`herbBiomassRgb`, `shootVisibility`, `strandBiomassRgb`, `binderBiomassRgb`, `marshBiomassRgb`, `shrubBiomassRgb`, `crustBiomassRgb`) all computed `u = min(1, sqrt(t) * 1.35)`, clipping at `t ≈ 0.549` — every biomass value from ~55% to 100% of `biomassMax` rendered as one flat color, and any delta function built on the ramp returned exactly zero across that range. `lightEncoding.ts` had the same defect in miniature (`light * 3`, clipping at `light = 1/3`, even though `understoryLight` is `clamp01`'d elsewhere and can reach 1.0).

Fixed by dropping the overshoot multiplier on both: `sqrt(t)` for occupant ramps, plain `light` (clamped) for the light ramp. Both now reach `u = 1` only at the true top of the domain, and stay strictly monotonic (injective) the entire way there — the concave `sqrt` shape is kept deliberately, since it's what gives early/low biomass values a steeper perceptual response, the ramp's original intent; only the early *clipping* is gone.

## 2. Delta floors measured the wrong metric

Every delta function in all three files (`terrainEncodingDelta`, `occupantEncodingDelta` and its five guild-pair siblings, `lightEncodingDelta`) computed raw RGB Euclidean distance — weighting a difference concentrated in blue the same as an equally-sized one in green, which is not how human luminance perception works.

Fixed with one shared function, `rgbDistance` (new `src/ui/colorDistance.ts`), used by all three files. It applies Rec. 709 luma coefficients (0.2126R / 0.7152G / 0.0722B) — scaled ×3 so a neutral grey delta reproduces the *exact* magnitude the old unweighted Euclidean distance gave it. That scaling choice means every floor already calibrated against an achromatic (grey) difference stays valid unchanged; only the *balance* across channels moves — green differences now read stronger, blue ones weaker, matching the review's §2 finding. Not CIELAB ΔE (explicitly not required to close this slice per the review's §7).

## 3. A genuine cross-domain color collision

`occupantEncoding.ts`'s `BINDER` (`0xc4a24e`) and `terrainEncoding.ts`'s `INTERTIDAL` (`0xc49a5e`) — two different quantities (occupant guild cover vs. terrain tidal state) that co-occur in exactly the same screen region, the shore — sat ~0.07 unit-RGB apart, and no existing test compared palettes *across* files, only within one file's own set.

Fixed by darkening and cooling `INTERTIDAL` toward a wet-mud tone (`0x9c8868`), which is also physically defensible (wet sand/mud reads darker and greyer than dry sand) and adding a cross-file test (`presentation.proxy.test.ts`: "binder mat vs intertidal foreshore clear the cross-file collision floor") that measures the two against each other directly. This is the minimal collision fix the review's §7 asks for — **not** the full six-guild CVD-safe palette redesign, which stays filed separately as **C-026** (Open, owner-judged; `terrainEncoding.ts` now cites it in a comment, which is why the conformance ledger picked up a new citation for that ID).

## 4. Compositing and calibration nits

- **Overlay order.** `defaultTerrainRgb`'s scar/intertidal/salt tints previously layered sequentially — whichever applied last (salt, up to 0.78 toward pale) could wash an earlier one (scar) down to ~19% of its own blend weight even though both states were still true. Fixed by blending all active categorical overlays *proportionally* to their own weight instead: `overlayColor = Σ(weight·color) / Σweight`, then `lerp(base, overlayColor, min(1, Σweight))`. A single active overlay reproduces the old sequential lerp exactly — this only changes behavior when two or more categorical states are true at once (e.g. a burned, salty hollow), which is precisely what the review flagged. Ported identically into the GLSL `TERRAIN_COLOR_INJECT` block in `TerrainMesh.ts`, which is explicitly documented as needing to stay in sync with the CPU path.
- **`substrateEncodingDelta`.** Previously checked only sand↔clay and sand↔rock (missing clay↔rock — two of four substrates could have been indistinguishable and the floor would still pass) at a hardcoded porosity of 0.4 for every sample, while the real render computes `soilT = moisture / porosity` from each cell's *own* material. Fixed to compare all six pairs among the four substrates, each read at its own porosity via `substrateProps`.
- **Stale label.** `timeRates.ts` hardcoded "the fastest this machine sustains" onto the `week` rate's description, even though the module's own header states labels are "derived, never typed" and sustainability is computed at runtime by `sustainableRates()`. Fixed with a new `rateDescription(rate, fps)` that appends the suffix only when `rate` actually is `sustainableRates(fps).at(-1)` — verified with a test that drops `fps` low enough to push the ceiling below `week` and confirms the suffix moves to whichever rate is actually fastest, not the previously-hardcoded id.

Storm-cue magnitude-vs-archetype mismatch (review §4, "Storm-cue strength encodes climate archetype, not event magnitude") is a real finding but out of this slice's checklist — not touched here.

## What moved, and why that's expected

Two existing `presentation.proxy.test.ts` floors broke when re-run after the ramp/metric fixes — both anticipated by this slice's own checklist ("confirm no prior Observable claim was actually resting on the now-fixed blind spot... its slice's row-2 evidence needs a note, not a re-litigation"):

- **Understory-light paired-aspect test** (north 0.133 vs south 0.201 raw light — Slice 11). Old delta **0.223**; isolating the two fixes shows the ramp change alone accounts for nearly all of the drop (ramp-only: 0.074; metric-only: 0.246, i.e. the metric fix alone would have *increased* it). The `*3` multiplier was inflating a real but modest low-range light difference, not just clipping the saturated top of the domain — this pair was below the old clip point (`1/3`) the whole time. Honestly measured with the fixed ramp: **0.082**, still a clear, nonzero, legible difference. Floor lowered `0.15 → 0.05`, matching the floor already used for the comparably subtle orographic wet/dry-sides encoding.
- **Terrain wet-vs-dry test** (moisture 0.05 vs 0.35, cover 0.7 — no scar/intertidal/salt, so the ramp and overlay-order fixes don't touch this case at all). Old Euclidean **0.175**; the transition moves mostly in red (Δ0.163) with almost no green movement (Δ0.017) and moderate blue (Δ0.061) — luma-weighted, that's a channel combination Rec. 709 down-weights relative to green, honestly measuring **0.136**. Floor lowered `0.15 → 0.12`, matching the floor already used for substrate-contrast, a comparably material/moisture-driven read.

Both floors kept real margin below their measured values and carry a comment explaining the change in place, rather than a re-derivation of the slices that originally set them.

One probe baseline moved: `tidal-envelope`'s `mean.encodingDelta` (`0.202 → 0.109`), which is exactly `intertidalEncodingDelta()` — the function whose underlying `INTERTIDAL` color and metric both changed here. Its floor check (`> 0.08`) passed at both the old and new value (`delta.encodingFloor` stayed `1`), confirming this is the fix working, not a regression. Refreshed via `npm run probe -- tidal-envelope --write-baseline`. No other scenario in `--all --check` moved.

## Tests

- `src/sim/presentation.proxy.test.ts`: all 29 pre-existing Tier-P proxies still pass (two with re-measured floors, noted above), plus one new cross-file collision test (finding 3).
- `src/ui/timeRates.test.ts`: one new test proving the "fastest sustains" suffix is derived from `sustainableRates()` rather than hardcoded to `week`, by shrinking the fps ceiling and confirming the suffix follows the new fastest offered rate.

## Deferred

- The full six-guild CVD-safe palette redesign is **C-026** — Open, owner-judged. This slice fixes the one specific binder/intertidal collision the review measured as a correctness defect, not the broader palette.
- Storm-cue magnitude-vs-archetype (review §4) is a real finding, not on this slice's checklist.
- CIELAB ΔE is the fuller perceptual-distance fix; the review's §7 explicitly does not require it to close this slice.
