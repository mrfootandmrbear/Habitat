# Slice §4.55 — Sculpt brush size (bucket / shovel)

**Status:** Done — agent  
**Register:** C-006 Locked; C-002 Locked; C-013 Locked; A-005 Locked; **C-028** Open (framing — structural first cut)  
**New Process?** no — UI + brush radius on existing berm/dig/deposit. D-007 clip gate does not apply.

## Why

Owner sand-castle kit ([C-028-framing.md](../candidates/C-028-framing.md)) named the Trusty Bucket and Heavy Shovel as the first structural tools. §4.54 left "terrain-tools feel" as next-but-one. One fixed `sitingBrushRadius: 4` could not express fine towers vs mass trenches.

## Composition

| Piece | Role |
|---|---|
| `config.sitingBrushRadii.{bucket,shovel}` | 4 / 8 cell-radius tiers; `sitingBrushRadius` stays bucket default |
| `WorldState.raiseBerm/digChannel/depositSubstrate(..., radius)` | Optional radius; default unchanged for tests / ignite |
| `Brush: bucket` / `Brush: shovel` select | Cause-shaped labels; no edit budget |
| `SitingCursor.setBrushRadius` | Preview footprint tracks the active tier |

## Rejected

Wet-sand watering can · freeze spray · placeable figurines · carving needles · edit cost on shovel strokes (C-006).

## Tier-M

- Shovel touches more cells than bucket (`siting.test.ts`)
- Shovel ΣΔelev = ΣΔdepth (C-002)
- Existing C-006 / C-013 tests unchanged (default radius = bucket)

## Next-but-one

§4.56 flatten / trowel edit (player smooth, not C-022 force). Parallel tip remains §4.46 HSI curves.
