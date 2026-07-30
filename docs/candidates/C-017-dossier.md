# C-017 — Wave exposure contributes to geomorphology

**Status:** Open (owner half **Pass** 2026-07-30 — Lock still an owner register act)  
**Criterion (verbatim).** A derived exposure field (fetch × wind) changes shoreline elev/depth only by contributing into the geomorphology owner; no second sediment writer; no SWE solver in-tree. Sheltered vs exposed paired shores diverge under one wind regime; mass of displaced soil closes.

## Machine half (discharged)

### Slice 18 — exposure + retreat

| Claim | Result | Artifact |
|---|---|---|
| Same wind → identical hash | `west.replayMatch = 1` | `docs/evidence/shore-exposure.baseline.json` |
| Opposite winds diverge | `delta.hashDiverged = 1` | same |
| West wind cuts west shore more | westWindwardBias ≈ 0.463 | same (post–Slice 19 refresh) |
| East wind cuts east shore more | eastWindwardBias ≈ 0.477 | same |
| Bedrock / mass close | `bedrockOk = 1` (Δelev = Δdepth) | same + `shoreExposure.test.ts` |
| No second sediment writer | only `geomorphologyProcess` writes elev/depth | `geomorphologyProcess.ts` |
| SWE ban cited | fetch geometry only | `shoreExposure.ts` header; EXTERNAL_REFERENCES |

### Slice 19 — longshore lee deposit

| Claim | Result | Artifact |
|---|---|---|
| Same wind → identical hash | `west.replayMatch = 1` | `docs/evidence/longshore-drift.baseline.json` |
| West wind feeds east vs calm | westLeeGain ≈ 0.333 | same |
| East wind feeds west vs calm | eastLeeGain ≈ 0.331 | same |
| Windward scours vs calm | westWindwardLoss ≈ 0.131 | same |
| Bedrock closed | `bedrockClosed = 1` | same + `longshore.test.ts` |
| Ocean share on ledger | shoreErosion ≈ 4.70 (retain 0.7 on-island) | same |

## Owner half (Pass — 2026-07-30)

**Question.** When the windward shore wore back and the lee spit grew, did that feel like the sea working the island — or like a tint the wind painted on?

**Verdict.** Pass via [batch-maritime-shore.md](../playtests/batch-maritime-shore.md) (shared sentence with C-016): after wind arrow (origin mark) + west-wind run, shore change read as the sea reshaping the island — not painted chrome.

## Owner-only question (answered)

When the windward shore wore back and the lee spit grew, did that feel like the sea working the island — or like a tint the wind painted on?
