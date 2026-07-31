# Slice G — Season + erosion-intensity force dials (C-021 / C-022)

**Status:** Done — machine (owner Lock sitting outstanding for both)
**Register:** C-004 Locked; C-011 Locked; T-001; T-004; H-004; S-007; N-004; C-021 Open; C-022 Open
**New Process?** no — season scales the existing seasonal `vegetation` establishment tick; erosion scales the existing `geomorphology` erosion terms. Neither registers a new `Process`, so D-007's clip gate does not apply.

## Steal

Two empty stubs named identically by `AGENTS.md`, the [gap review](../reviews/2026-07-30-sim-gap-review.md), and [ISLAND_FORCES.md](../ISLAND_FORCES.md), both gated only on C-006 (Locked), and explicitly permitted by DECISION_CONFORMANCE to share one slice. Rejected: a season dial that re-paints temperature (duplicates Heat, fails C-011); an erosion dial that scales soil production (conflates weathering with disturbance); a second erosion `Process` (fails GEO-002/T-004 — one law, dialled intensity).

## Rule

```
Season (C-021):
  seasonPressure ∈ {short: 0.6, typical: 1, long: 1.4}
  runHerbEstablishmentStep: scale = dt · seasonPressure   (all six guilds, uniformly)

Erosion intensity (C-022):
  erosionIntensity ∈ {calm: 0.4, moderate: 1, stormy: 2.2}
  runGeomorphologyStep: erosionScale = dt · erosionIntensity
    kCoast = shoreErosionK · erosionScale
    kE     = substrate.erosionK · erosionScale
  soil production (p0) still scales by dt alone — never by erosionIntensity
```

Both dials store a plain WorldState scalar (constructor option + getter/setter), the same treatment as sea level / tidal amplitude / wind — not the generic field registry, since neither is evolving `Process` output. They travel through save/branch for free via `ForceSettings` (`src/sim/forceSettings.ts`), no changes needed in `branch.ts`.

## Physics feedback

Season pressure feeds directly into the same additive-growth-toward-capacity formula every guild already uses (`nextHerbBiomass`) — it cannot exceed the HSI-derived capacity, so it changes *how fast* growth arrives, never *whether* it's temperature-limited. Erosion intensity feeds the same redeposit/ledger machinery geomorphology already runs (Exner-lite basins, longshore lee deposit, ocean ledger) — scaling the *input* erosion term needs no change downstream, so mass conservation carries over automatically.

## Paired expectation

Identical seed + HSI → `long` season pressure earns more herb biomass than `short` after one seasonal tick; `typical` reproduces today's unscaled establishment exactly. Identical ramp+pit terrain → `stormy` erosion wears the channel down further than `calm`; `moderate` reproduces today's unscaled geomorphology exactly; both regimes conserve total soil mass. Probes: `season-regime`, `erosion-intensity`.

## Bans

Cell-targeted season or erosion ("make this slope winter", "smooth this hill") · a second temperature paint duplicating Heat · a second erosion `Process` or a paint-smooth brush · scaling soil production by erosion intensity · calendar-skip / hysteresis-erasing season jumps (S-007)

## Follow-up

Machine half only — both candidates stay **Open**. Dossiers: [C-021-dossier.md](../candidates/C-021-dossier.md), [C-022-dossier.md](../candidates/C-022-dossier.md). Owner Lock sitting is the next taste-judged step; leading next-but-one if no sitting is scheduled: file the two remaining unfiled engine gaps in [ISLAND_FORCES.md](../ISLAND_FORCES.md) (storm surge, freshwater lens).
