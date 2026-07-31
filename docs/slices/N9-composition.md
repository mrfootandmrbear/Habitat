# Slice N9 — Salt-marsh engineer (NS-009)

**Status:** Done — machine (C-016 Locked; W-003 catalogue role)  
**Nature cards:** NS-009  
**Register:** C-016 Locked; C-007 Locked; C-011 Locked; W-003; E-004; N-004  
**New Process?** no — same `dispersal` + `vegetation` owners; fourth guild fields

## Steal

Island-colonization mid-marsh engineer + NS-008 deferred hump → guild-local hydroperiod hump on the same envelope field upland herbs zero. Mid-tide foreshore earns marsh; dry terrace earns herb. `physicalCover` blunts the next storm (thesis payoff #2). Rejected: painting marsh; folding the hump into herb `habitat.suitability`.

## Rule

```
hydroperiod = tidalHydroperiod(elev, MLW, MHW)   // same as NS-008
f_inundation = 1 − 2·|hydroperiod − 0.5|         // triangular mid-envelope hump
f_salinity   = salt-tolerant (full through 0.9)
f_temp       = temperature ramp (marsh kill/opt)

HSI_marsh = min(f_inundation, f_salinity, f_temp)

One seed schedule → veg.seedBank.herb = strand = binder = marsh
establishment / biomass use guild HSI (herb keeps habitat.suitability)
```

`habitat.*` stays herb inspect; marsh limiting labels live on `evaluateMarshHsi`.

## Physics feedback

`physicalCoverFrom` stacks herb + strand + binder + marsh. Geomorphology `cFactor` reads that stack so a living foreshore resists the next storm’s work.

## Paired expectation

Identical seed → mid-foreshore marsh ≫ herb (herb inundation-limited); dry terrace herb ≫ marsh (marsh inundation-limited at hydroperiod≈0). Salt and spray matched. Probe: `marsh-arrival`.

## Bans

Ecosystem painter / species picker (N-001, E-004) · herb Liebig hump · second Process id owning cover/biomass · per-event tidal phase
