# Slice N10 — Climate-capped woody shrub (NS-010)

**Status:** Done — machine (W-003 catalogue role; climate-capped via NS-002)  
**Nature cards:** NS-010  
**Register:** C-007 Locked; C-011 Locked; C-004 Locked; W-003; E-004; N-004  
**New Process?** no — same `dispersal` + `vegetation` owners; fifth guild fields

## Steal

Island-colonization stage-3 woody + NS-002 warmer f_temp floor → inland shrub HSI that zeros under mild/cold and on bare cells, while warm herb-covered hollows escalate. Cover facilitation reads herb fraction (stage filter); upland inundation zeros intertidal. Rejected: authored succession timers; painting shrub; bird/nutrient Process.

## Rule

```
f_temp     = temperature ramp (shrubKill ≥ mild; shrubOpt = warm)
f_cover    = herbCoverFraction / (herbCoverFraction + halfSat)   // facilitation
f_moisture = moisture / porosity
f_salinity = 1 − S                                                // intolerant
f_inundation = 1 when hydroperiod = 0 else 0                    // upland

HSI_shrub = min(f_temp, f_cover, f_moisture, f_salinity, f_inundation)

One seed schedule → veg.seedBank.herb = strand = binder = marsh = shrub
establishment / biomass use guild HSI (herb keeps habitat.suitability)
```

`habitat.*` stays herb inspect; shrub limiting labels live on `evaluateShrubHsi`.

## Physics feedback

`physicalCoverFrom` stacks herb + strand + binder + marsh + shrub. Geomorphology `cFactor` reads that stack so living inland cover resists the next storm’s work.

## Paired expectation

Identical seed + herb cover → warm inland shrub ≫ cold (temp-limited); warm bare shrub ≈ 0 (cover-limited). Mild with cover still stalls woody. Probe: `shrub-arrival`.

## Bans

Ecosystem painter / species picker (N-001, E-004) · grass→shrub timers (ES-001) · second Process id owning cover/biomass · bird/guano Process this slice
