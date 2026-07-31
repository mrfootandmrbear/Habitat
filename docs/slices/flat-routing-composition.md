# Drainage flat-routing correctness composition

**Cited:** [hydrology/geomorphology review](../reviews/2026-07-31-hydrology-geomorphology-review.md) §1; Barnes, Lehman & Mulla (2014) §4 (priority-flood + flat resolution); GEO-001 Locked; T-001 Locked; §2.1 Symmetry invariant class.

## Root cause was narrower than the review's own suggested fix

The review's leading suggestion was an ε increment on `priorityFloodFill` so filled surfaces are no longer exact flats. The actual defect is one level down: `computeD8FlowDirection`'s flat tie-break picked the lowest-index neighbor among ties, which provably 2-cycles on the rim of *any* flat — epsilon or not, two adjacent rim cells can still tie on their best real neighbor and point at each other. Adding epsilon would have narrowed how often a flat occurs without fixing what happens when one does. Fixed at the actual fault line instead: flats are now routed by distance-to-pour-point (a second multi-source BFS, `computeFlatPourDistance`), which cannot cycle because the distance strictly decreases along every flat edge taken. `priorityFloodFill` itself is untouched — still an exact fill — and its doc comment, which claimed an "ε-style spill" that was never implemented, now says what the function actually does.

## The open-boundary set had to be threaded through, not guessed

`computeFlatPourDistance` needs to know which cells can act as a pour point outright (the ones `priorityFloodFill` was seeded with — the perimeter ring by default, or `oceanCells` under C-015) versus which cells merely have a genuinely lower neighbor. The first implementation used "touches the grid edge" as a stand-in for "is open," which silently reached past this slice's scope into §4.51's question (what the open-boundary/base-level model actually is) and produced a measurable regression: 1,396 land-adjacent sinks on the default island where there should be a small handful of real minima. The real-terrain regression test in `flow-structure.test.ts` caught this before it shipped. Fix: thread the same `openBoundary` set through as an optional parameter, defaulting to the old edge-based behavior only when the caller passes nothing (`WorldState.ts` passes `oceanCells` when non-empty). This keeps the slice's actual claim — flats drain toward whichever cells are already open, however "open" ends up being defined — decoupled from deciding what "open" means.

## Why this shows up as GEO-001 / Symmetry, not just a bug

The old tie-break's dependence on raw cell index is exactly the class §2.1 calls **Symmetry** (update-order / index-order bias): two hydrologically identical flats that happen to be numbered differently could drain differently, and a flat's own drainage direction was an artifact of scan order rather than of the terrain. GEO-001 (geology precedes ecology) is Locked because the corrupted `aNorm` this produced feeds hillslope erosion forcing and the groundwater channel boost directly — every substrate/ecology field downstream of drainage was inheriting an artifact, not terrain.

## What moved, and why that's expected

`aNorm`-downstream probes moved: `berm-reroute`, `hillslope-deposit`, `erosion-intensity`, `baseflow-persist`, `deep-time`, `disturbance-recovery`, `orographic-wind`. This is the fix working, not a regression — channels that used to terminate inside filled lakes now continue through the spill, which changes accumulated area everywhere downstream of a depression. `priorityFloodFill`'s own exact-value fixture tests are unmodified, since the numeric fill itself did not change.

## Deferred

- The open-boundary/base-level question itself (what counts as "open" beyond the perimeter ring and ocean cells) is §4.51's, not this slice's — this fix only threads whichever set already exists through to flat routing.
- No new probe scenario was added; the fix is covered by unit + regression tests in `flow-structure.test.ts` and by the existing probes it moved.
