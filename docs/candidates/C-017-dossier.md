# C-017 — Wave exposure contributes to geomorphology

**Status:** Open (owner-judged half outstanding)  
**Criterion (verbatim).** A derived exposure field (fetch × wind) changes shoreline elev/depth only by contributing into the geomorphology owner; no second sediment writer; no SWE solver in-tree. Sheltered vs exposed paired shores diverge under one wind regime; mass of displaced soil closes.

## Machine half (discharged)

| Claim | Result | Artifact |
|---|---|---|
| Same wind → identical hash | `west.replayMatch = 1` | `docs/evidence/shore-exposure.baseline.json` |
| Opposite winds diverge | `delta.hashDiverged = 1` | same |
| West wind cuts west shore more | westLoss − eastLoss ≈ 0.122 | same |
| East wind cuts east shore more | eastWindwardBias ≈ 0.137 | same |
| Bedrock / mass close | `bedrockOk = 1` (Δelev = Δdepth) | same + `shoreExposure.test.ts` |
| No second sediment writer | only `geomorphologyProcess` writes elev/depth | `geomorphologyProcess.ts` |
| SWE ban cited | fetch geometry only | `shoreExposure.ts` header; EXTERNAL_REFERENCES |

**Baseline note.** New `shore.exposure` + `ledger.shoreErosion` registry fields move `hashN` on full-state fingerprints; physics of non-coastal probes unchanged.

## Owner half (outstanding)

Whether shore change reads as the sea's work (A-005 / C-004). Batched Tier-O.

## Owner-only question (one sentence, no numbers)

When the windward shore wore back and the lee held, did that feel like the sea working the island — or like a tint the wind painted on?
