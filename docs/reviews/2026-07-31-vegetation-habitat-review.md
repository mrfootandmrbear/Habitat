# Vegetation / habitat review — the curves that already know the right shape

> **Date:** 2026-07-31
> **Role:** Advisory measurement of the plant-ecology / habitat-suitability model, confirming and extending [living-world review](2026-07-31-living-world-review.md) against THESIS.md §2.1/§5.
> **Authority:** Does not supersede the [Decision Register](../DECISION_REGISTER.md). Plan lives in [BUILD_GUIDE.md](../BUILD_GUIDE.md) §4.46–§4.48, and amends the existing L2/L3/L5 entries (§4.37, §4.38, §4.40).
> **Trigger:** Owner asked which other subsystems would benefit from the same scoped-expert-review treatment as the renderer; the living-world review's three headline defects (seed source, mortality clamp, guild competition) were the natural next domain to go deeper on.
> **Companion:** [living-world review](2026-07-31-living-world-review.md), which this one confirms in full and extends with the composition-layer math underneath it.
> **Scope:** `src/sim/process/{vegetationProcess,vegetationSeasonalProcess,dispersalProcess,habitatProcess}.ts`, `src/sim/vegetation/lightCompetition.ts`, all twelve `src/sim/habitat/*Composition.ts` files, `WorldState.ts` lines 1083–1151 and 1388–1764.

---

## 0. Verdict

The three defects the living-world review measured all confirm at the code level, with a shared root cause: **`nextHerbBiomass`'s growth term never depends on standing biomass** (`arrivalComposition.ts:142–162` — `args.biomass` enters only via `biomass + growth` and the final clamp). Nothing establishes, grows faster for being established, or disperses from itself.

Underneath that, the twelve HSI composition files show one consistent pattern worth stating as its own finding: **the physically correct curve shape already exists in this codebase, applied to only some factors.** `factorInundationMarsh` is a proper hump; `factorInundationUpland` next to it is a hard step. `factorSalinityTolerant` is a proper threshold-slope; the plain `factorSalinity` next to it is linear from zero. Four more factors (temperature, moisture, burial, exposure) are monotone ramps where the physically real answer is unimodal. This is not four separate design problems — it's one pattern, fixable by generalizing forms already written in the file set, not inventing new ones.

---

## 1. The three flagged defects — confirmed

**(a) Propagule pressure is static geometry, not a spreading front.** `seedPressureAt` (`arrivalComposition.ts:31–42`) and `overseasSeedPressure` (`:112–120`) are both pure functions of position/shore-distance. `WorldState.ts:1497` assigns the seed bank from this field every annual tick — an overwrite, not an accumulation: no carryover, no local rain, no decay. `dispersalProcess.reads` does declare `veg.biomass.*` (`dispersalProcess.ts:19–23`), which reads as if biotic feedback exists — it doesn't; those reads feed HSI facilitation (shrub reads herb cover, crust reads shade), never the propagule side. One refinement worth carrying into the fix: `shoreDistanceField` recomputes every annual tick, so an eroding coastline *does* move the seed field — precisely, pressure responds to geomorphic change but never to biotic change. A second: all six guilds receive **identical** pressure and kernel width (`WorldState.ts:1497,1499,1510,1524,1533,1545`) — no dispersal-syndrome differentiation between a hydrochorous marsh grass and a wind-blown crust spore.

**(b) Mortality is an instantaneous clamp, not a rate.** `arrivalComposition.ts:152,160`: `capacity = biomassMax·hsi`, then `Math.min(capacity, biomass + growth)`. Growth is `O(dt)`; death is `O(∞)` — halving the timestep halves growth but leaves the downward step identical, so the model is **not timestep-convergent**, the exact failure the §2.1 Refinement invariant class exists to catch. A mature stand and a first-year seedling respond identically to the same bad year; once at capacity, biomass is `biomassMax·HSI` exactly — a memoryless render of the current environment.

**(c) No biotic motion — for the six-guild stack; partially refuted for legacy `veg.cover`.** Two parallel vegetation models coexist and neither has both halves: legacy `veg.cover` (`WorldState.ts:1414–1421`) has genuine two-sided rate dynamics but no HSI/guilds; the guild stack has the ecology but, per (a)+(b), is memoryless. They couple one-directionally at `arrivalComposition.ts:198` (legacy cover sums into physical cover) — and `canopyCoverFraction` (`crustHsiComposition.ts:43–78`) omits `vegCover` entirely, so legacy canopy never shades crust. Growth shape is also wrong even where it exists: with `p → 1` at good sites, approach to capacity is linear with a hard corner, not sigmoid — every cell fills at the same speed and stops abruptly.

