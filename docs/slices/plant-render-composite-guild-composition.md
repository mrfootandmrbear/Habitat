# Slice §4.62 — Plant rendering: composite runner-up guild composition

**Cited:** [plant-rendering-review](../reviews/2026-08-03-plant-rendering-review.md) §2b / §3 item 3; ART-003 Locked; T-006 Locked. Does **not** reopen **C-023** (guild competition) — this composites biomass fields that already coexist; it does not simulate displacement.

## What was actually wrong

Even after §4.60 (per-guild silhouettes) and §4.61 (per-cell clustering), `OccupantMesh.updateFrom` still picked a single arg-max guild per cell and discarded the other five. A shrub cell with real herb understory drew only the shrub shape — mixed stands the HSI/dispersal model produces never composite visually.

## What shipped

Presentation only — still zero `WorldState` writes (T-006), same fields `OccupantMesh` already read.

| Piece | Change |
|---|---|
| `OccupantMesh.ts` | `pickWinnerAndRunnerUp` selects the highest-visibility guild (same priority tie-break as the old if-chain: shrub > marsh > strand > binder > crust > herb) and the second-highest when its `shootVisibility` clears the existing floor. Winner still draws 2–4 clustered sub-instances at full scale; runner-up draws 1–2 sub-instances at `RUNNER_UP_SCALE = 0.42` with a disjoint hash salt so offsets never coincide with the winner's |
| `OccupantMesh.ts` | Placement logic extracted to `placeGuildCluster` so winner and runner-up share one code path (sway, tint, clustering jitter) |

No new `WorldState` field, no new `Process`, no change to biomass or competition law.

## Regression tests

`presentation.proxy.test.ts`:

- "mixed stand: runner-up guild contributes instances when both clear visibility floor (§4.62)" — one synthetic cell with shrub + herb above floor produces non-zero counts on **both** guild meshes, and every instance sits inside that cell's footprint (±0.4 cellW).
- "mixed stand: runner-up below visibility floor contributes nothing (§4.62)" — second guild under `shootVisibility`'s 0.008 normalized threshold adds zero instances.
- Clustering determinism test now asserts hash-identity for **both** herb (winner) and shrub (runner-up) when both are seeded above floor — previously shrub was expected empty because arg-max discarded it.

## Timing (Tier-M smoke)

`OccupantMesh.updateFrom` at `config.gridSize` (96×96) with every cell dual-occupied (herb + strand fill — worst case for composite): **58.17ms** under the full test suite load (isolated re-run earlier measured **32.23ms**). Still under the 500ms smoke bound. Dual fill is denser than a real mixed-stand landscape; this number is the profiling signal §4.63's gate asked for — LOD stays deferred, not invented early.

## What moved

**Nothing authoritative.** No probe baseline, no `GOLDEN_*` hash.

## Deferred

- §4.63 distance silhouette LOD — still gated on profiling; the 32ms worst-case dual-fill number above is the first post-§4.62 measurement to revisit against, not a license to start LOD in this commit.
