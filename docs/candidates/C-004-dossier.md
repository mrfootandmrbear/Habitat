# C-004 — Force control as an intervention axis

**Status:** Locked (stewardship sitting Pass 2026-07-30)  
**Criterion (verbatim).** A build exists in which the player changes a force regime (not a place) and the world's response is attributable to that change: same seed, same terrain, two regime settings, divergent outcome — plus a stated and enforced boundary that no control targets a location. Owner half: after setting a regime and running time, the player describes what happened as something the world did, not as something they placed.

## Machine half (discharged)

| Claim | Result | Artifact |
|---|---|---|
| Same seed + same regime → identical hash | `light.replayMatch = 1` | `docs/evidence/regime-divergence.baseline.json` |
| Different regime → divergent hash | `delta.hashDiverged = 1` | same |
| Heavy delivers more precip than light | precip Δ ≈ 190.3 | same |
| Regime API has no cell/place arguments | `rainDepthForRegime(regime, base)` only | `src/sim/climate/rainRegime.ts`, `src/sim/rainRegime.test.ts` |
| Control surface is a global select | `Rain: dry \| light \| moderate \| heavy` | `src/ui/controls.ts` |

## Owner half (discharged — stewardship sitting)

**2026-07-30** [batch-stewardship-alive.md](../playtests/batch-stewardship-alive.md) Q-A **Pass:** "felt like island was alive, i wanted to speed it up faster than 16x even." World-did-it reading met. Desire for rates beyond 16× is **product feedback**, not a Hold on Lock.

### Prior related notes (not blocking)

**2026-07-30** batch-living-return: living hollow changed how water moved — enough to want another storm (supports loop; not the verbatim stewardship sentence).

**2026-07-30** island brief / salt-overseas: rain dial worked but felt unnatural / faucet — filed **C-020**. Locked C-004 does not require perfect atmospheric presentation; C-020 remains Open for weather-feel / glitch cleanup.
