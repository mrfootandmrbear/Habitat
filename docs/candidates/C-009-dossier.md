# C-009 — Substrate differentiation

**Status:** Open (owner legibility half **Pass** 2026-07-30; Lock still owner)  
**Criterion (verbatim from DECISION_CONFORMANCE).** Two cells differing **only** in material class, under an identical storm and identical slope, produce measurably different outcomes across at least two processes already in the build (e.g. infiltration and erodibility) — and the material properties come from a data table, not from constants embedded in process code (T-004). Owner half: the difference between building in sand and building in clay is noticeable in play without the inspector.

## Machine half (Slice S + geological deposit)

| Claim | Result | Artifact |
|---|---|---|
| Table-driven sand vs clay | sand infilRate and erosionK > clay | `src/sim/terrain/substrates.ts` |
| Rock sheds and resists | rock infil / erosionK < clay < sand | same table; id `3` |
| Paired divergence ≥2 processes | sand infil 56.3 vs clay 6.4; channel loss diverges | probe `substrate-contrast` |
| Deposit raises + stamps | sand vs rock ridges; infil 56.3 vs 0.51 | probe `substrate-deposit` |
| Default-view encoding | dry BASE delta > 0.12 (sand↔clay and sand↔rock) | `substrateEncodingDelta` |
| No new Process | soilWater + geomorphology read material | BUILD_GUIDE §4.17 / D-007 |
| Schema | `soil.material` legacy, SCHEMA_VERSION 8 | `save.ts` |

## Geological setup (not N-001)

Opening siting tools are **geological forces to set up the island** — sandcastle version of volcano / sand deposits. **Tool: deposit** raises elev+depth and stamps `soil.material` (sand / clay / rock). Berm/dig stay pure shape. That is a **cause**, not painting a wetland or ecosystem (N-001). C-009’s earlier “must not become a paint-a-material tool” line meant outcomes, not substrate deposits.

Steal: From Dust matter-as-cause + rock resists / sand erodes — arcade timescales and carry-sphere rejected.

## Owner taste

**Owner-only question:** Did sand and clay feel like different materials to build with?

**Owner 2026-07-30: Pass.** “It definitely reads as two different surfaces.” No inspector. Lock remains an owner register act (Promotion authority: Owner).

Deposit + rock are machine-green under the same candidate; Lock still owner. Not a full D-007 clip substitute — rain-feel (Slice R / C-020) remains a separate sentence if the twenty-second clip still fails on weather.
