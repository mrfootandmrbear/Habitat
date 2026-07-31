# C-016 — Tidal forcing as a band-appropriate envelope

**Status:** **Locked** 2026-07-30 (owner Lock batch A — Lock all ready)  
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
| Tier-P foreshore tint | encoding Δ ≈ 0.202 (> 0.08) after legibility retune | same + `presentation.proxy.test.ts` |
| Registered inspectable field | `shore.intertidal` | WorldState registry |

## Owner half (Pass — 2026-07-30)

**Question.** When you widened the tide range and watched the shore band, did it feel like a place the sea claims — or like a second clock fighting the fast-forward metaphor?

**Verdict.** Pass via [batch-maritime-shore.md](../playtests/batch-maritime-shore.md) (shared sentence with C-017): after MHW cage ring + foreshore tint, the tide read as the sea claiming the shore — not chrome / a second clock.

## Owner-only question (answered)

When you widened the tide range and watched the shore band, did it feel like a place the sea claims — or like a second clock fighting the fast-forward metaphor?
