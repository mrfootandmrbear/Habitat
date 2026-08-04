# Visual Upgrade Note — 2026-08-03

> **Status:** AI-driven departure, direct owner instruction, logged here rather than run through the normal Decision Register / slice process.
> **Scope:** Rendering only — lighting, materials, shading, water, sky/atmosphere, vegetation instancing, post-processing, adaptive quality tiers. No simulation model, gameplay, or ecological-logic changes.

## What changed and why

Owner instruction (2026-08-03): push Habitat's rendering fidelity toward AAA-grade production polish — shadows, PBR materials, image-based lighting, a real water shader, post-processing, better atmosphere — while keeping Habitat's existing naturalistic look (not a stylized/cartoon departure) and keeping **no humans** in the scene, consistent with the existing design.

This was explicitly authorized as an override of the normal build process for this initiative. It is recorded here, in one place, so it's visible and reversible rather than silently bypassing how the rest of the repo tracks decisions.

## What did not change

- `defaultTerrainRgb` / substrate / moisture / vegetation-cover / fire-scar / salinity color logic (`ui/terrainEncoding.ts`, `sim/terrain/substrates.ts`) — the simulation-driven color mapping that both the GPU and CPU inspector paths render is untouched. Only the shading (lighting, roughness, normal detail, shadows, post-fx) around that data changed.
- No new simulation `Process`, no new substrate/material types, no invented forces (C-011 still holds).
- No gameplay, UI, or control changes.

## The bar (gauntlet loop)

This environment can't fetch live reference images (outbound web access is
blocked at the network-policy level for arbitrary sites, confirmed
2026-08-03 — not a judgment call, a hard proxy denial). So the bar isn't a
blind comparison against real Godus screenshots; it's a written rubric a
critic scores against an actual screenshot, cold, no context. Twelve
checkable points:

1. Terrain shows visible ambient occlusion in creases/hollows/channel cuts — no flat, uniformly-lit patches.
2. Substrate materials read as physically distinct (wet sand vs. dry rock vs. vegetated soil), not just flat-color-different.
3. Shadows are soft and grounded under any raised relief or vegetation — no acne, no peter-panning gap.
4. Water reflects sky/terrain above it — not a flat unlit color plane.
5. Shoreline has visible foam/blend, not a hard color cutoff.
6. Sky/atmosphere reads as a coherent gradient with sun glow — no banding, no hard dome seams, haze matches fog.
7. Clouds read as soft volumetric masses, not flat matte spheres.
8. Vegetation instances read as individual plants with shape/shading variation, not identical uniform cones.
9. Vegetation grounds to the terrain with at least soft shadow contact.
10. Bright highlights bloom subtly; no clipped pure-white or pure-black regions.
11. One coherent color palette across terrain/water/sky — no clashing saturation or color temperature between elements.
12. Cold read, no context: would a critic call this "someone spent real production time on this," not "a working prototype"?

A piece's critic scores its screenshot against whichever points apply to
that piece and names the single biggest remaining gap each round.

## Round 1 status (2026-08-03)

Four pieces (terrain material, water/ocean, sky/atmosphere, vegetation)
were fanned out as parallel worktree-isolated builders. All four were
**terminated mid-round by the account's monthly API spend limit**, not by
completing their work normally. The fifth piece (wildlife) never got past
initial research before being cut off — no code was produced there.

Recovery: all four terminated builders' uncommitted diffs typechecked
clean and passed the full 508-test suite untouched, so the partial work
was kept rather than discarded. Integrating all four onto the current
foundation surfaced two real regressions from working on stale branches
(their worktrees predated the Phase 0 foundation commit), fixed directly
rather than by re-running agents:

- **Water/ocean read as near-black.** Both shaders hardcoded the *old*
  Scene.ts sun direction/sky-horizon color as literal constants (their
  worktree branched before the new sun rig existed) — nearly opposite the
  actual current sun direction. Fixed by recomputing the literal constants
  against the real `sunDirectionFromSky(38, 205)` output.
- **Sky rendered washed-out white**, not the seam the sky agent's own fix
  addressed (that fix — spreading the mie sun-glow lobe — was correct and
  is kept). The remaining whiteout was turbidity/rayleigh values that were
  simply too high for this tone-mapping setup; cut hard (turbidity 1.0,
  rayleigh 0.15) until the sky actually read as blue instead of clipped
  white. Verified empirically, not assumed — an intermediate halfway cut
  (rayleigh 1.35→0.75) barely moved the output at all, which is itself
  informative: once tonemapping is deep in ACES's shoulder, small input
  changes don't show up in the output.

