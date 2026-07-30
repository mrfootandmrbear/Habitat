# C-016 — Tidal forcing as a band-appropriate envelope

**Status:** Open (owner-judged half outstanding)  
**Criterion (verbatim).** Mean high / mean low water are global scalars; intertidal cells are those with elevation between them; no per-event tidal phase advances the sim. Same envelope → identical hash; widening the envelope grows the intertidal cell count monotonically.

## Machine half (discharged)

| Claim | Result | Artifact |
|---|---|---|
| Same envelope → identical hash | `mean.replayMatch = 1` | `docs/evidence/tidal-envelope.baseline.json` |
| Widening grows intertidal | neap 294 → mean 630 → spring 1206 | same |
| Foreshore frac grows | neap → spring `foreshoreGrew = 1` | same |
| Ocean outlet unchanged by tide | `oceanUnchanged = 1` (1658 cells) | same |
| No phase across `stepEvent` | mask stable over 8 events | `src/sim/tidal.test.ts`, probe |
| API has no cell/place args | `setTidalAmplitude(amp)` / `tideById` | `src/sim/climate/tidalEnvelope.ts` |
| Tier-P foreshore tint | encoding Δ ≈ 0.129 (> 0.08) | `presentation.proxy.test.ts` |
| Registered inspectable field | `shore.intertidal` | WorldState registry |

**Baseline note.** Adding `shore.intertidal` (zeros when envelope off) moved `hashN` / `p005.hashFirstN` on probes that fingerprint full `stateHash`. Physics unchanged — refresh reason: new derived registry field at zero.

## Owner half (outstanding)

Whether a literal tide envelope muddies the thesis metaphor (THESIS §4 "tide" = fast-forward). Batched Tier-O — not fired this slice.

## Owner-only question (one sentence, no numbers)

When you widened the tide range and watched the shore band, did it feel like a place the sea claims — or like a second clock fighting the fast-forward metaphor?