---

## 2. New findings

### 2.1 One curve-shape defect, six instances (high)

The physically correct shape for each factor already exists somewhere in this file set:

| Factor | Current shape | Correct shape (already written, elsewhere) |
|---|---|---|
| Inundation, upland guilds | Hard step at MHW (`inundationComposition.ts:33–35`) | Hump, as `factorInundationMarsh` (`:42–45`) already is |
| Salinity, intolerant guilds | Linear from zero (`salinityComposition.ts:15–17`) | Threshold-slope, as `factorSalinityTolerant` (`:24–33`) already is |
| Temperature, all guilds | No upper limb — saturates at 1 above `optC` forever (`temperatureComposition.ts:16–25`) | Unimodal, right-skewed thermal performance curve |
| Moisture, herb/shrub/crust | Monotone increasing to saturation (`hsiComposition.ts:74–76`; reused by `shrubHsiComposition.ts:89`, `crustHsiComposition.ts:109`) | Hump with a wet-side penalty (crust is actively backwards — a desiccation-adapted organism scored optimal at saturation) |
| Burial, binder | Monotone *decreasing* — maximal at zero burial (`binderHsiComposition.ts:72–79`) | Hump with optimum at moderate accretion — sand binders require burial to stay vigorous |
| Exposure, strand/binder | Plain `clamp01(exposure)`, monotone (`strandHsiComposition.ts:39–41`, `binderHsiComposition.ts:52–54`) | Hump, as marsh's exposure factor already is |

The MHW step (row 1) is the most consequential in combination with defect (b): a cell that erodes across MHW by a millimetre loses its entire mature stand in one tick, with no lag, because loss has no rate. The upland arm needs the supratidal taper the marsh arm already has.

The moisture factor (row 4) inverted for crust means biological soil crusts — arid-surface organisms — are currently scored best at saturation, which is backwards for that guild specifically even though the same curve is defensible-ish for herb.

The burial factor (row 5) is inverted against the referent it's modeling (**C-011**): Ammophila-type dune binders are used *for* stabilization precisely because they respond positively to burial; the current curve rewards a binder guild for sitting still. Separately, `|longshore|` (magnitude) is the wrong physical quantity for burial forcing — burial is the *divergence* of transport (∂Q/∂x); uniform drift through a cell nets zero accretion but reads as positive burial pressure here.

### 2.2 Additive cover-stacking should be product-complement (medium-high)

`physicalCoverFrom` (`arrivalComposition.ts:196–205`) sums six guild fractions and clamps at 1. Overlapping canopies physically combine as `1 − Π(1 − cᵢ)`, not a sum — three guilds at 40% independent cover give 0.78 by the correct formula but clamp to 1.0 here. Since this drives roughness and infiltration (`WorldState.ts:1443–1444`), the bug both overstates coupling and flattens it: past saturation, additional biomass has zero physical effect, so roughness goes uniform across every well-vegetated cell. `canopyCoverFraction` (`crustHsiComposition.ts:55–77`) has the identical defect, scoring crust as shaded out too readily.

### 2.3 Light competition is inverted and decorative (medium-high)

`factorLight` uses open-sky insolation, never `light.understory` (`lightComposition.ts:28`, `hsiComposition.ts:114`) — nothing in this slice reads the understory field or `veg.leafAreaIndex` at all, so **there is no light competition between guilds.** Worse: at `WorldState.ts:1412,1416` a cell's own cover growth is scaled by its own *transmitted* light, but canopy photosynthesis is driven by *absorbed* light (`I₀(1 − exp(−k·LAI))`) — this is the inverse relationship, and it's already double-counted by the `(1 − cover)` logistic factor on the same line. Related: `LAI = cover · maxLAI` (`lightCompetition.ts:45`) is linear where the Beer–Lambert law it feeds implies the inverse relation `LAI = −ln(1−cover)/k`; full cover currently yields a nonzero light-transmission floor rather than approaching darkness. This cluster is also where **C-023** (guild competition, Open) would attach if adopted — its leading direction already names `lightCompetition.ts`'s understory term as the natural mechanism, and that mechanism is currently unused.

### 2.4 Determinism / hygiene cluster (medium)

