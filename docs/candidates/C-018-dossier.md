# C-018 — Salinity as the first mobile legacy substance

**Status:** Open (owner-judged half outstanding)  
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

## Owner half (outstanding)

Whether the viewer reads salt as legacy history blocking arrival (S-008) rather than blaming today's rain.

## Owner-only question (one sentence, no numbers)

When the salty hollow stayed sparse while the freshened twin greened under the same seed rain, did that feel like the ground still tasting of the sea — or like today's weather?
