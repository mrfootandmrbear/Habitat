# Slice L2 — Local seed rain composition

**Cited:** [living-world review](../reviews/2026-07-31-living-world-review.md) §1; C-007 Locked; C-019 Locked; C-011 Open; C-003 Open; T-001; E-005; W-003; N-004; §2.1 Symmetry invariant class.

## What was actually wrong

`runDispersalStep` wrote seed pressure as a pure function of distance-to-shore. `veg.biomass.*` was read only for HSI facilitation (shrub reads herb cover, crust reads shade) and was never a propagule source, so every seed in the world arrived from off-map forever. Reproduced on the default island before touching anything: 3562 land cells, max shore distance 32, `S_elig` 0.512, and at *perfect* HSI 52.1% of land reaches p_establish ≥ 10%, 32.4% sits at 1–10%, and 15.6% falls below 1%. That last band is the review's "effectively never", and it is why a founded meadow never expanded and burned interior never returned.

This implements Locked C-007 rather than departing from it — C-007's own implications already say *"dispersal pressure is a real path — occupancy is never copied from HSI alone."* Dispersal was a static field, not a path.

## Seed pressure is now external + local

`pressure = overseas(d) + Σ_neighbours (biomass / biomassMax) · kernel · strength`, evaluated as a deterministic separable convolution. No RNG anywhere in it — **C-003** is Open and authored-ignition-only, so stochastic arrivals stay out.

Three properties are load-bearing rather than incidental:

- **Normalized by guild capacity.** The local term uses occupancy (`biomass / biomassMax`), not raw biomass, so one `localSeedStrength` means the same thing for crust (caps at 1.5) as for herb (2.5), and the term is bounded above by `localSeedStrength`. Local seed cannot run away.
- **Unit kernel.** The 1D weights `∝ exp(−|k|/λ)` are truncated at ⌈3λ⌉ and normalized to sum 1, so the separable 2D product is also unit mass and the local term is a weighted *mean* of the neighbourhood, not an unbounded sum over it.
- **Zero at world start.** Biomass is zero everywhere before anything establishes, so the local term is exactly zero and the cold-start seed field is bit-identical to the pre-L2 overseas kernel. Founding an empty island is unchanged; local seed only decides how a founded patch *spreads*.

## Why Symmetry is the invariant class

A convolution written the obvious way — accumulating in place over a single scan — reads cells the same pass already updated, and the resulting front creeps faster toward +x/+z than toward −x/−z. That is precisely §2.1's **Symmetry** (update-order / index-order bias), and it would have been invisible in any aggregate metric: total biomass would look right while the meadow quietly drifted southeast. `convolveSeparable` writes a horizontal pass into a scratch buffer before the vertical pass, so no partially-updated cell is ever read, and `seedRain.test.ts` asserts a point source spreads identically in all four directions and that the field is invariant under transpose.

## Per-guild distance only where a referent exists (N-004)

The register bans arbitrary hidden rules, so a per-guild dispersal distance needs a real-world referent or it does not get one. Two guilds have one and four do not:

| Guild | λ (cells) | Referent |
|---|---|---|
| strand | 6 | NS-004 "sea-dispersed seed"; island-colonization §3 hydrochory ≫ wind ≫ bird — the one guild with an explicit long-distance mechanism |
| crust | 1 | NS-011 "living soil crusts and moss mats" — mats creeping into directly adjacent ground, the short end of the contrast |
| herb, binder, marsh, shrub | 2 (shared) | No dispersal mode stated on their cards. One shared default rather than four invented numbers |

Inventing four more distances would have been easy and would have been exactly the failure N-004 exists to prevent. The shared default is the honest representation of "we have no referent for this yet."

## The C-019 guard, and how the number was chosen

The risk is that local seed swamps the overseas term until island isolation stops mattering. Measured directly, sweeping `localSeedStrength` against the isolation signal (mean biomass ratio, large-near island vs small-far island, same `S_elig` shape throughout):

| `localSeedStrength` | year-2 ratio | year-3 ratio |
|---|---|---|
| 0 (pre-L2) | 2.91 | 2.53 |
| 5 | 2.87 | 2.41 |
| **10 (shipped)** | **2.82** | **2.29** |
| 20 | 2.73 | 2.04 |
| 40 | 2.54 | 1.65 |
| 80 | 2.24 | 1.23 |

