# C5 — Camera framing composition

**Cited:** [VISUAL_UPGRADE_NOTE.md](../VISUAL_UPGRADE_NOTE.md) bar v2 point 12; [reference/OBSERVATIONS.md](../reference/OBSERVATIONS.md) — "Camera framing — every reference looks down steeply and fills the frame with world," owner-ruled in scope 2026-08-04.

## What was actually wrong

The default camera (`Scene.ts`'s `cameraHome`) sat at `(32, 28, 36)` looking at `(0, 3, 0)` — a pitch of ~27.4° below horizontal at a distance of ~54 units from the target, against a world size of 48. Every routed reference (`godus-wide-island.jpg`, `planet-coaster-terrain.png`) shows a much closer, steeper view: the island fills nearly the whole frame, sky is a thin strip at most (often none at all in the top-down references), and land/water detail dominates. Habitat's old framing read as an overview shot — the island occupied a modest fraction of frame, surrounded by a lot of open ocean and (before C0's sea-to-horizon fix) empty sky.

## What shipped

`Scene.ts`: `cameraHome` moved from `(32, 28, 36)` to `(18, 27, 20)` — same azimuth direction, distance from target reduced from ~54 to ~36, pitch increased from ~27.4° to ~42°. `cameraTarget` and the camera's FOV (50°) are unchanged. `OrbitControls`' `maxPolarAngle` is unchanged — this only moves the *default* view on load; the player can still orbit freely.

The sky-lighting calibration (`lightingRig.ts`'s `viewDirection`) is untouched by this change in the sense that no new code was needed — it already derives dynamically from `cameraTarget.sub(cameraHome)` at startup, so it automatically recalibrates against the new framing rather than carrying a stale anchor.

## Side effect found and handled: the shot harness's default probes went stale

`scripts/shot.ts`'s `DEFAULT_PROBES` were coordinates tuned to the *old* camera framing (its own comment already warned: "If the camera moves, re-aim them"). After this change, `shelf-shallow`'s old coordinate landed on dry land (measured a warm brown, not cyan — the tell). Re-scanned probe values across the new frame the same way the original set was built, and replaced all four coordinates. See `shot.ts`'s updated comment for the new positions and why.

## Verification against the piece this could regress

A camera reframe changes what's *visible* in frame, which put C3's already-critic-confirmed water depth-banding (bar v2 points 6-8) at risk of a silent regression — exactly the class of risk the gauntlet-loop skill's Step 6 warns about ("re-verify the whole" after a change that touches shared framing). Checked directly:

- A single fixed horizontal scan line at first suggested a flatter gradient than before (saturation trending down as the scan approached shore, rather than peaking at a "shallow" band) — but this turned out to be an artifact of scanning perpendicular to the depth gradient's actual orientation under the new angle, not a real regression. Direct visual inspection of a crop spanning shore-to-horizon (`detail-water-gradient.png`) shows the expected gradient clearly: pale shore foam → bright turquoise shallow → mid teal → dark saturated blue at the horizon.
- One clipping trap encountered and worked around while re-aiming probes: `RENDER_NOTES.md`'s documented ACES cyan-clips-red-to-zero behavior showed up at a couple of near-corner candidate coordinates (measured red channel ~1-12 against green/blue ~85-120, producing meaningless blue/red ratios in the tens). Not a new bug — moved the probe points to avoid the clip-prone corner rather than "fixing" ACES.

## Round 1 critique: bare-pass, one concrete gap

Fresh critic, no prior context: **water-banding regression check — PASS, no regression** ("4 legible steps... shallow water near shore is the most saturated/vivid thing in the crop, getting darker and more muted toward the horizon"). **Framing — BARE-PASS**: pitch confirmed correct ("steep aerial view consistent with the 40-50°+ range in the references... frame is 100% world"), but measured "roughly 40% of the frame's width is still open sea flanking the island" against references that "push the landform to the frame edges with only slivers of water/sky visible."

## Round 2: tightened further

Same pitch (~42°) and azimuth, distance reduced again from ~36 to ~30 (`cameraHome` → `(15, 23, 16.6)`). `scripts/shot.ts`'s probes went stale a second time for the same reason as round 1 (the round-1 coordinates had drifted onto land by round 2) and were re-aimed again.

**A tooling bug found and fixed while re-shooting for this round:** the detail crops sent to round 1's critic were mis-targeted — `sips --cropOffset` takes `(Y, X)` (row-offset, column-offset), not `(X, Y)`. The round-1 `detail-shore-close.png` crop, built with the arguments swapped, landed almost entirely inside the dev UI overlay panel — which is exactly what the round-1 critic reported ("almost entirely occluded... contributes nothing to this check"). That report was itself the tell that exposed the bug. `detail-water-gradient.png` in round 1 happened to still be roughly on-target by luck of the specific offsets chosen, so that finding stands; round 2's crops are re-verified by eye before sending, not just trusted from the command.

## What moved

**Nothing authoritative.** No probe baseline, no `GOLDEN_*` hash, no `WorldState` change — this is pure camera placement in `Scene.ts`, verified by `npm run gate`-equivalent (546/546 tests, clean typecheck/build, full probe suite green — none of which reference camera position).
