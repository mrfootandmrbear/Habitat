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

## Round 1 critique (2026-08-04, 01:12–01:21 UTC)

Build/tests re-verified green on HEAD (508/508 tests, clean typecheck) before
critiquing. Fresh screenshots were captured via headless Chromium against the
dev server — one clean low-angle 3/4 shot with no vegetation (terrain/water/
sky baseline), one with vegetation biomass seeded directly via a temporary
debug hook (reverted, never committed) so the vegetation renderer could be
judged without waiting on real-time simulated growth, plus two closer detail
shots (shoreline ring, vegetated slope).

Each piece went to a separate fresh-context critic agent with no prior
context, scored cold against the relevant rubric points only. A canary
(terrain) ran first per the skill's post-interruption guidance, came back
sharp and specific rather than a rubber stamp, so the other three were fanned
out. All four came back **prototype-tier, not production** — a real step
back from the optimistic "shipped" framing in Round 1 status above:

- **Terrain material — fails the bar.** No visible ambient occlusion in
  creases (the slope reads as flat directional N·L shading only). Substrate
  patches (the brown/tan/yellow blotches visible on the cone in every
  screenshot) have crisp, polygon-straight edges rather than blended
  material transitions — the critic's read: "looks like an unblended
  texture-splat/debug layer stamped onto the base terrain color." Shadow
  contact is gapless but hard-edged, not soft. **Biggest gap:** feather/blend
  the substrate-patch edges (or move to a triplanar/slope-based material
  blend) instead of the current hard cutoff.
- **Water/ocean — fails the bar.** Reads as a muddy, non-reflective
  brown-gray plane, not blue — no visible sky reflection, no specular glint,
  hard shoreline cutoff with zero foam. Likely cause (source-verified, not
  just guessed): `OceanMesh`'s `uOpacity` is only 0.55 and the seafloor
  terrain underneath is dark and warm-toned, so at that opacity the seafloor
  color dominates the alpha blend instead of the shader's actual blue
  `uBaseColor`/sky-reflection math. The shader itself does implement
  reflection + Fresnel + specular sparkle (confirmed by reading
  `OceanMesh.ts`) — it just isn't winning the blend against what's under it.
  **Biggest gap:** raise opacity and/or darken-mask the seafloor under the
  ocean plane so the water's own color and reflection actually read.
- **Sky/atmosphere — partially fails, one finding downgraded on
  verification.** Gradient is smooth (no banding/seam) and the palette is
  coherent with water/terrain. Clouds have soft edges but no internal
  volumetric shading. The critic reported no sun disc or glow visible in any
  frame — **verified against source**: `Sky.js`'s sun disc uses the real
  astronomical angular diameter (~0.5°), so it is only visible within a
  fraction of a degree of dead-on camera aim; my screenshots' orbit angles
  almost certainly just never framed it. Treating "no sun visible" as
  **unconfirmed** (a likely artifact of ad hoc camera framing, not a proven
  defect) pending a shot deliberately aimed at azimuth 205° / elevation 38°.
  **Biggest gap (of the confirmed findings):** clouds need internal
  light/shadow shading to read as volumetric rather than flat soft blobs.
- **Vegetation & grounding — fails the bar.** Grass instances read as an
  obvious grid of near-identical cones, not individual plants. **Source-
  confirmed root cause:** `OccupantMesh.ts` jitters per-instance scale and
  rotation (`hash01(x, z, …)`, lines ~389–393) but places every instance at
  the exact grid-cell center (`this.dummy.position.set(ox + x * cellW, y, oz
  + z * cellW)`, no sub-cell offset) — so the underlying placement is
  perfectly regular no matter how much scale/rotation varies, and at the
  near-full-coverage density used for this test it reads as visible rows.
  Contact shadowing under individual plants is weak-to-absent. **Biggest
  gap:** add a small deterministic sub-cell position jitter (same `hash01`
  pattern already used for scale/rotation) so instances stop sitting on a
  perfect lattice.