Wildlife (habitat-gated fauna via the foxel toolchain) is queued for a
retry once the spend limit is lifted — see the live progress page for
current per-piece status.

**To resume:** this workflow is now captured as a reusable skill —
`.claude/skills/gauntlet-loop/`. Say "restart the gauntlet loop" and it
reconstructs state from this note + git log rather than starting over.

## Round 2 (2026-08-04)

### The honest verdict on round 1

Round 1's four pieces were salvaged, integrated, typechecked and
test-green — but **never actually critiqued**. Scored cold against the
rubric for the first time this round, the integrated result fails it:

| # | rubric point | round 1 result |
|---|---|---|
| 4 | water reflects sky | FAIL — inner ocean near-black |
| 5 | shoreline foam/blend | FAIL — hard blocky cutoff |
| 6 | sky gradient + sun glow | FAIL — flat near-white wash, no gradient |
| 10 | no clipped white/black | FAIL — up to 86% of sky pixels hard-clipped |

"Typechecks and passes tests" was never evidence about any of these. The
lesson is the one the skill already warns about: a piece is not done until
a critic has looked at its output.

### Measurement harness

Tuning by eye was the bottleneck, so round 2 added one (kept in the
session scratchpad, not the repo):

- `capture.js` drives the real app in headless chromium (heavy rain, warm,
  1 week/s) and shoots several camera angles.
- `analyze.js` decodes those PNGs *inside* chromium — no image library
  needed on the host — and reports clipped-white %, clipped-black % and
  mean RGB per region. Rubric item 10 becomes a number.
- `column.js` prints a vertical pixel profile, which is what finally
  settled "is that pale band the sky or something else".
- The rig logs its own calibration in dev, so sky tuning is a ~10s loop
  instead of a ~4min screenshot loop.

Two findings only came out of measuring, not looking: the baseline sky was
*already* a flat wash sitting just under the clip point (mean luma 245,
zero saturation), and the white island in run-forward captures is **snow
accumulating in-sim**, not overexposure — at step 0 the terrain is a
correct tan (129,118,91).

### Phase 0 — shared foundation (landed, `2060e6c`)

Per the skill's step 2, the shared foundation was built and committed
sequentially *before* any fan-out, because every piece depends on it.

three's `Sky` emits raw Preetham radiance far above display range, so ACES
desaturates it to grey at any exposure — verified still grey at exposure
0.12. Round 1 had worked around this by crushing `rayleigh` to 0.15 and
`environmentIntensity` to 0.045, which switches the atmosphere off rather
than scaling it. `render/lightingRig.ts` now:

- patches a radiance-scale uniform into `Sky` and calibrates it at startup
  by rendering the dome into an offscreen probe and measuring it, so
  exposure returns to 1.0 and IBL is meaningful again;
- anchors that calibration on the camera's own view direction through a
  narrow cone — the camera looks *down* at the island, so the frame never
  contains the blue zenith, only the horizon band. Anchoring on the zenith
  left the visible band at 213,213,213; on a four-azimuth horizon average,
  218,218,217; a wide cone at the view direction still left it 2x hot;
- moves the sun off the camera's axis (azimuth 205 → 130). At 205 the
  camera stared into the mie glare and the sky washed white; at 42 the sun
  sat behind the camera and the sky went gradientless. The side sun also
  gives the island cross-lit relief instead of flat frontal light;
- is the single source of truth for sun direction/colour and sky tones.
  `WaterMesh` and `OceanMesh` consume it via `setSkyLighting` instead of
  each carrying their own literal copy — which is precisely what went
  stale and produced round 1's near-black water.

Water now reads as a lit sea and terrain holds its substrate colour under
cross-light. The sky no longer clips, but is still short of "coherent
gradient with sun glow" — that is the sky piece's round 2 job, and it can
now be tuned without dragging exposure with it.

### Round 2 per-piece status

| piece | status |
|---|---|
| phase 0 lighting rig | done, committed, verified (508 tests, build clean) |
| sky & atmosphere | queued — no gradient/glow yet (rubric 6, 7) |
| water & shoreline | queued — hard shoreline cutoff, square ocean seam (4, 5) |
| terrain material | queued — blocky stair-step silhouette, hard-edged patches (1, 2) |
| vegetation | queued — needs a non-snowed grown world to judge (8, 9) |
| wildlife | still not started |

## Honest scope note

"AAA quality" here means: real shadow mapping, PBR materials with image-based lighting, a proper water shader, post-processing (tone mapping, bloom, ambient occlusion, anti-aliasing), richer instanced vegetation, and an adaptive quality tier so it still runs on iPad Safari. It does not mean verified parity with, or a blind win against, any specific shipped commercial title — that isn't a claim this note or the accompanying work makes.
