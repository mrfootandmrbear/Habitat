# C-019 — Island biogeography reframes the fixed species pool

**Status:** Open (owner half **Pass** 2026-07-30 — Lock still an owner register act)  
**Criterion (verbatim).** Overseas seed pressure replaces mainland-perimeter rain on island worlds; smaller island area (or greater isolation) yields lower eligible richness / establishment under identical regimes; W-003's curated catalogue remains the universe of types. Deterministic under T-001.

## Machine half (discharged)

| Claim | Result | Artifact |
|---|---|---|
| Large vs small land | land 316 vs 52; S_elig ≈ 0.349 vs 0.151; biomass ≈ 1.883 vs 1.071 | `docs/evidence/island-arrival.baseline.json` |
| Biomass / S_elig deltas | biomassDelta ≈ 0.812; sEligDelta ≈ 0.198 | same |
| Near vs far isolation | nearBiomass ≈ 2.157 > farBiomass ≈ 0.542; isolationDelta ≈ 1.615 | same |
| Not perimeter rain | `small.notPerimeter = 1`; `oceanSeedZero = 1` | same + `islandArrival.test.ts` |
| Same seed → identical hash | `delta.replayMatch = 1` | same |
| Mainland perimeter preserved | no-seaLevel worlds still use `seedPressureAt` | `islandArrival.test.ts` / arrival-earned baseline unchanged |

**Baseline note.** Overseas seed bank at boot refreshes `hashN` on island probes that fingerprint full `stateHash` (`island-drainage`, `tidal-envelope`, `shore-exposure`, `longshore-drift`). Physics scalars on those probes unchanged aside from the registry fingerprint / timing noise.

**Steal.** MacArthur–Wilson + new-island succession (EXTERNAL_REFERENCES) → `docs/slices/21-composition.md`; rejected species simulator, equilibrium paint, random spawn, mangrove-default, perimeter-as-island-default (**C-019**).

## Owner half (Pass — 2026-07-30)

Whether sparse overseas arrival still feels earned (C-007) rather than broken or empty by bug — answered on the **default island** via shore-fringe vs interior (no twin reload).

**Tier-P (default view).** Overseas shore fringe occupant encoding vs interior — Δ ≈ 0.087 (> 0.08); `presentation.proxy.test.ts`. Early-shoot visibility + per-instance biomass color on `OccupantMesh`.

**Verdict.** Pass via [batch-salt-overseas.md](../playtests/batch-salt-overseas.md) Question B under the same sitting as C-018.

## Owner-only question (answered)

When shoots took first along the shore and the island interior stayed emptier under the same weather, did that feel like life having farther to come — or like the place was broken?