**Caveat on vegetation testing methodology:** headless real-time playback
couldn't grow vegetation naturally in reasonable wall-clock time (even ~24
sim-days under heavy rain produced 0% cover — succession is slower than that
in this model), so biomass was seeded directly for rendering verification
only, at a denser and more uniform coverage than real gameplay would produce.
The grid-alignment defect itself is real and density-independent, but take
the *density/pattern* shown in the screenshots with that grain of salt.

Net: none of the four Round 1 pieces clear the bar yet. This is useful
signal, not a setback — the critique step did its job by catching gaps that
"looks shipped in the diff" didn't. Next step is a Round 2 builder pass
per piece against the four concrete, source-verified gaps above, then
re-critique.

## Discovery mid-Round-2: postFx pipeline likely double-tonemapping (2026-08-04)

Before writing Round 2 builder briefs, checked whether the terrain "no
visible AO" and sky "can't verify bloom" findings were real gaps or just an
artifact of this test environment. They were partly the latter, but digging
in surfaced a more serious, previously-hidden bug:

- This container reports 4 CPU cores. `QualityTier.ts`'s `detectQualityTier()`
  selects `"low"` whenever `cores <= 4`, and `"low"` sets `postFx: false` —
  so **every Round 1 critique screenshot was captured with SSAO, bloom, and
  the whole post-processing composer entirely disabled.** The terrain/sky
  critics' AO and bloom findings above were made blind to those features.
- Forcing `?quality=high` (the tier most real users on modern multi-core
  desktops would actually get) to check fairly: the result is **worse, not
  better** — the entire scene washes out to a pale white/blue haze, terrain
  and water barely distinguishable, far less legible than the low-tier
  direct-render path. Screenshots: `quality-high-1.png` and
  `quality-high-detail.png` (see the progress artifact).
- **Leading hypothesis (diagnosed, not yet fixed or confirmed by a code
  change):** likely double tone-mapping. `Scene.ts` sets
  `renderer.toneMapping = THREE.ACESFilmicToneMapping` globally, which is
  baked into every standard material's shader output — so `RenderPass`'s
  intermediate render already comes out ACES-tonemapped. `OutputPass`, the
  last pass in the composer chain, then applies tone-mapping/colorspace
  conversion *again* on data that's already been compressed once, pushing
  everything further toward white. This would explain the exact symptom
  (overexposed, low-contrast, pale) without touching any of the four
  critiqued pieces' own shaders.
- **Why this matters more than the four piece-specific gaps:** this is
  shared rendering foundation (the composer/tonemapping chain), not any one
  piece. It's a prerequisite per the gauntlet-loop skill's Step 2, not a
  fifth piece to fan out — fixing it changes what "critiqued" even means
  for terrain/sky's AO and bloom, since those were never actually seen with
  postFx on. It should be fixed (or at least confirmed and root-caused)
  before re-critiquing terrain/sky specifically, and probably before the
  water/vegetation Round 2 passes too, since a shared foundation change
  mid-round is exactly the staleness trap the skill warns about.

**Status: diagnosed, not fixed.** Paused here on owner instruction before
writing any Round 2 code. Not yet confirmed by actually toggling
`renderer.toneMapping` or `OutputPass` to test the hypothesis — that's the
first thing to try on resume.
## Two parallel critique sessions — reconciled 2026-08-04 (merge note)

The section above and the section below were written by **two different
sessions working on separate branches at the same time**, neither able to
see the other's note. Both independently critiqued Round 1 cold against the
rubric; both concluded it fails. They were merged into `main` together on
2026-08-04, in timestamp order.

Read the Round 2 section below with that in mind: its claim that Round 1 was
"never actually critiqued" was true *from that session's vantage point* — the
01:12 critique existed only on an unmerged branch it couldn't see. It is no
longer accurate now that both have landed. **The two critiques corroborate
each other** (water fails, sky clipped, terrain patches hard-edged,
vegetation on a lattice) — independent agreement from separate cold reads,
which is stronger evidence than either alone, not a duplicate to discard.

