# C-015 — The world is an island; sea level is global base level

**Status:** Locked (owner ballot B 2026-07-30 — Supersede W-001 / Lock C-015)  
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

## Owner half (discharged — 2026-07-30)

**Place reading:** Pass ([docs/playtests/batch-island-brief.md](../playtests/batch-island-brief.md)) — island + brief felt like the same sculpt–forces–time loop on a place that reads as an island.

**W-001 supersession:** Owner chose **Supersede W-001 / Lock C-015** ([owner-lock-batch.md](owner-lock-batch.md) ballot B). Island + global sea datum is the canonical preserve reference; Windward Basin remains valid closed-basin / mainland probe mode.
