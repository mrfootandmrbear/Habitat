# Slice N5 — Sandy crest sand-binder (NS-005)

**Status:** Done — machine (C-009 / C-017 remain Open; W-003 catalogue role)  
**Nature cards:** NS-005  
**Register:** W-003; E-004; C-007 Locked; C-017 Open; C-009 Open; N-001; N-004  
**New Process?** no — same `dispersal` + `vegetation` owners; third guild fields

## Steal

Island-colonization stage-1/2 dune binder → crest-gated HSI on sand + drained + exposed sites. Binding cover arrives on open sandy berms, not in the wet hollow; physicalCover blunts the next storm’s erosion (thesis payoff #2). Rejected: place-species / dune painter; occupancy from HSI alone; second sediment Process.

## Rule

```
f_drainage = 1 − clamp01(moisture / porosity)   // dry crest
f_exposure = clamp01(shore.exposure)            // windward face
f_sand     = sand → 1; loam → 0.25; clay/rock → 0
f_burial   = 1 − |longshore| × (1 − binderBurialTolerance)
             // coastal remobilization proxy; no stress.burial store yet

HSI_binder = min(f_drainage, f_exposure, f_sand, f_burial)

One seed schedule → veg.seedBank.herb = strand = binder
establishment / biomass use guild HSI (herb keeps habitat.suitability)
```

`habitat.*` stays herb inspect; binder limiting labels live on `evaluateBinderHsi`. Burial uses `shore.longshore` magnitude as flux proxy until a registered burial stress exists.

## Physics feedback

`physicalCoverFrom` stacks herb + strand + binder. Geomorphology `cFactor` reads that stack (not `veg.cover` alone) so a living sandy crest resists the next storm’s work.

## Paired expectation

Identical perimeter seed → dry sandy exposed crest earns binder ≫ herb/strand; wet loam hollow earns herb ≫ binder (binder exposure- and sand-limited). Probe: `binder-arrival`.

## Bans

Ecosystem painter / species picker (N-001, E-004) · invent Locked C-017/C-009 · second Process id owning cover/biomass · burial as a second sediment authority
