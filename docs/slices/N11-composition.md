# Slice N11 — Cryptogam crust bootstrap (NS-011)

**Status:** Done — machine (W-003 catalogue role; stage-2 cover bootstrap)  
**Nature cards:** NS-011  
**Register:** C-007 Locked; C-011 Locked; W-003; E-004; N-004  
**New Process?** no — same `dispersal` + `vegetation` owners; sixth guild fields

## Steal

Island-colonization stage-2 cryptogam/litter bootstrap → damp bare inland HSI (moisture × open canopy × salt-intolerant × upland inundation). Opposite of shrub cover facilitation: dense pioneer/woody shade-limits crust. physicalCover stack raises infiltration (moisture holding). Rejected: litter/OM Process; painting moss/crust; nutrient/guano Process.

## Rule

```
f_moisture = moisture / porosity
f_open     = 1 − canopyFraction   // herb+strand+binder+marsh+shrub cover
f_salinity = 1 − S                // intolerant
f_inundation = 1 when hydroperiod = 0 else 0   // upland

HSI_crust = min(f_moisture, f_open, f_salinity, f_inundation)

One seed schedule → veg.seedBank.crust (same pressure as other guilds)
establishment / biomass use guild HSI
```

`habitat.*` stays herb inspect; crust limiting labels live on `evaluateCrustHsi`.

## Physics feedback

`physicalCoverFrom` stacks herb + strand + binder + marsh + shrub + crust. Vegetation writes roughness / infil contribution from that stack so living crust holds moisture better than bare.

## Paired expectation

Identical seed → damp bare crust ≫ dry (moisture-limited); damp shaded ≈ 0 (open-limited); damp salty ≈ 0. Probe: `crust-arrival`.

## Bans

Ecosystem painter / species picker (N-001, E-004) · litter/OM Process this slice · second Process id owning cover/biomass · nutrient/guano Process (still deferred)