- **Undeclared load-bearing reads in `habitatProcess`.** Its declared `reads` (`habitatProcess.ts:12–18`) omits `this.terrain.data` (feeds insolation, `WorldState.ts:1090→1111`, and inundation, `:1130`) and `this.soilMaterial.data` (feeds porosity/`fMoisture`, `:1085→1122`) — both silently consumed at `runHabitatStep`. If the scheduler ever uses `reads`/`writes` for ordering or parallelism, habitat can run without a declared dependency on its own terrain/soil-material writers.
- **Gauss-Seidel guild ordering, not Jacobi.** `runHerbEstablishmentStep` updates guilds sequentially and downstream guilds read already-updated values in the same tick (`herbBiomass[i]` written `WorldState.ts:1661`, read by shrub at `:1718`; crust reads all five updated values at `:1738–1742`) — facilitation is instantaneous within a tick and the result depends on block order, exactly the bias the §2.1 Symmetry invariant class exists to catch. A Jacobi snapshot at tick start would be order-independent.
- **Duplicate establishment math at different cadences.** `runDispersalStep` computes all six guild HSIs and writes `veg.establishment.*` (`WorldState.ts:1498–1559`), then `runHerbEstablishmentStep` recomputes the identical HSIs from scratch (`:1670–1747`) on the seasonal band instead of reading the annual-band result — two copies of the same math that can silently disagree, a drift hazard.

### 2.5 Minor

- `factorSandSubstrate` (`binderHsiComposition.ts:60–66`) is the one unclamped factor in the whole set (16 checked) — a `config` value passes straight into the min-scan with no `clamp01`, and the unknown-material fallback silently kills binder suitability for any new substrate class.
- No cast-shadow term in `terrainInsolation` (`lightCompetition.ts:22–33`) — a cliff-foot cell gets full sun through the cliff; in a sculpting sandbox this is exactly what a player expects to matter.
- `veg.cover` decay (`WorldState.ts:1418`) is an absolute decrement identical for a cell at 0.99 cover and one at 0.01 — real mortality scales with standing stock; this gives linear rather than exponential decline.

---

## 3. Liebig composition math itself — verdict: correct

All five composers use an identical, correctly implemented min-scan with a stable lowest-id tie-break (`hsiComposition.ts:150–160` and its four siblings), correctly bounded output ([0,1] in 15 of 16 curves — the one exception is Finding 2.5), and `min()` is the right operator given several arms are correlated (spray/salinity/inundation all track proximity to sea) — a product would triple-count. The residual noise this produces in `habitat.limitingFactor` near coastlines is exactly what `limitingGap` already exists to express. **No fix needed here; the machinery is sound and the curve inputs feeding it are the problem (§2.1).**

---

## 4. What can ship without a candidate

All of §2 and §1. Every item there is a bug fix against an already-declared model shape (Liebig limiting factor, Beer–Lambert light competition, deterministic scheduling) or a shortfall against an already-Locked entry (**C-007**'s "dispersal pressure is a real path", **S-007**/**S-008** hysteresis) — same framing as **L2**/**L3**, which these findings extend. None registers a new `Process`.

The one item that stays a candidate is unchanged from the living-world review: **C-023** (guild competition/displacement) remains Open, owner-judged, gated on **L2**/**L3** landing first — nothing here should be read as pre-deciding it, though §2.3 shows the mechanism it would use is already half-built and currently unused for its stated purpose.

---

## 5. Suggested work order

```
L2 local seed rain (existing)  ──┐
L3 mortality as a rate (existing) ├── amend with §1 refinements (dispersal-syndrome kernels, MHW taper)
     │
HSI curve-shape corrections (§2.1)        — six curves, one pattern, generalizes existing forms
     │
Guild cover & light-competition fixes (§2.2 + §2.3)  — product-complement stacking, absorbed-light growth
     │
Habitat/dispersal determinism hygiene (§2.4)          — declared reads, Jacobi ordering, dedupe establishment calc
     │
L5 guild competition — still blocked on C-023, still gated on L2/L3
```

Queued as [BUILD_GUIDE §4.46–§4.48](../BUILD_GUIDE.md); §1's refinements folded into the existing L2/L3 checklists (§4.37, §4.38).

Plan sync: [BUILD_GUIDE.md](../BUILD_GUIDE.md) §4.37, §4.38, §4.46–§4.48; [AGENTS.md](../../AGENTS.md) queue tip.
