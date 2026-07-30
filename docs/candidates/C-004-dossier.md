# C-004 — Force control as an intervention axis

**Status:** Open (owner-judged half outstanding)  
**Criterion (verbatim).** A build exists in which the player changes a force regime (not a place) and the world's response is attributable to that change: same seed, same terrain, two regime settings, divergent outcome — plus a stated and enforced boundary that no control targets a location. Owner half: after setting a regime and running time, the player describes what happened as something the world did, not as something they placed.

## Machine half (discharged)

| Claim | Result | Artifact |
|---|---|---|
| Same seed + same regime → identical hash | `light.replayMatch = 1` | `docs/evidence/regime-divergence.baseline.json` |
| Different regime → divergent hash | `delta.hashDiverged = 1` | same |
| Heavy delivers more precip than light | precip Δ ≈ 190.3 | same |
| Regime API has no cell/place arguments | `rainDepthForRegime(regime, base)` only | `src/sim/climate/rainRegime.ts`, `src/sim/rainRegime.test.ts` |
| Control surface is a global select | `Rain: dry \| light \| moderate \| heavy` | `src/ui/controls.ts` |

## Owner-only question

After you set the rainfall regime and ran time, did what happened feel like something the world did — or like something you placed?

(Not a playtest request by itself; joins the Slice 8c Tier-O batch.)
