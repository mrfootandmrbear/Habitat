# C-017 — Wave exposure contributes to geomorphology

**Status:** Open (owner-judged half outstanding)  
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

**Baseline note.** Slice 19 adds `shore.longshore` and lee deposit inside geomorphology; `shore-exposure` scalars refresh (eastLoss negative = lee gain). Non-coastal probe physics unchanged aside from registry fingerprint when island fields are present.

## Owner half (outstanding)

Whether shore change reads as the sea's work (A-005 / C-004). Batched Tier-O — now includes lee spit growth.

## Owner-only question (one sentence, no numbers)

When the windward shore wore back and the lee spit grew, did that feel like the sea working the island — or like a tint the wind painted on?
