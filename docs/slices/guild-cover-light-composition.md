# Slice — Guild cover & light-competition correctness (§4.47)

**Cited:** [vegetation/habitat review](../reviews/2026-07-31-vegetation-habitat-review.md) §2.2–§2.3; C-023 Open (not implemented); ES-006 Locked; C-011 Open. **New Process? no.**

## What was wrong

1. **Additive cover-stacking (§2.2).** `physicalCoverFrom` summed six guild fractions and clamped at 1, and `canopyCoverFraction` did the same over five. Overlapping canopies occlude the ground multiplicatively — three guilds at 40% independent cover give `1 − 0.6³ = 0.784`, but the additive sum clamped to 1.0. Past saturation extra biomass had zero physical effect, so roughness/infiltration went uniform across every well-vegetated cell, and crust was scored shaded out the moment two pioneers reached moderate cover.

2. **Transmitted-light growth with a double-count (§2.3).** Legacy `veg.cover` growth was scaled by the cell's own *transmitted* understory light and then again by an explicit `(1 − cover)`. Photosynthesis is driven by *absorbed* light, not transmitted — the inverse relationship — and under the corrected LAI the transmitted light is itself `I₀(1 − cover)`, so the old term applied the open-space factor twice as `I₀(1 − cover)²`, suppressing regrowth in exactly the gap regime where it should be fastest.

3. **Linear LAI with a transmission floor (§2.3).** `LAI = cover · maxLAI` is linear where Beer–Lambert implies the inverse `LAI = −ln(1 − cover)/k`. Under the linear form full cover left a nonzero `exp(−k·maxLAI)` light floor (~0.05·I₀) instead of approaching darkness.

## Fixes

- **`combineCoverFractions(fractions)`** (`arrivalComposition.ts`): `1 − Π(1 − clamp01(cᵢ))`. Bounded in [0,1] by construction, monotone in every component, empty stack = 0. `physicalCoverFrom` and `canopyCoverFraction` both route through it.
- **`evaluateLight`** (`lightCompetition.ts`): `openFraction = 1 − cover`; `understoryLight = I₀·openFraction` (the exact Beer–Lambert-consistent identity — no floor, → 0 at full cover); reported `leafAreaIndex = min(maxLAI, −ln(openFraction)/k)`, clamped only so the inspectable field stays inside its registered `[0, maxLAI]` bound. Transmitted light uses the exact identity rather than the clamped LAI, so clamping the display value reintroduces no floor.
- **`runVegetationStep`** (`WorldState.ts`): moisture-limited growth term becomes `growth · moisture · (I₀·(1 − cover))` — light absorbed by plants colonizing the open fraction, limited **once** by open space. The prior `understoryLight · (1 − cover)` double-count is removed.

`factorLight` is unchanged: it correctly reads open-sky insolation for arrival HSI (NS-007 / C-011), not understory attenuation. This slice does **not** wire guild-to-guild light competition (C-023, Open, owner-judged) — it only corrects the physics that mechanism would ride on.

## Tests

`src/sim/guildCoverLight.test.ts` — `0.4×3 → 0.784`; product-complement stays below additive clamp and stays monotone past saturation; bounds; `physicalCoverFrom`/`canopyCoverFraction` stack to 0.784; full cover → transmitted light exactly 0 (below the old `exp(−k·maxLAI)` floor); transmitted follows `I₀(1 − cover)`; reported LAI is the clamped inverse form and stays within `[0, maxLAI]`.

`living-hollow.test.ts` updated to the product-complement expectation (0.2 with a 0.5 fraction → 0.6, not 0.7; two 0.5 fractions → 0.75, not a clamped 1.0). Pinned `vegetation.test.ts` / `light-succession.test.ts` (bootstrap from zero, gap-regrows-faster, aspect divergence, finite bounds) all still pass — the corrected growth term keeps a single `(1 − cover)` open-space factor.

## Baselines moved (stated)

The veg-cover growth law and cover-combination change ripple into every full-state probe hash. Twenty-two baselines refreshed with `--write-baseline`; the movement is the §4.47 fix, not unexplained drift:

- **deep-time** — `meanCover` roughly doubles by y100 (0.246 → 0.383): the corrected growth is no longer doubly suppressed. `meanElev`/`meanSoilDepth` move only at the 1e-8 level and `massResidual` stays within its 1e-3 tolerance (conservation intact); `p005` hashes and `lateDelta.coverDelta` move with the cover field.
- **living-hollow** — `colonized`/`bare` roughness, downslope, infiltration and hash move: product-complement changes the physical cover a colonized cell writes.
- **succession-diverge / burn-recover / regime-divergence / drydown-feedback / disturbance-recovery / baseflow-persist** — cover-, moisture- and understory-coupled fields and their replay hashes move.
- **arrival probes** (light-, salinity-, heat-, strand-, binder-, shrub-, spray-arrival) — guild HSI/biomass metrics hold at their float tolerances; only `delta.hashN` (full-state) moves, because `veg.cover`/roughness differ.
- **island-drainage / orographic-wind / cloud-delivery / substrate-contrast / substrate-deposit / event-band-gate** — invariant deltas (`delta.conserved`, `delta.hashMatch`, substrate tables) hold; only the absolute full-state hash (and, for event-band-gate, a 4e-10 `span.precip` reorder from changed surface activity feeding the gate) moves.

No golden T-001 hash moved; `time-invariance` (S-009) and `deep-time` P-005 save/replay identity both stay green.

## Next-but-one

§4.48 Habitat/dispersal determinism hygiene — declared reads on `habitatProcess`, Jacobi guild-update snapshot, and deduping the twice-computed establishment HSI math.
