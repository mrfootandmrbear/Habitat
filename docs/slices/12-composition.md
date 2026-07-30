# Slice 12 — Arrival / first occupant composition

**Cited:** [NATURAL_PROCESS_MATH.md](../NATURAL_PROCESS_MATH.md) seed-dispersal kernel (`p = 1 − e^{−Σ seeds}`) composed with §3.3 Liebig HSI; [SIMULATION_MODEL.md](../SIMULATION_MODEL.md) §3.5 plant functional types; BUILD_GUIDE §4.8; **C-007** (Locked), ES-006, E-009, W-003, E-004, T-001, T-003, T-005, N-001, N-004. Steal: Viva Piñata condition-earned arrival (EXTERNAL_REFERENCES) — authored unlock checklists rejected.

## Choice

One real plant functional type arrives because a place became suitable:

| Choice | Value | Why |
|---|---|---|
| Functional type | `herb` (wet-site herbaceous pioneer) | Matches the notebook seed (“first shoots… hollow I kept wet”); fastest biological response among SIMULATION_MODEL §3.5 types; no species name invented (E-004 / W-003 — role until preserve data) |
| Seed source | Fixed external pressure around the preserve perimeter | Preserve edge is the standing source of colonizers; player never places seeds |
| Kernel | Isotropic exponential distance decay | NATURAL_PROCESS_MATH lists exponential or 2Dt; exponential is cheapest and deterministic; fat tails deferred |
| Establishment | Continuous accumulation, not a stochastic draw | **C-003** forbids shipping stochastic arrivals while Open; continuous biomass still couples to HSI and clears the earned-arrival criterion |

## Equations

**Annual band — seed bank (owner `dispersal`)**

```
d = distance_to_nearest_preserve_edge (cell units)
seedPressure = seedSourceStrength · exp(−d / seedMeanDistance)
veg.seedBank.herb = seedPressure   // refreshed each annual commit
```

No ambient RNG. The perimeter source is authored geometry of the preserve, not a player introduction.

**Seasonal band — establishment (owner `vegetation`, seasonal write)**

```
establishmentProbability = 1 − exp(−seedBank · habitat.suitability · establishmentScale)
Δbiomass = establishmentProbability · herbEstablishmentRate · dt
veg.biomass.herb ← clamp(biomass + Δbiomass, 0, herbBiomassMax · habitat.suitability)
```

- Zero `habitat.suitability` ⇒ probability 0 ⇒ no establishment (arrival gate).
- Capacity is resource-derived (`herbBiomassMax · HSI`), never a fixed ecological `K` (ES-006).
- Improving the limiting HSI factor raises probability; improving a non-limiting factor does not (inherits Liebig min from Slice 9).

## Field ownership

| Field | Owner | Band | Legacy | Role |
|---|---|---|---|---|
| `veg.seedBank.herb` | `dispersal` | annual | **yes** | Seed pressure from fixed perimeter source |
| `veg.establishment.herb` | `dispersal` | annual | no | Inspectable probability (derived each annual from seed × HSI) |
| `veg.biomass.herb` | `vegetation` | seasonal | no | First-occupant biomass; herbaceous regrows from conditions |
| `band.daysSinceAnnual` | (scalar phase) | — | **yes** | Annual cadence state (T-003) |
| `band.daysSinceSeasonal` | (scalar phase) | — | **yes** | Seasonal cadence state (T-003) |

`vegetationProcess` remains the single vegetation owner. Seasonal herb-biomass writes are the same process id on a second band — not a parallel vegetation authority. `dispersal` owns only seed-bank / establishment-pressure fields.

## Deferred to Slice 13 — **Done**

- Feeding `veg.biomass.herb` into roughness / infiltration via local `physicalCover` (biology → physics) — see [13-composition.md](13-composition.md).
- Additional functional types, fat-tailed kernels, light in the Liebig gate, named species from preserve data (still deferred).

## Banned

- Introduction / place-species tool while C-007 is under test.
- Occupancy copied from HSI with no dispersal path.
- Unsaved or ambient randomness; stochastic establishment draws (C-003 Open).
- Hidden readiness unlock tables (Viva Piñata rejection; E-009 / N-004).
- Invented species or material names.
- A second process id that also owns `veg.cover` or `veg.biomass.herb`.
