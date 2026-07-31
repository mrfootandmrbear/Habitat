# Slice N4 — Strand splash pioneer (NS-004)

**Status:** Done — machine (C-018 / C-019 remain Open; W-003 catalogue role)  
**Nature cards:** NS-004  
**Register:** W-003; E-004; C-007 Locked; C-018 Open; C-019 Open; N-001; N-004  
**New Process?** no — same `dispersal` + `vegetation` owners; second guild fields

## Steal

Island-colonization stage-1 strand pioneers → shore-biased overseas schedule × salt-tolerant HSI. First occupancy on salty exposed shore, not inland herb hollow. Rejected: reuse wet-site herb HSI with salinity as Liebig minimum; player-placed coastal vegetation.

## Rule

```
f_shore     = clamp01(shore.exposure)
f_salinity* = factorSalinityTolerant(S)   // 1 through S≤0.9; →0 at S=1
f_temp      = ramp kill→opt (strand temps in config)

HSI_strand = min(f_shore, f_salinity*, f_temp)

One seed schedule → veg.seedBank.herb = veg.seedBank.strand
establishment / biomass use guild HSI (herb keeps habitat.suitability)
```

Spray / burial arms deferred (NS-003 / NS-005). `habitat.*` stays herb inspect; strand limiting labels live on `evaluateStrandHsi`.

## Paired expectation

Identical perimeter seed → salty exposed shore earns strand ≫ herb; fresh inland hollow earns herb ≫ strand (strand shore-limited). Probe: `strand-arrival`.

## Bans

Ecosystem painter / species picker (N-001, E-004) · invent Locked C-018/C-019 · stress.spray store (NS-003) · second Process id owning cover/biomass
