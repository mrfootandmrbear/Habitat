# Slice A1 — Herbivore population/trait fields composition

**Cited:** [C-027-framing.md](../candidates/C-027-framing.md) (Locked); [BUILD_GUIDE §4.66](../BUILD_GUIDE.md); [SIMULATION_MODEL §3.7 / §4 / §5 / §11](../SIMULATION_MODEL.md); F-001 (undeferred); E-004/E-005/E-006/E-009/ES-006/ES-007/W-003/N-003/N-004/N-005/D-001/T-001/T-006/T-007 Locked/Current; C-011/C-003/C-019.

## What this slice is

The first `populations` Process (SIMULATION_MODEL §3.7) — Habitat's first animal life. Registers eight new fields under a new owner, `populations`, split across two bands the same way `vegetation`/`vegetationSeasonal` already split ownership of the plant guilds:

| Field | Band | Why this band |
|---|---|---|
| `pop.herbivore.density` | annual | demographic structure, §3.7 spec |
| `pop.herbivore.stage.juvenile` / `.stage.adult` | annual | same |
| `pop.herbivore.occupancy` | annual | derived from density/capacity, same cadence |
| `pop.herbivore.trait.limbLength` | annual | adaptation — slow, hysteretic (§3.3) |
| `pop.herbivore.trait.webbing` + `.swap.webbing` | annual | adaptation — same |
| `pop.herbivore.trait.insulation` | **seasonal** | plasticity — reversible, must not share the annual traits' law or band (§3.3) |

`populationsProcess` (annual) and `populationsSeasonalProcess` (seasonal) share process id `"populations"`, mirroring the existing `vegetationProcess`/`vegetationSeasonalProcess` pattern exactly — confirmed by `ownership.test.ts`'s existing generic checks (owner-matches-writer, contributes-not-self-owned) passing against both with no special-casing.

## The trait law, and the bug found while testing it

C-027 §3.3's law:

```
traitMean += traitRate · (pressureOptimum(habitatState) − traitMean) · dt
```

`pressureOptimum` reads existing fields — terrain slope (`limbLength`), `climate.airTemperature` (`insulation`, the same driving field vegetation's own kill-threshold term reads), tidal hydroperiod / NS-008 `f_inundation` (`webbing`) — three real-world referents (C-011), no invented pressure.

**First draft wrongly clamped the demand, not just the trait.** `limbLengthOptimum`/`insulationOptimum` initially saturated their own output into the trait's envelope (`clamp01` before scaling), and `traitMismatchMortalityRate` clamped `pressureOptimum` to match before computing the mismatch. Together this made §3.3's central claim — "a population that exhausts its envelope declines rather than continuing to morph" — architecturally unreachable: the moment `traitMean` pinned at the envelope edge, the (also-clamped) mismatch collapsed to zero, and the "declining" population just... stopped declining, for free. Caught while writing the envelope-exhaustion test, which asked for a scenario where the *demand* legitimately exceeds the envelope and got a passing test with zero mismatch instead — the test was honest even though the code wasn't.

Fixed: `limbLengthOptimum`/`insulationOptimum` no longer clamp their own output (only floor at 0 where "negative demand" is meaningless); `traitMismatchMortalityRate` uses the *raw* `pressureOptimum`. Only `nextTraitMean` clamps — the trait, not the demand. The gap between the two is exactly what keeps costing mortality after the trait pins.

## Measured (Tier-M — 8×8 grid, direct step calls, `src/sim/population.test.ts` + ad hoc verification)

**No fixed K (ES-006).** Same founder population (5 adults/km² everywhere), same habitat suitability (1.0), 30 annual steps, only forage differs:

| Forage (kg DM·m⁻²) | Density after 30 bands (individuals·km⁻²) |
|---|---|
| 0.05 (well below `herbivoreForageReferenceKgM2` = 1) | 0.746 |
| 2.0 (well above reference) | 3.455 |

Re-running the high-forage case from scratch reproduces **3.455** exactly — capacity is a function of state, not a hidden stored value.

**Envelope-exhaustion.** Same founder population and forage (2.5), 60 annual steps, only terrain differs:

| Terrain | Raw `limbLengthOptimum` | `limbLength` after 60 bands | Density after 60 bands |
|---|---|---|---|
| Flat (slope 0) | 0.85 (= envelope min) | 0.850 | 1.538 |
| Checkerboard elevation (slope 100, reference 0.5) | **2.65** — 1.12× past `herbivoreLimbLengthMax` (1.25) | **1.250** — pinned at the envelope, never exceeds it | **6.78×10⁻⁹** — the population fails, not a rendering zero but a real demographic collapse under sustained unpayable mismatch cost |

**Grazing write-back (§4.6.3).** 10 adults/km² founder population, forage 2.0 kg DM·m² everywhere, one annual step: density resolves to 8.925 individuals·km⁻² (adult mortality + maturation already move it inside one step) and `veg.biomass.herb` drops from **2.000 → 1.786** at that density. At zero density (default-initialized world, no founder), `veg.biomass.herb` is bit-identical to a control world that never called `runPopulationsAnnualStep` at all — multiplicative-in-density by construction, not by a special-cased branch.

**Determinism (T-001).** Two identically-seeded worlds run 10 annual+seasonal steps reach identical `stateHash()`, identical `getHerbivoreDensity`/`getHerbivoreLimbLength`/`getHerbivoreWebbingSwap` at every sampled cell.

**Bounds.** `FieldRegistry.assertBounds("annual")` asserted after every step for 60 steps under both favorable conditions and the unmeetable-pressure (extreme slope) case — never throws. `npm run gate`'s full-suite bounds checks (`stepEvent`'s per-band `assertBounds` calls) stay green across every existing probe scenario too (see below).

