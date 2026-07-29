# C-002 — GEO-002 spatial cost test (dossier)

**Criterion (verbatim).** Documented spatial rule (pools everywhere vs geomorphology near-channel / high-A only) matches the running `geomorphologyProcess`, with a Tier-M test that high-A cells erode under bare cover more than low-A cells, and production still runs on low-A cells.

**Judge.** CI + short register review (ratify Slice 8 reading or supersede). **Promotion authority: owner.**

## Machine half (discharged)

- High-A bare channel erodes more than vegetated: `src/sim/geomorphology.test.ts` (“bare channel erodes more than vegetated channel”).
- Production runs on low-A / thin soil: same file (“thin soil produces faster than deep soil”, “production raises elev and depth together”).
- Rule named in SIMULATION_MODEL / BUILD_GUIDE: channel-style erosion where accumulation ≥ `erosionMinAccumulation`; production everywhere.

## Related Tier-M (not the criterion, but same C-002 / GEO-002 citation in the build plan)

Player berm/dig now moves `soil.depth` with elevation (THESIS §2.1; snowflow steal). Tests: `src/sim/siting.test.ts` — per-cell and brush-sum Δelev = Δdepth; bedrock invariant.

## Owner-only question

Does the written near-channel erosion rule match the geomorphology you want Locked as policy, or should a different spatial cost test supersede it?
