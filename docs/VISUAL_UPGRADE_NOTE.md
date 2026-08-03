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

## Honest scope note

"AAA quality" here means: real shadow mapping, PBR materials with image-based lighting, a proper water shader, post-processing (tone mapping, bloom, ambient occlusion, anti-aliasing), richer instanced vegetation, and an adaptive quality tier so it still runs on iPad Safari. It does not mean verified parity with, or a blind win against, any specific shipped commercial title — that isn't a claim this note or the accompanying work makes.
