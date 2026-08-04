# Slice — Habitat/dispersal determinism hygiene (§4.48)

**Cited:** [vegetation/habitat review](../reviews/2026-07-31-vegetation-habitat-review.md) §2.4; T-001 Locked; T-005. **New Process? no.**

## What was wrong

1. **Undeclared reads on `habitatProcess`.** `runHabitatStep` reads `this.terrain.data` (aspect/slope insolation via `terrainInsolation`) and `this.soilMaterial.data` (porosity lookup) without either field in the process's declared `reads` — invisible to any future scheduler dependency analysis (T-005: registered fields inspectable).
2. **Same-tick order dependence in `runHerbEstablishmentStep`.** Six guilds updated sequentially in one loop pass, in place. Shrub's cover-facilitation term read `herbBiomass[i]` *after* herb's own line had already overwritten it that tick; crust's five-guild shade term read strand/binder/marsh/shrub biomass the same way. A Gauss-Seidel update where the §2.1 Symmetry invariant class calls for order-independence — swapping the six blocks in source would have changed the result.
3. **Double-computed guild HSI at mismatched cadence.** `runDispersalStep` (annual) and `runHerbEstablishmentStep` (seasonal) each called `evaluateStrandHsi` / `evaluateBinderHsi` / `evaluateMarshHsi` / `evaluateShrubHsi` / `evaluateCrustHsi` independently, with the same math producing different numbers depending on when each ran. The displayed `veg.establishment.*` probability (from dispersal's copy) could silently disagree with the HSI that actually drove that season's biomass growth (establishment's copy).

Herb was never affected by (3) — it reads the daily-band `habitat.suitability` spine (Slice 9), a single shared source both steps already read rather than recompute.

## Fixes

- **`habitatProcess.reads`** (`habitatProcess.ts`) gains `terrain.elevation` and `soil.material`.
- **Five new cached fields** — `veg.hsi.{strand,binder,marsh,shrub,crust}` (`WorldState.ts`, owner `dispersal`, band `annual`, range `[0,1]`). `runDispersalStep`'s `writeCell` writes each guild's `.hsi` into its cache the same place it already computes it for `establishmentProbability`, so there is exactly one HSI computation per guild per dispersal tick, not two.
- **`runHerbEstablishmentStep` rewritten** to read `strandHsi[i]` / `binderHsi[i]` / `marshHsi[i]` / `shrubHsi[i]` / `crustHsi[i]` from those caches instead of calling the five `evaluate*Hsi` functions itself. This is a stronger fix than a snapshot-and-guard: every cross-guild biomass read (shrub → herb, crust → herb/strand/binder/marsh/shrub) moved into `runDispersalStep`, which only ever *reads* biomass and never mutates it in that function — so nothing left in the mutating loop depends on a sibling guild's same-tick result. Each of the six updates now depends solely on its own seed bank, its own cached HSI (or `habitat.suitability` for herb), and its own prior biomass; reordering them cannot change the outcome. `moisture` / `soilMaterial` / `shoreExposure` / `soilSalinity` / `shoreLongshore` / `terrain` / `airTemperature` reads and the `hasTide`/`mlw`/`mhw` tide lookup all drop out of the function — they were only ever needed for the recompute this removes.
- **`dispersalProcess.writes`** gains the five `veg.hsi.*` ids; **`vegetationSeasonalProcess.reads`** gains them too, declared `lagged` for the same reason `dispersalProcess` already declares `veg.biomass.*` lagged: the scheduler's topo sort is per-band, so "read" here really means "last annual commit," and declaring it keeps that edge visible in the registry rather than implied only by band order.

**Found, not fixed here (out of scope for this checklist):** `vegetationSeasonalProcess.reads` already omitted `veg.biomass.{strand,binder,marsh,shrub,crust}` before this slice, even though each is self-read-before-write in exactly the pattern `veg.biomass.herb` *is* declared for. Same defect class as (1); not part of the review's §2.4 item, left for a future hygiene pass rather than expanding this one.

## A cadence consequence, not a bug

Establishment now grows strand/binder/marsh/shrub/crust against the HSI dispersal computed at the *start* of that year, held fixed across every seasonal tick until dispersal runs again — not recomputed fresh each season. This is what "read what dispersal wrote" means once dispersal is annual and establishment is seasonal (multiple ticks per one annual commit); herb's growth is unaffected (still daily-refreshed via `habitat.suitability`). The result is a small, consistent reduction in how snappily the five guilds respond to transient within-year condition changes — visible in `deep-time`'s `meanCover` (e.g. y100: 0.3828 → 0.3799) — not a change in direction or a broken invariant.

## Tests

`src/sim/habitatDispersalHygiene.test.ts` (new): `habitatProcess.reads` contains `terrain.elevation` / `soil.material`; the five `veg.hsi.*` fields register with owner `dispersal`, band `annual`; every cached HSI value is a finite `[0,1]` fraction after a dispersal tick; the six guild updates commute — computed forward and reverse from an identical tick-start snapshot via the same pure `nextHerbBiomass`, both orders agree exactly, and both match (modulo `Math.fround` f32 storage) what the real `runHerbEstablishmentStep` produced.

`shrubArrival.test.ts` / `crustArrival.test.ts` and `probeShrubArrival` / `probeCrustArrival` / `probeMarshArrival` (`scenarios.ts`) each hand-build a `WorldState` and call `runHerbEstablishmentStep` in a loop without ever calling `runDispersalStep` — before this slice that was harmless, because establishment recomputed HSI itself; after, the shrub/crust/marsh HSI caches those fixtures depend on are never populated. Fixed by adding one `world.runDispersalStep(1)` call per fixture, before the seed-bank overrides that already run after it (dispersal also writes seed banks; the manual fills still take precedence, unchanged from before). `strandArrival` / `binderArrival` / `heatArrival` / `salinityArrival` fixtures already called dispersal first and needed no change.

## Baselines moved (stated)

Establishment biomass for five of six guilds now depends on dispersal's annual-cadence HSI snapshot instead of a fresh per-tick recompute — this changes the exact numeric trajectory (not the qualitative story) of essentially every scenario that runs vegetation for more than a few days, so it ripples into full-state hashes broadly, the same blast-radius shape §4.47's cover/light fix had. 29 baselines refreshed with `--write-baseline`, none of them changing a probe's own semantic pass/fail assertions (every scenario still throws on its named invariant if violated; none did):

`deep-time`, `regime-divergence`, `branch-compare`, `burn-recover`, `disturbance-recovery`, `living-hollow`, `island-drainage`, `tidal-envelope`, `shore-exposure`, `longshore-drift`, `orographic-wind`, `salinity-arrival`, `heat-arrival`, `strand-arrival`, `binder-arrival`, `marsh-arrival`, `shrub-arrival`, `crust-arrival`, `spray-arrival`, `inundation-arrival`, `light-arrival`, `island-arrival`, `substrate-contrast`, `substrate-deposit`, `hillslope-deposit`, `cloud-delivery`, `event-band-gate`, `season-regime`, `erosion-intensity`.

No golden T-001 hash moved; `time-invariance` (S-009) stays green (after adding the five new field ids to its registered-fields list) and `deep-time`'s P-005 save/replay identity still matches (a single fresh run replayed from a mid-run save, not against the old baseline hash — that hash is expected to move and did).

## Next-but-one

C-023 (guild competition) judged and L5 (light-based displacement) implemented in the same session — see [C-023 decision](../DECISION_REGISTER.md#c-023) and its own composition doc.
