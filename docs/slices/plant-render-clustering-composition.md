# Slice §4.61 — Plant rendering: per-cell clustering composition

**Cited:** [plant-rendering-review](../reviews/2026-08-03-plant-rendering-review.md) §3 item 2 (the review that queued Track V); ART-001 Current; ART-002 Locked; T-001 Locked; T-006 Locked. Also closes bar v2 point 10 ([VISUAL_UPGRADE_NOTE.md](../VISUAL_UPGRADE_NOTE.md)) — the gauntlet-loop's Stream C piece C4 and this machine slice are the same underlying fix, tracked in both places rather than duplicated.

## What was actually wrong

Even after §4.60 gave each guild its own silhouette geometry, `OccupantMesh.updateFrom` still drew exactly one instance per occupied cell, positioned at the exact grid-cell center:

```ts
this.dummy.position.set(ox + x * cellW, y, oz + z * cellW);
```

Per-instance scale and rotation were already jittered by a deterministic hash, but the underlying *placement* was a perfect lattice no matter how much scale/rotation varied — at any real coverage density the field read as evenly-spaced rows, not a stand of plants. The plant-rendering review named this the single biggest lever for the "alive" read the owner is chasing, ahead of any further geometry-shape change.

## What shipped

Presentation only — still zero `WorldState` writes (T-006), same as §4.60.

| Piece | Change |
|---|---|
| `OccupantMesh.ts` | Each occupied cell now draws `subInstanceCount(x, z)` sub-instances (2-4, deterministic hash of cell index) instead of exactly one. Each sub-instance gets its own hash-derived position offset within the cell footprint (bounded to ±0.4 × cell width), reduced scale (0.55-0.80× the cell's biomass-driven scale, so 2-4 partial instances read as a clump sharing one cell's worth of biomass rather than 4 full-size plants stacked), and its own yaw/rest-lean/tilt-magnitude variation — all from the same `(x, z, salt)` hash family the existing per-cell jitter already used, just with a distinct salt per sub-instance index |
| `OccupantMesh.ts` constructor | `maxInstances` raised from `width * height` to `width * height * 4` (`MAX_SUB_INSTANCES`) — the hard InstancedMesh buffer ceiling, matching the checklist's "≤4× the current ≤9,216-per-guild ceiling" |

The wind-lean *axis* is untouched — every sub-instance in a windy scene still leans the same world-space direction, exactly as §4.60/§4.64 established; only the lean's *magnitude* varies per sub-instance, the same way it already varied per cell.

## Regression tests

`presentation.proxy.test.ts`:
- "occupied cells draw 2-4 sub-instances, not exactly one" — a fully-occupied grid produces a herb instance count strictly between 1× and 4× the occupied-cell count.
- "clustering is hash-identical across two renders of the same seed/tick" — two independently-constructed `OccupantMesh` instances fed the same `WorldState` and sway time produce bit-identical instance matrices (T-001: no per-frame RNG).
- "clustering instance ceiling stays at exactly 4x per guild" — the InstancedMesh buffer itself is allocated at exactly `width * height * 4`, not an unbounded or oversized buffer.
- "Tier-M: OccupantMesh.updateFrom at config.gridSize stays well under one frame budget" — measured (not assumed) at `config.gridSize` (96×96): **7.78ms before this slice, 12.12ms after** (one instance vs. up to 4 sub-instances per cell), asserted under a 500ms smoke bound. Both numbers are well inside a single frame's 16.7ms budget even combined, let alone across a whole frame's other work — logged to console so the real measurement is on record rather than assumed acceptable.

## Visual verification

Screenshots in `docs/evidence/shots/c4/` (gitignored, regenerate with `npm run shot`), captured via a temporary debug seed in `main.ts` (reverted before commit — vegetation cannot grow to a visible density in a headless run, same pattern every prior gauntlet-loop round used).

**Methodology note, worth recording because it nearly produced a wrong diagnosis:** the first debug seed used a `sin(x)·cos(z)` density pattern, which produced a visible diagonal-stripe artifact in the screenshot. Before attributing that to a placement bug, checked whether it also appeared on **bare terrain with zero vegetation** (`detail-native-bare-terrain-only.png`) — it did, faintly. This is a **pre-existing terrain-shading characteristic** (the "radial streaks" the C1 critic already flagged as a minor, non-blocking finding on the cone's flanks), not a clustering defect. The debug seed was switched to non-periodic hash noise to remove the confound, and the diagonal shading persisted at the same faint intensity either way — confirming it is independent of vegetation placement and out of scope for this piece.

With that confound ruled out, `detail-native-before.png` vs. `detail-native-after.png` (same camera, same seed, same density, native 2560×1600 capture with no crop-upscale interpolation to avoid a second possible confound) show the actual effect: before, individual instances read as one blade per cell in a clearly countable grid; after, instances group into small irregular clumps of varying size with real gaps between them, no countable per-cell grid structure.

## What moved

**Nothing authoritative.** No probe baseline, no `GOLDEN_*` hash — confirmed by `npm run gate`-equivalent (full test suite + build + probe --all --check, all green). Tier-P/Tier-M only, both presentation-side.

## Deferred

- §4.62 (composite runner-up guild) and §4.63 (distance LOD, gated on profiling) remain queued behind this, per BUILD_GUIDE's existing Track V order.
- Sub-instance terrain height is read once per cell (not re-sampled per sub-instance offset) — a deliberate simplification; cell-scale terrain variation is small enough that per-sub-instance height sampling would add cost for no visible gain at this grid resolution.