One finding exists only in the Round 1 section and is the most important
item on resume: **postFx was disabled in every Round 1 screenshot**
(`detectQualityTier()` returns `"low"` at `cores <= 4`), so all AO and bloom
findings in *both* sections were made blind to those features. Fix the
tonemapping chain before trusting any per-piece critique.

## Round 2 (2026-08-04, 02:27–02:28 UTC)

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

**Blocking all of the above:** the postFx double-tonemapping bug documented
in the Round 1 critique section. It is shared foundation, not a piece — fix
and confirm it before re-critiquing anything, per the skill's Step 2.

## The bar, v2 — Godus-like stylized realism (2026-08-04, owner-supplied references)

**Supersedes the 12-point rubric in "The bar (gauntlet loop)" above.** The
owner supplied real Godus reference images and named the direction:
*Godus-like stylized realism*. Lineage is in THESIS §1 — the seed was RCT3
sandbox terrain editing, and Godus is the closest existing execution of the
same idea. Reference images live in `docs/reference/`.

**What the Godus references are and are not for.** They are the bar for
**visual clarity**: saturated palette, clean colour separation, instantly
readable materials and water depth. They are **not** the bar for terrain
shape — that is RCT3-like and smooth. Read every point below with that split
in mind, and see point 1 before touching terrain geometry.

This replaces a rubric that was written to describe **physically-blended
naturalism**, and in three places that rubric asked for the *opposite* of the
stated direction. Those points are retired, not merely reworded:

| retired v1 point | why it contradicts the direction |
|---|---|
| 2 — "substrate materials read as physically distinct… not just flat-colour-different" | Godus is flat-colour-different *on purpose*. Crisp banded colour is the style. |
| 1 — AO in every crease, "no flat uniformly-lit patches" | Godus lighting is soft and ambient-heavy; flat lit plateaus are correct. |
| 8 — vegetation "shape/shading variation" as the goal | The goal is *type variety and clustering*, not per-instance noise on one cone. |

**A Round 1 critic finding is void because of this.** Terrain's "biggest gap"
was recorded as *"feather/blend the substrate-patch edges instead of the
current hard cutoff."* Against the Godus bar that is backwards — hard-edged
material boundaries following terrain contours are the target. Do not action
it — clarity favours clean boundaries, not feathered ones.

The cone's faceted, stair-stepped silhouette **is** a real defect, though.
(A retracted revision of this section briefly claimed stepping was the style,
on the mistaken reading that the Godus references governed shape. They do
not — see point 1.)

### v2 — twelve checkable points

**Terrain shape language — RCT3-like, explicitly NOT terraced**

> Owner correction (2026-08-04): the Godus references were supplied to show
> **visual clarity** — saturation, readability, clean colour separation — and
> *not* shape language. Terrain should look closer to **RCT3**: a smooth
> continuous rolling heightfield. **Do not implement terracing.** An earlier
> revision of this section called for stacked contour terraces; that was a
> misread of what the references were for, and is retracted.

1. Terrain reads as a **smooth continuous landform**. No terraces, and no
   visible triangle faceting or stair-stepped shoreline — today's cone shows
   both, and both are genuine defects.
2. Material follows the landform legibly: steep faces read as exposed
   rock/substrate, gentle ground as soil/vegetation, and the transition is
   driven by the terrain itself rather than looking stamped on.
3. Material zones are **clearly readable** — one substrate is unmistakably a
   different material from its neighbour. Clarity is the goal, so favour clean
   boundaries over physical feathering, but they follow the smooth surface,
   not contour steps.

**Palette**
4. Land palette is saturated and warm — yellow-greens, ochres, tans. Measured:
   terrain bands must be clearly chromatic, not near-neutral.
