# C-019 — Island biogeography reframes the fixed species pool

**Status:** Open (owner-judged half outstanding)  
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

## Owner half (outstanding)

Whether sparse overseas arrival on a small / isolated island still feels earned (C-007) rather than broken or empty by bug.

## Owner-only question (one sentence, no numbers)

When the smaller island stayed emptier than the larger one under the same weather, did that feel like life having farther to come — or like the place was broken?
