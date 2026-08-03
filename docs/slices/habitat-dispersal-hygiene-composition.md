# Slice §4.48 — Habitat/dispersal determinism hygiene composition

**Cited:** [vegetation/habitat review](../reviews/2026-07-31-vegetation-habitat-review.md) §2.4; T-001 Locked; T-005 Locked; §2.1 Symmetry invariant class.

## What was actually wrong

Three independent hygiene defects in the same code region:

1. `habitatProcess`'s declared `reads` (`habitatProcess.ts:12–18`) omitted `terrain.elevation` and `soil.material`, both silently consumed inside `runHabitatStep` — `terrainInsolation` reads elevation for the light arm, `substrateProps` reads material for the porosity arm. Invisible to any future scheduler dependency analysis.
2. `runHerbEstablishmentStep` updated the six guilds sequentially per cell: `herbBiomass[i]` was written first, then read (already updated) by shrub's cover-facilitation term, then crust's facilitation term read all five guilds' just-updated biomasses in the same pass — a Gauss-Seidel update the §2.1 Symmetry invariant class exists to catch.
3. `runDispersalStep` (annual) and `runHerbEstablishmentStep` (seasonal) called the identical `evaluate{Strand,Binder,Marsh,Shrub,Crust}Hsi` functions with the same inputs at two different cadences, without either persisting the result for the other — a drift hazard where the displayed `veg.establishment.*` field (dispersal's seed-weighted probability, annual) could silently disagree with the HSI that actually drove that guild's biomass growth (recomputed live, every seasonal tick).

## The fix

- `habitatProcess.reads` now lists `terrain.elevation` and `soil.material` alongside its existing five reads.
- Five new registered fields — `veg.hsi.{strand,binder,marsh,shrub,crust}` (owner `dispersal`, band `annual`, `[0,1]`) — are the single place each guild's raw HSI is computed and written, inside `runDispersalStep`'s existing `writeCell`. `runHerbEstablishmentStep` reads them instead of calling `evaluate*Hsi` a second time. Herb is unaffected: it already read `habitat.suitability`, a live daily field with exactly one writer (`habitatProcess`) — never a duplicate.
- `runHerbEstablishmentStep` is restructured guild-major: an explicit six-entry order (`GUILD_ESTABLISHMENT_ORDER`, exported) drives an outer loop over guild, inner loop over cells; each guild's update reads only its own seed bank, its own biomass, and its own (now-cached) HSI, and writes only its own biomass. Nothing left in the function reads another guild's value computed earlier in the same tick — the Gauss-Seidel dependency isn't papered over with a snapshot, the cross-guild reads that caused it are gone. `runHerbEstablishmentStep(dt, order)` takes the guild order as a parameter (default `GUILD_ESTABLISHMENT_ORDER`) so a test can assert permutation-invariance directly, per this item's own named test.

## Ship gate

New file `src/sim/guildEstablishmentOrder.test.ts`:

- `habitatProcess.reads` contains `terrain.elevation` and `soil.material`.
- Byte-identical `stateHash()` across three guild orders (canonical, reversed, an arbitrary shuffle) on an otherwise-identical 8-tick run with all six guilds seeded and actually growing (a `herbBiomass > 0.1` sanity check rules out a vacuous all-zero pass) — closes the Symmetry gap directly.
- A guild's cached HSI, and the biomass it drives, is unaffected by mutating a field that guild's HSI depends on (`shore.exposure`) *after* dispersal has already run for the year — proof establishment reads the frozen annual snapshot rather than recomputing it, where the old code would have picked the mutation up on its very next seasonal tick.

## What moved, and why

This is a real behavior change, not pure hygiene: five guilds' HSI now updates on the annual cadence `dispersal` already owns, not on every one of the ~8 seasonal establishment ticks between two dispersal commits. Previously a guild's facilitation term (shrub reading `herbBiomass`; crust reading all five standing biomasses) tracked whatever value those biomasses had reached *mid-year*, inside the very loop that was also advancing them. Now it uses the value dispersal saw at the start of the year — the same cadence its seed bank already had.

**Test/probe fallout from that cadence change, fixed as part of this slice.** Two probes and two unit tests hand-configure a scenario (temperature, moisture, herb cover) and then call `runHerbEstablishmentStep` in a loop *without* an intervening `runDispersalStep` — a pattern that was safe under the old recompute-every-tick design and is not safe once a guild's HSI is sourced from whatever dispersal saw at construction time. `shrub-arrival` and `crust-arrival` (and the shrub/crust unit tests they mirror) hit this exactly: at construction, `herbBiomass` is still 0, so the cover-facilitation term correctly reads 0, and it never updates — both probes hard-threw (`shrub-arrival: warm shrub too low (0)`). Fixed by adding one `world.runDispersalStep(1)` call, after the scenario's fields are set and before the seed-bank overrides, matching the convention `strand-arrival` / `binder-arrival` already used. `marsh-arrival` and its unit test hit the same missing call but were passing anyway — marsh's HSI inputs (elevation, tide, salinity, temperature) happen to be unchanged between construction and the post-construction field writes in those specific scenarios, so the stale construction-time snapshot was numerically correct by coincidence. Fixed the same way, defensively, so the test exercises the scenario it claims to rather than an accidentally-matching default.

**Baselines.** Twenty-nine of thirty-nine probe baselines moved, in two families:

- **`hashN` only**, the large majority — the five new registered fields shift `FieldRegistry.hashState()` for every scenario, because the hash folds in every field's id string unconditionally, regardless of whether that scenario's cells ever touch it. Same mechanism NS-010 / NS-011 moved 25 baselines each for registering their own new fields (`git show 9ec2351`, `a280ea4`). No named metric besides the hash moved on these.
- **Named metrics, small and one-directional**, on `deep-time`, `disturbance-recovery`, `living-hollow`, `shrub-arrival` — the annual-cadence guild HSI genuinely changes vegetation trajectories that lean on shrub/crust facilitation across many seasonal ticks: a few percent lower mean cover over 100 sim-years, a recovery pulse one day slower to half-life, `shrub-arrival`'s fixed-seed-schedule shrub biomass down about 8%. Every one of these moved a few percent in the direction "the facilitation term stops chasing mid-year growth"; none flipped sign or collapsed to zero, and every hard-`throw` guard already inside those probes (the ones that would catch an actual regression, not just a baseline drift) still passes.

`GOLDEN_DEPTH_HASH` (`hydrology.determinism.test.ts`) is untouched — it hashes only `water.surfaceDepth`, never the field registry.

## Deferred / not touched

- Does not implement **C-023** (guild competition/displacement) — this closes a duplicate-computation and ordering defect in the existing arrival math, not a new competition mechanism.
- No new `Process` registered; D-007 clip gate does not apply.
- Herb's own HSI path (`habitat.suitability`, daily band) is untouched — it was never the duplicate.