5. No large achromatic region anywhere in frame. Concretely: no major band
   sitting at blue/red ≈ 1.0 with flat luminance (today's sky is 1.015 — fail).

**Water**
6. Water is **banded by depth**: pale sand → bright turquoise shallow → deep
   blue-teal. At least three readable steps.
7. Shallow water is high-saturation cyan and obviously distinct from deep
   water. Today's water is rgb(42,48,52) — a dark near-neutral plane — fail.
8. The shoreline shows a distinct pale band between land and shallow water.

**Vegetation**
9. Plants read as distinct *types* by silhouette — conifer vs palm vs shrub —
   not one repeated cone with jittered scale.
10. Placement is clustered and irregular. No visible lattice or row structure.

**Light and sky**
11. Lighting is soft and ambient-heavy: gentle shadowing, no harsh contrast,
    no crushed blacks. Godus reads bright and open, not dramatic.
12. Sky is a **minor background element** — the camera angle is high and
    looks down. It must not be flat grey, but it is explicitly *not* where
    effort should go. Clouds soft and simple.

### Priority correction

Point 12 changes the running order. I had queued the sky calibration as the
next blocking fix; against these references that is **wrong priority** — in
Godus the camera looks down and sky is barely in frame. The dominant visual
signal is terraced terrain + saturated palette + depth-banded water. Sky
still needs to stop being flat grey (point 5), but it is not the lever.

Ranked by distance from the bar, worst first: **water colour/banding** (6–8),
**palette saturation** (4), **smooth terrain silhouette — de-facet, fix the
stair-stepped shoreline** (1), **vegetation type variety** (9–10), then
sky (5, 12).

## Resolved: the double-tonemapping hypothesis was wrong (2026-08-04, post-merge)

Tested on resume, as the Round 1 section said to. **There is no double
tone-mapping, and the washout it was invented to explain no longer
reproduces.** Both halves checked:

- **Mechanism — disproven by engine source.** three r185 only applies tone
  mapping in a material's shader when rendering *directly to screen*:
  `WebGLPrograms.js:180` gates it on `currentRenderTarget === null`.
  `RenderPass` renders into the composer's target, so materials there emit
  raw linear radiance with `NoToneMapping`, and `OutputPass` applies ACES
  exactly once. The postFx path and the direct path each tonemap once.
- **Symptom — no longer present.** Measured with the new harness at
  1280x800: `quality=high` sky is rgb(181.4, 183.3, 184.2) with
  **0.00% clipped-white and 0.00% clipped-black**; `quality=low` is
  rgb(181.3, 183.2, 184.2), also 0%. Round 2's "up to 86% of sky pixels
  hard-clipped" and "washes out to a pale white/blue haze" do not
  reproduce.

Why it looked real at the time: the observation (01:21) predates Phase 0
(02:27), which is exactly the fix. Phase 0's radiance calibration brought
the dome from `rawView=4.655` into range (`scale=0.0752` → `view=0.350`),
so the clipping that motivated the hypothesis was already gone by the time
the two branches landed together. The hypothesis was reasonable from where
that session stood; it was just never tested before being written down.
`SSAOPass` and `EffectComposer` were also checked and both use
`HalfFloatType`, so there is no hidden LDR clamp in the chain either.

### The real remaining sky defect (new, replaces the tonemapping item)

postFx is *working* — `high` differs from `low` in mid/ground bands
(rgb 129/132/134 vs 112/113/112) where SSAO and bloom act. The sky is
where the failure actually is, and it is **desaturation, not clipping**:

| source | sky blue/red ratio |
|---|---|
| rig's own calibration probe | **1.59** (blue) |
| rendered frame, both tiers | **1.015** (achromatic grey) |

`SKY_RAYLEIGH` is 2.6 and exposure is 1.0, so the atmosphere model is not
crushed — Phase 0 restored those. The gap is *what the probe measures*: it
renders the dome into an offscreen render target, where per the mechanism
above materials get `NoToneMapping`. So the rig calibrates a pre-tonemap
radiance the viewer never sees, then ACES desaturates the real frame toward
white. **The calibration optimises the wrong signal.**

That is a shared-foundation fix (it lives in `lightingRig.ts`), so per the
skill's Step 2 it still comes before any per-piece fan-out. Rubric points 6
and 11 cannot pass until it lands.

### Measurement harness — now in the repo (`scripts/shot.ts`)

Round 2's harness was kept in a session scratchpad and was lost with that
session. Rebuilt and committed this time: `npm run shot` drives the real app
in headless Chrome via `playwright-core` against the *system* Chrome (no
bundled-browser download), shoots each quality tier, and reports mean RGB,
clipped-white % and clipped-black % per band. Rubric item 10 is a number
again.

One trap worth keeping written down: the obvious implementation,
`gl.readPixels` on the live canvas, returns **all zeros**. The renderer is
created without `preserveDrawingBuffer`, so the backbuffer is cleared once
the frame composites. The tell is every band reporting 100% clipped-black.
The harness screenshots first and decodes that PNG in-page instead.
Captured PNGs are gitignored — regenerate with `npm run shot`.

## Phase C — opened 2026-08-04 (Stream C of the non-animal build plan)

Owner instruction: *"start up phase c using gauntlet loop skill."* Confirmed to
mean **Stream C** of [the non-animal build plan](plans/2026-08-04-non-animal-build-plan.md)
— the visual work against bar v2.

**Budget mode: subscription, not API.** Per the skill's Step 0, that inverts the
original fan-out economics. **I am the builder, inline, in the main thread.**
Subagents are spawned *only* as fresh-context critics, one per piece, because
grading your own output cold is the one job that genuinely cannot be done
inline. Pieces run **sequentially**, each committed before the next starts.
No parallel worktrees this round — parallelism bought wall-clock, not quality,
and it is what made every Round 1 interruption so expensive.

### Baseline, re-measured on HEAD before touching anything

531/531 tests green, clean typecheck. `npm run shot` at 1280x800:

| band | low tier | high tier | note |
|---|---|---|---|
| sky | rgb(181.3, 183.2, 184.1) **b/r 1.015** | rgb(181.4, 183.3, 184.2) **b/r 1.015** | achromatic — bar v2 point 5 **fail** |
| mid | rgb(94.8, 103.4, 103.7) b/r 1.094 | rgb(108.9, 130.3, 135.2) b/r 1.242 | |
| ground | rgb(41.6, 57.2, 59.8) b/r 1.437 | rgb(55.9, 87.2, 95.4) **b/r 1.707** | ocean banding landed (`567ae8b`) |

Zero clipped-white and zero clipped-black in every band on both tiers, so the
old clipping findings remain dead. postFx is doing real work — `high` and `low`
diverge in mid/ground exactly where SSAO and bloom act — and the two tiers'
skies are identical to within 0.1, which independently rules bloom out as the
cause of the grey sky.

### Owner rulings on the references (2026-08-04)

Real reference images arrived this round, so the bar moves up a tier from
"written rubric" to "reference artifacts" — but only once they are **on disk**.
See [reference/OBSERVATIONS.md](reference/OBSERVATIONS.md) for the full record.
Summary:

- **They govern:** palette & biome readability; water look *and transparency*
  (owner, verbatim: *"I like how the water is transparent to see the underwater
  world"*); vegetation type variety & clustering; camera framing.
- **They do NOT govern terrain shape.** Asked directly whether the contour
  banding in three of the four Godus-lineage references now governs shape, the
  owner answered **"still smooth"** and supplied a **Planet Coaster 2**
  reference (`docs/reference/planet-coaster-terrain.png`, fetched — outbound
  web works from this machine, unlike the container the loop started in) as the
  shape authority: *"spiritual successors to RCT3."* That image is smooth,
  continuous, rounded rock with zero terracing. **The no-terracing correction
  stands.**
- **New requirement, not previously in the bar:** water must be *transparent
  enough to read the submerged landform through it*, not merely depth-banded on
  its surface. Bar v2 point 6 covers banding; it did not cover see-through.

**Resolved same session: the bar is now real reference artifacts.** The owner
supplied fifteen images into `docs/reference/` — a stylized `godus-*` set and a
`natural-*` set of island/reef photography. Every one was viewed and given a
per-image note in OBSERVATIONS.md saying what it shows and what it governs, plus
a table assigning specific images to specific piece critics (a critic shown
fifteen images grades against their average).

The image files themselves are **gitignored**. They are third-party — watermarked
Alamy/Getty stock, a TheGamer press screenshot, Godus game art — and this repo is
public, so redistributing them from it is a different thing from using them as a
local quality bar. Owner confirmed the intent is reference only, not reproduction.
Critics read them off disk; OBSERVATIONS.md is what survives in a fresh clone.

The owner's *"natural images of islands"* set carries a ruling of its own worth
stating plainly: they are **not** a photoreal style target. Habitat is stylized.
What they fix is what the stylization has to stay true to — how water actually
bands by depth, and how a coastline actually reads from above.

### The grey sky: hypothesis tested, only *partly* confirmed

The pre-Phase-C note claimed the rig "calibrates a pre-tonemap radiance the
viewer never sees, then ACES desaturates the real frame toward white," and
that this explains the 1.59 → 1.015 gap. Per the skill's Step 4.5 that was an
untested mechanism, so it was tested before being built against.

**Result: the mechanism is real but does not account for the whole gap.**
Running the probe's reported radiance (luminance 0.350, b/r 1.59) through
three r185's exact ACES matrices and RRT/ODT fit, then sRGB-encoding:

| | b/r | red channel |
|---|---|---|
| probe, linear | 1.590 | — |
| after ACES + sRGB (predicted) | **~1.165** | ~162–167 |
| actually measured on screen | **1.015** | **181** |

Bracketing the one unknown (the log prints luminance and b/r but not green)
across g-biased-to-red, midpoint, and g-biased-to-blue moved the prediction by
less than 0.01, so that guess is not what the discrepancy rides on.

So ACES really does eat most of the chroma — 1.59 → 1.17 — but the frame is
both **flatter and brighter** than tone-mapping alone predicts. There is a
second contributor and it has not been identified yet. The leading candidate,
**explicitly untested and labelled as such**: the probe anchors a 24° cone at
`viewDirection` (`setY(0.08)`, ~+4.6° above horizontal), while the sky actually
visible in frame sits *below* the horizon line — camera at (32,28,36) toward
(0,3,0) is a −27.4° pitch with a 50° vertical FOV, putting the top of frame at
≈ −2.4° and the horizon at ~25% image height. The Preetham model's `1 - Fex`
term saturates hardest below the horizon, which is its whitest, least chromatic
region. If so, the calibration is anchored on sky the player never sees — the
same class of bug the anchor comment already documents twice.

**Disconfirming test, for whoever picks this up:** re-anchor `viewDirection`'s
Y to a *negative* value (aim the probe where the frame actually looks) and
re-run `npm run shot`. If the rendered b/r moves, the anchor is the second
contributor. If it does not, look elsewhere — do not assume.

Note also that fixing brightness anchoring alone cannot fix chroma: the
below-horizon Preetham band has little chroma to recover regardless of what it
is scaled to.

### Phase C piece list

Shared foundation first per the skill's Step 2, then pieces worst-first per bar
v2's own ranking. Live status: [`docs/evidence/gauntlet-phase-c.json`](evidence/gauntlet-phase-c.json).

| # | piece | bar v2 points | status |
|---|---|---|---|
| C0 | sky/lighting foundation — kill the achromatic band | 5, 11 | foundation, in progress |
| C1 | palette saturation & biome readability | 4, 2, 3 | queued |
| C2 | de-facet terrain, fix stair-stepped shoreline | 1 | queued |
| C3 | terrain skirt / square ocean seam | 6–8 | queued |
| C4 | vegetation type variety & clustering | 9, 10 | queued |
| C5 | camera framing | new — owner-ruled this round | queued |
| — | water colour / depth banding | 6, 7 | **done** `567ae8b`, uncritiqued |

Water banding landed before Phase C opened and **has never been critiqued** —
it is done-but-uncritiqued, not done. It also now carries a requirement it was
not built against (see-through to the submerged landform), so it needs a critic
pass against the references rather than a pass by assertion.

### C0 built and critiqued (2026-08-04)

**The grey band was never the sky.** Three rounds tried to fix it by tuning the
atmosphere — rayleigh crushed to 0.15, then the radiance-calibration rig, then
the double-tonemapping hypothesis — and the measured b/r never moved off 1.015.

The sea plane was `worldSize * 1.35`, a half-extent of **32.4**, while the
camera sits at a horizontal radius of **~48**. The camera was outside the water.
What filled the top of frame was the Preetham dome showing past the plane's
edge, and because the camera pitches down 27.4° with a 50° vertical FOV, the top
of frame is 2.4° *below* horizontal — so that was the dome's **below-horizon**
band. Re-anchoring the rig's own probe there measured **b/r 1.05 in linear
space**: near-achromatic before tone mapping is involved at all. No exposure,
rayleigh or calibration change could ever have made it blue.

That also closes the "second contributor" question left open above: ACES
accounts for 1.59 → ~1.17, the anchor mismatch accounts for the rest. Both
halves are now measured, neither is a hypothesis.

A second bug surfaced while fixing it, worth writing down because the API
invites it: **three's `Sky` is a `BoxGeometry(1,1,1)` rendered BackSide**, so
`sky.scale.setScalar(380)` is a box *380 across* — half-extent 190, not 380.
(three's own example passes 10000.) Fine while the sea stopped at 32.4; once the
sea ran to 900 it extended far outside the sky box, so distant water had no
backdrop and, being partly transparent, blended toward the clear colour. The
tell was the far sea going dark and losing saturation.

| measurement | before C0 | sea to horizon | + sky box sized |
|---|---|---|---|
| top-of-frame b/r | 1.015 | 2.029 | **3.417** |
| top-of-frame rgb | (181, 183, 184) | (62, 98, 125) | **(34, 86, 117)** |

Sky box, sea extent and the frustum are now a documented set in `Scene.ts` with
the containment arithmetic written out, since changing one alone re-breaks it.
Camera near/far moved together to hold `far/near` at exactly the 5000 the
shoreline z-fight polygonOffset was tuned against.

#### Cold critic verdict on C0

Fresh-context agent, no project history, scored against bar v2 and
`reference/OBSERVATIONS.md`:

| point | verdict |
|---|---|
| 5 — no large achromatic region | **PASS** |
| 6 — three readable depth steps | PASS (bare) — steps of *value* in one dull teal, not the pale-sand → turquoise → blue-teal hue journey |
| 7 — shallow is high-saturation cyan | **FAIL** — shallow measures HSV sat 0.25 while deep measures 0.61. The shallow band is the *least* saturated water in frame, exactly backwards |
| 8 — pale shoreline band | **FAIL** — east shore steps from land to teal in a single pixel |
| 12 — sky a minor element | **PASS** — no sky in frame at all, which OBSERVATIONS sanctions |
| owner's transparency requirement | **FAIL (partial)** — submerged skirt readable ~40px from shore, nothing beyond; outer sea fully opaque |

**Biggest remaining gap, in the critic's words:** the world reads as *"a square
tray dropped into an ocean" / "diorama on a plinth."* There is a hard straight
right-angled boundary where the pale shelf stops dead against open sea, with a
bright specular rim along it and a dark trapezoid below — a 65-luminance-point
step, larger than any shore transition in the frame. *"So the single largest
colour step anywhere in the water treatment is a straight man-made map border
with a lit bevel and a shadowed cliff face, not bathymetry."*

The critic explicitly flagged that this is **not** a request for terraces — it
asks for the one hard geometric step in the frame to become a smooth slope,
which is the opposite. Good: the anti-terracing guard in the brief held.

**Corroborated independently.** The owner supplied a cold-island aerial
photograph the same hour, which shows exactly the two things the critic asked
for — shallow water as the most saturated water in frame, and depth boundaries
curving with the drowned landform. Two unrelated sources agreeing is stronger
evidence than either alone.

**C0 status: done-awaiting-recritique.** Points 5 and 12 pass. Points 7, 8 and
transparency belong to the water piece and the terrain skirt, which is now the
top-ranked item.

### Engine knowledge now has a home (2026-08-04)

Owner observation, watching this round's reasoning: agents keep rediscovering
how the renderer works. True, and measurable — three separate facts were worked
out twice in this project because the only place they had been written was a
round summary, which the next session skims for status.

[RENDER_NOTES.md](RENDER_NOTES.md) is now the durable home for that: engine and
library behaviour, conventions the code depends on but does not state,
measurement techniques that work and the obvious ones that don't, and things
that look like bugs but are deliberate. Every entry says how it was verified.

The gauntlet-loop skill gained a Step 4.6 requiring it, so this does not depend
on anyone remembering. Status and knowledge are deliberately separate files:
status ages and gets superseded, knowledge accumulates.

### C3 round 3 critique: the diorama defect is closed (2026-08-04)

Resumed via the gauntlet-loop skill's restart procedure. State reconstruction:
542/542 tests green, clean typecheck, working tree clean, one unpushed local
commit (`2e0df07`, docs only). C3 (terrain skirt) had landed round 2 (wandering
shelf break) plus an owner-reported edge-extrusion bug fix hardened with 11
regression tests (`aec9f6c`) — both post-dating the last critique. Per the
skill's resume guidance ("critique pieces waiting on a critic"), that was the
next action, not starting a new piece.

Re-shot `npm run shot` at HEAD, plus two hand-cropped detail views (a 3x
zoomed shoreline segment, and a wide open-water strip for judging whether any
straight seam survives at a distance). A fresh critic — no prior context,
shown only the screenshots, the six-point water/bathymetry rubric, and the
skirt-piece + water-piece reference set from `OBSERVATIONS.md` — scored:

| point | verdict |
|---|---|
| depth banding, ≥3 steps | **PASS** — four readable steps |
| shallow more saturated than deep | **PASS** — correct direction |
| pale shoreline band | **PASS** |
| no hard rectangular seam | **PASS** — "a smooth, irregular wavy curve... no straight run traceable across the frame" |
| no achromatic region | **PASS** |
| soft/bright lighting | **BARE**, tier-dependent — low-tier's horizon band goes darker than high-tier's |

**The "diorama on a plinth" defect — three rounds running (C0's original
finding, C3 round 1's confirmation it was still the map footprint exactly,
round 2's wander fix, then an owner-reported regression that needed hardening
— is now closed.** Critic's words: *"It's no longer a rectangular tray—that
defect is fixed."*

**Real remaining gap, not blocking:** the shallow-water band reads as a
near-constant-width radial offset from the coastline rather than independent
bathymetry — it doesn't bulge, narrow, or break the way the Palau/barrier-reef
reference aerials show. Critic's phrase: *"a glow radius around the island"*
rather than *"a shelf with its own irregular geometry."* Traced to
`seabed.ts`: `shelfStartWarp`'s ~140–220-unit wavelength is long relative to
the visible skirt extent (`SKIRT_REACH=60`), so little of its variation shows
up within frame — a real, understood cause, not touched this round.

**Deliberately deferred rather than chased immediately.** Per the skill's
diminishing-returns guidance: C1 (palette) and C2 (de-facet terrain) are both
still untouched (round 0) and, on direct inspection of this round's own
screenshots, C2's stair-stepped shoreline is a more visually severe defect
than the halo-width polish item. Moving to C2 next; the halo-width gap stays
logged in `gauntlet-phase-c.json` under C3's `critiqueR3` for whoever picks it
back up.

## Honest scope note

"AAA quality" here means: real shadow mapping, PBR materials with image-based lighting, a proper water shader, post-processing (tone mapping, bloom, ambient occlusion, anti-aliasing), richer instanced vegetation, and an adaptive quality tier so it still runs on iPad Safari. It does not mean verified parity with, or a blind win against, any specific shipped commercial title — that isn't a claim this note or the accompanying work makes.
