# Slice §4.57 — Geometric mold stamps

**Status:** Done — agent
**Register:** C-006 Locked; C-002 Locked; C-013 Locked; A-005 Locked; **C-028** Open (framing — structural); **C-009** Locked (deposit stays a separate path — molds are shape-only)
**New Process?** no — one-shot siting tool over elev+depth. D-007 clip gate does not apply.

## Why

C-028 kit keep list (framing §1): **Geometric molds** (pyramid, star fort, cylinder) — one-shot **form stamps** that raise/lower elevation(+depth) in a fixed footprint. After §4.55 brush size and §4.56 flatten/trowel, the next structural verb multiplies *forms*, not an edit budget (C-006). A mold sites a terrain **cause** (A-005) — a recognizable rampart / mound / cylinder — never Townscaper building paint and never placed ecology (N-001).

## Composition

| Piece | Role |
|---|---|
| `moldProfileWeight(shape, dx, dz, r)` (`config.ts`) | Relative profile weight in [0, 1] per footprint offset. `cylinder` = round flat-top disc (Euclidean); `terrace` = square flat-top mesa (Chebyshev); `pyramid` = square base tapering linearly to a central peak |
| `WorldState.stampMold(cx, cz, shape, height?, radius?)` | Applies `height · weight` as a signed elev delta; depth rides with elev (C-002); same clamp family as berm/dig; no material, no veg |
| `Tool: mold` + Mold-shape select | Cause-shaped labels ("Mold: cylinder mound" …); fixed mold radius (`config.moldRadius`), not the brush tier — a mold is a fixed form |
| Undo before time | `EditUndoStack` checkpoint on stroke (C-013); cleared when time advances |
| No veg write | Elev / depth / moisture only — same path family as berm / dig / flatten (C-006 / N-001) |
| Deposit stays separate | Molds are shape-only; geological material remains on `depositSubstrate` (C-009). Optional material would reuse that path, never default mold behavior |

## Rejected

Townscaper / finished-building paint · copying vegetation or water as a finished habitat · an edit budget / cooldown on stamps (C-006) · freeze-against-nature · wet-sand carve physics · carving-needle facade detail at ~10 m cells (C-012) · material as default mold behavior (C-009 deposit stays its own tool).

## Tier-M

- Cylinder stamp raises a known Euclidean disc by exactly `moldHeight` (flat top); a cell just outside the footprint is untouched (`siting.test.ts`)
- Negative height lowers the footprint (raise/lower both proven)
- Pyramid peaks at center (`center Δ > edge Δ > 0`); terrace raises the far Chebyshev corner the cylinder never reaches — distinct footprints
- ΣΔelev = ΣΔdepth within 1e-4 (per-cell exact; summed residual is Float32Array rounding ≈6e-6, C-002)
- Undo restores `stateHash` (C-013)
- 20 mixed-shape stamps write no vegetation; C-006 loop extended to 120 berm/dig/deposit/flatten/mold edits with no veg write

No `GOLDEN_*` hash or probe baseline moved — this adds a new player verb, it does not change any Process.

## Next-but-one

**Duplicator stamp** (C-028 keep list, "Sandbox magic") — specified to §4.3 depth in [BUILD_GUIDE §4.59](../BUILD_GUIDE.md). Copy `elev(+depth)[+material]` from a source footprint and stamp it elsewhere; **never** copy vegetation, water, or suitability as a finished habitat. Still form-only under Locked C-006 / A-005; material only via the existing C-009 deposit path.

Parallel tip remains §4.47 guild cover & light-competition correctness.
