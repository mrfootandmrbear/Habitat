# C-018 — Salinity as the first mobile legacy substance

**Status:** Open (owner half **Pass** 2026-07-30 — Lock still an owner register act)  
**Criterion (verbatim).** One salinity field sources at the ocean boundary, dilutes with freshwater, is save-legacy, and gates HSI / arrival so a salty hollow earns less (or different) occupancy than a freshened twin under one seed schedule. No player cleanup tool. Water-balance residual class unchanged.

## Machine half (discharged)

| Claim | Result | Artifact |
|---|---|---|
| Freshened HSI / biomass | hsi = 1, biomass = 2.5 | `docs/evidence/salinity-arrival.baseline.json` |
| Salty twin salt-limited | limiting = 3, hsi ≈ 0.15, biomass ≈ 0.375 | same |
| Biomass / HSI divergence | biomassDelta ≈ 2.125, hsiDelta ≈ 0.85 | same |
| Same seed → identical hash | `delta.replayMatch = 1` | same |
| Residual class unchanged | `delta.residualMatch = 1` (twins match; no salt ledger) | same + `salinity.test.ts` |
| Ocean shoreline source | shore S → >0.5 after 12 daily bands; interior ≈ 0 | `salinity.test.ts` |
| Freshwater dilution | infiltrate lowers S; residual class stable | `salinity.test.ts` |
| Save-legacy round-trip | omit `soil.salinity` → SaveError; round-trip restores | `salinity.test.ts` / `save.ts` schema 7 |
| No cleanup tool | no player desalinate API | process surface |

**Baseline note.** Registering legacy `soil.salinity` (default 0) refreshes `hashN` / `p005.hashFirstN` on probes that fingerprint full `stateHash`. Physics scalars on non-coastal probes unchanged aside from the registry fingerprint.

**Steal.** Coastal salinity / freshening (EXTERNAL_REFERENCES) → `docs/slices/20-composition.md`; rejected player cleanup, second salt ledger, salt-as-mangrove-only (**C-018**).

## Owner half (Pass — 2026-07-30)

Whether the viewer reads salt as legacy history blocking arrival (S-008) rather than blaming today's rain.

**Tier-P (default view).** Salt crust tint / green washout without Inspect — `salinityEncodingDelta` ≈ 0.524 (> 0.08); `presentation.proxy.test.ts`. Wired in `defaultTerrainRgb` + `TerrainMesh`.

**Verdict.** Pass via [batch-salt-overseas.md](../playtests/batch-salt-overseas.md) Question A under **Rainfall: moderate** / **Sea: mid** / **View: terrain**.

## Owner-only question (answered)

When the pale shore stayed sparse while inland greened under the same rain, did that feel like the ground still tasting of the sea — or like today's weather?