At the shipped value the isolation signal keeps 97% (year 2) and 90% (year 3) of its pre-L2 magnitude; the swamping failure mode is a factor of 4–8 away, so the choice is not knife-edge. `eligibleRichness` itself is untouched — `S_elig` is 0.087 (small/far) vs 0.542 (large/near) before and after.

Worth stating plainly: both islands do eventually saturate. That is the correct reading of C-019, which is a claim about *rate* of colonization and equilibrium richness, not a claim that a remote island stays permanently barren. The guard asserted in `spread-front` is the one §4.37 specifies — a small isolated island colonizes **more slowly** — measured at a horizon where colonization is still in progress.

## The scheduler edge

`dispersalProcess.reads` already listed `veg.biomass.*`, but it was missing `veg.biomass.crust` — now that each guild seeds its own kind, crust was sourcing propagules from a field it never declared. Added.

All six are now also declared `lagged`. The honest situation: `SimScheduler`'s topological sort runs *per band*, and dispersal is the only process in `annual`, so there is no intra-band cycle for the sort to find or break. The real edge is cross-band — vegetation writes biomass on `seasonal`, dispersal reads it on `annual` — which means the value taken is always the previous band commit, i.e. lagged by construction of the band order. Declaring it makes that visible in the registry and citable in review (SIMULATION_MODEL §5 / §272) instead of being an accident of band ordering nobody can find later, and it makes the cycle explicit if a biomass writer is ever added to the annual band.

## A hostile boundary must be wider than the kernel

The `spread-front` stall case initially failed with the front crossing a 4-cell salt band. That is not a defect: with λ = 2 the kernel reaches ⌈3λ⌉ = 6 cells, so seed genuinely steps over a 40 m strip. A hostile strip narrower than the dispersal kernel is not a boundary, and the probe now sizes its barrier off `localSeedMeanDistanceCells` so a λ change re-tunes it rather than silently invalidating the test.

The stall case also uses a salt **ring** around the founded patch rather than a straight band. A band across the island is "crossed" by the far side's own front — the far coast colonizes from its own shoreline via the overseas kernel, which has nothing to do with the barrier under test. The ring keeps the claim about the patch.

## What moved, and why that's expected

**Only `deep-time`.** `p005.hashFirstN` / `hashSecondN` take new values and `lateDelta.coverDelta` moves by 2.0e-6. `deep-time` is the one scenario that drives the full band cascade over enough sim-decades (100 sim-years) for standing biomass to feed back into seed pressure, so it is the one scenario whose trajectory this change is *supposed* to alter. `p005.hashMatch` stays 1 — save → advance → reload → advance still reproduces, so P-005 determinism is intact and only the value changed, not the property.

**§4.37 predicted `arrival-earned`, `island-arrival` and the six `*-arrival` probes would move. They did not, and that is correct rather than lucky.** Every one of them calls `runDispersalStep` exactly once, at t = 0, before any biomass exists — so the local term is identically zero in all of them and the change is a provable no-op for those scenarios. This is the same property the cold-start measurement shows on the default island: the pre-L2 and post-L2 seed fields are bit-identical until something is standing. The prediction assumed those probes re-ran dispersal after establishment; they do not.

## Measured result

The deepest inland cell on the default island (shore distance 32, overseas-only p_establish 0.055% — squarely in the review's "effectively never" band) reaches 0.843 biomass in 3 years and 2.470 of a 2.5 maximum by year 9, seeded by an eight-cell refugium beside it. In `spread-front`'s deep-interior sample, a founded patch grows 9 → 61 → 129 cells over four years while the no-patch control stays at exactly 0 for the same horizon — that zero is re-measured every run and is what proves the sample band still isolates the local term rather than picking up overseas arrivals.

## Deferred / explicitly not touched

- **Fire does not clear `veg.biomass.*`** — it clears `veg.cover` only. So the recovery case applies the disturbance to biomass directly rather than igniting. Making fire clear biomass belongs to the queued review-defect set (§4.44–§4.48) and is deliberately untouched here.
- **Mortality is still a clamp** (§4.38 / L3). Recovery from a refugium is demonstrated; die-back at the front's trailing edge is not, because biomass cannot decline gradually yet.
- **No guild displacement** (§4.40 / L5, blocked on C-023). Guilds still stack additively; local seed makes each guild's own front real, not competition between them.
