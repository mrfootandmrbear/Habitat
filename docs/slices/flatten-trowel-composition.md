# Slice §4.56 — Flatten / trowel edit

**Status:** Done — agent  
**Register:** C-006 Locked; C-002 Locked; C-013 Locked; A-005 Locked; **C-028** Open (framing); **C-022** Open (must stay distinct — this is a player edit, not the erosion force dial)  
**New Process?** no — siting tool over elev+depth. D-007 clip gate does not apply.

## Why

C-028 kit: Fine Trowels & Palettes — flatten walls, crisp edges, ramparts. After §4.55's bucket/shovel size tiers, the next structural verb is a player **smooth** that levels toward a local plane inside the brush. Distinct from **C-022** erosion intensity (a Force-panel dial nature applies over time).

## Composition

| Piece | Role |
|---|---|
| `WorldState.flattenTerrain(cx, cz, radius?)` | Mean elev in footprint → each cell moves toward it with berm falloff; depth rides with elev (C-002) |
| `Tool: flatten` | Cause-shaped label; shares bucket/shovel brush size |
| Undo before time | `EditUndoStack` checkpoint on stroke (C-013); cleared when time advances |
| No veg write | Elev/depth/moisture only — same path family as berm/dig (C-006 / N-001) |

## Rejected

C-022 force dial as the smoothing sponge · wet-sand carve physics · freeze spray · min/max terrace modes in this cut (mean is enough for walls/ramparts; modes can wait).

## Tier-M

- Local elev variance drops after flatten (`siting.test.ts`)
- ΣΔelev = ΣΔdepth (C-002)
- Undo restores `stateHash` (C-013)
- No veg write; C-006 100-edit loop includes flatten

## Next-but-one

§4.57 geometric mold stamps (C-028 keep list — pyramid / cylinder form stamps; still elev+depth only). Parallel tip remains §4.46 HSI curve-shape corrections.