## Tier-P — herbivore-drift probe

A forced Heat-dial swing (`heatById("warm")` → `heatById("cold")`, the same Force-panel regime the arrival-family probes already use) moves `pop.herbivore.trait.insulation` **0.1333 → 0.9333** (Δ = 0.800) over 30 seasonal bands each side, replay-matched (identical seed/state → identical final sample). This is the "instance count and morph/swap amount visibly track a forced pressure change... without an inspector" proxy the slice checklist asks for, built before any owner playtest question is asked (VERIFICATION_POLICY §4).

## Render (placeholder — see [HerbivoreMesh.ts](../../src/render/HerbivoreMesh.ts) module doc)

Only `AD-001` (`limbLength`) has an accepted card in the animal-design lane ([docs/animal-design/cards/](../animal-design/PROTOCOL.md)); `insulation`/`webbing` have none. Per the Track A prompt rule ("if no card exists yet for a trait, that trait's render half waits, the sim-field half does not"), this slice ships:

- A real `InstancedMesh` (`HerbivoreMesh`, sibling to `OccupantMesh`, same instancing idiom — `mergeParts`, the shared `hash01` seed family, no `tick` term, no persisted per-instance identity).
- Literal density readout: instance count = `round(density × cellAreaKm2)`, capped per cell — never a tuned "always show a few" floor (C-027 §2/§3.4). `cellAreaKm2` uses `config.cellSizeMeters` (the real-world Δx), never `config.worldSize` (the render-only scene span — C-012's own lesson).
- `limbLength` scales the whole placeholder instance's Y-extent as an honest approximation of bone-scale — documented plainly as an approximation, since a static merged-geometry `InstancedMesh` has no skeleton to scale one bone on. That arrives once a real Foxel `.glb` skeleton (built from the accepted `AD-001` card, a separate higher-cost step per [PROTOCOL.md](../animal-design/PROTOCOL.md)) replaces this placeholder.
- `insulation`/`webbing` update their sim fields only — no visual difference yet.

**Honest expectation at Habitat's scale.** A ~0.92 km² preserve at realistic herbivore densities (`herbivoreDensityMax` = 25/km², a modest temperate-grazer referent) yields an *expected* instance count per cell around 0.0025 — most cells will legitimately show zero visible animals even at full capacity. This is the literal-readout decision working as designed, not a defect: fewer visible animals is what a small preserve genuinely holds.

## Inspector (T-005) + notebook seed (U-006)

`herbivoreDensity` added to `InspectorLayer` and the `View:` picker (`src/ui/controls.ts`), colored the same way the existing guild-biomass layers are (`src/render/TerrainMesh.ts`). Notebook seed recorded per DoD row 6 (U-006 UI itself is unchanged this slice): *"The herd here has gone shaggy since the cold set in."*

## D-007 clip gate

This is the first slice to register a new Process. Per the Lock note on C-027 and BUILD_GUIDE §4.66's own checklist, the clip verdict must be recorded before any later Track A slice (or any other track) registers another new Process. **A2** (§4.67, seed disperser) extends this same `populations` Process rather than registering a new one and is not blocked by this gate. The ask: [docs/playtests/A1-herbivore.md](../playtests/A1-herbivore.md).

## What moved, and why

Adding 8 new registered fields moved every probe's `hashN`/`delta.hashN` metric (`FieldRegistry.hashState()` sums over every registered field) — verified by diffing every refreshed baseline before committing: only hash keys and one already-unmonitored timing metric (`stepMsMean`, tolerance effectively infinite) changed; every physical scalar (elevation, soil, cover, mass residual) stayed bit-identical. Same mechanical reason a save/load round trip is hash-sensitive to the registered field *set*, not just to values — trait-mean fields drift deterministically toward their pressure optimum every band even at zero density (nothing gates the trait law on density), which is real, intentional state evolution, not a placeholder.

## Deferred / explicitly not touched

- Mesopredator/apex-predator roles, ecosystem-engineer write-back, adaptive radiation (**C-029**) — stay off Track A per C-027-framing.md §4.6/§5, not this slice's scope.
- Real Foxel `.fxl`/`.glb` assets — a separate, higher-cost step per the animal-design lane, gated on `insulation`/`webbing` cards that don't exist yet.
- **A2** (seed disperser, §4.67) — next-but-one, extends this Process, first fauna dispersal-reach concept.
