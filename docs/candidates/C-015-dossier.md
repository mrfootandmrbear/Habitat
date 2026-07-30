# C-015 — The world is an island; sea level is global base level

**Status:** Open (owner-judged half outstanding — W-001 supersession)  
**Criterion (verbatim).** With `seaLevel` set, surface water leaves through ocean cells into `ledger.oceanExchange` (not perimeter-minima outlets); mass balance closes (H-004); same seed + same sea level → identical hash; different sea level → divergent shoreline / wet fraction. Sea-level API has no cell/place arguments. Priority-Flood seeds from ocean cells. Existing probes without `seaLevel` keep prior baselines and golden hashes.

## Machine half (discharged — Slice 16)

| Claim | Result | Artifact |
|---|---|---|
| Ocean exchange > 0 under rain | mid.oceanExchange ≈ 921 | `docs/evidence/island-drainage.baseline.json` |
| H-004 relative residual | < 1e-4 (`conserved = 1`) | same |
| Same seed + sea → identical hash | `replayMatch = 1` | same |
| Higher sea → more ocean cells | `oceanCellDelta > 0` | same |
| Habitat mosaic proxy | `habitatZones ≥ 3` | same |
| No cell targeting on sea dial | `setSeaLevel(level)` / `seaLevelById` only | `src/sim/climate/seaLevel.ts`, `src/ui/controls.ts` |
| GOLDEN_DEPTH_HASH unchanged | `741f6f52` | `hydrology.determinism.test.ts` |
| Opt-in: absent seaLevel = legacy outlets | island.test | `src/sim/island.test.ts` |
| Tier-P ocean–land encoding | color distance > 0.15 | `presentation.proxy.test.ts` |

**Baseline note.** Adding `ledger.oceanExchange` to the registry changed full `stateHash` fingerprints for worlds that never set sea level. Depth golden hash unchanged. `deep-time`, `regime-divergence`, and `burn-recover` baselines refreshed for `hashN` / `p005.hashFirstN` only — reason: new registry ledger field at zero; physics unchanged.

## Owner half (outstanding)

**W-001** (Windward Basin, Current) supersession is a register act. Also: does the island read as a place worth tending (THESIS §8 / C-012)?

## Owner-only question

On the island, did accepting a brief feel like a reason to run the same sculpt–forces–time loop — or like a different game?

*(Batched in [docs/playtests/batch-island-brief.md](../playtests/batch-island-brief.md).)*
