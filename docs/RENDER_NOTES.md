# How rendering actually works here — and the traps

**What this file is for.** Facts about the engine, the libraries, and this
project's rendering conventions that are *expensive to rediscover and invisible
in the code*. Every entry below cost someone real time to work out, and several
had already been worked out once before and lost with the session that found
them.

**What belongs here:** engine/library behaviour that surprised you, a
convention the code depends on but does not state, a measurement technique that
works (and the obvious one that doesn't), a thing that looks like a bug and
isn't.

**What does not:** project status, per-round progress, or what something should
look like. Status goes in `VISUAL_UPGRADE_NOTE.md` and
`evidence/gauntlet-phase-c.json`; the visual bar goes in `reference/OBSERVATIONS.md`;
simulation model reasoning goes in `SIMULATION_MODEL.md` and
`NATURAL_PROCESS_MATH.md`.

**Rules.** Every entry states how it was *verified*. If you have not tested it,
either test it or label it untested in the same sentence — a plausible mechanism
written down as fact will be planned around by the next session. Delete entries
that turn out to be wrong rather than leaving them to mislead.

---

## three.js behaviour

### `Sky` is a box, and `setScalar` is its *diameter*

`three/addons/objects/Sky.js` is a `BoxGeometry(1,1,1)` rendered `BackSide`. So
`sky.scale.setScalar(380)` gives a box **380 across — half-extent 190**, not
380. three's own example passes `10000`.

*Why it bites:* anything drawn beyond that half-extent has no backdrop. A
partly-transparent sea plane extending past it blends toward the clear colour
instead of toward sky, and the tell is the distant sea going dark and losing
saturation with distance.

*Verified:* read the upstream source; fixed by sizing the box to enclose the sea
plane, which moved top-of-frame blue/red from 2.03 to 3.42.

### Materials only tone-map when rendering **direct to screen**

three r185 gates tone mapping in a material's shader on
`currentRenderTarget === null` (`WebGLPrograms.js:180`). Rendering into any
render target emits **raw linear radiance** with `NoToneMapping`.

*Why it bites:* an offscreen probe measures pre-tone-map values, which are not
what the viewer sees. `lightingRig.ts` calibrates against a probe for exactly
this reason, and the gap between probe and screen is large — the probe read the
sky at blue/red 1.59 while the frame rendered 1.015.

*Also:* this is why the "postFx double-tone-maps" hypothesis was **wrong**.
`RenderPass` renders to a target (so materials do not tonemap), and `OutputPass`
applies ACES exactly once. Both paths tonemap once. Do not re-derive this.

### ACES desaturates hard, and clamps saturated cyan's red to zero

three's `ACESFilmicToneMapping` pulls a linear blue/red of 1.59 down to about
1.17 on screen. Worse, its output matrix has negative cross terms
(`row0 = [1.60475, -0.53108, -0.07367]`), so a sufficiently saturated cyan
drives red **negative**, and it clamps to 0 — a channel clip that whole-pixel
"clipped black" checks do not catch.

*Tooling:* `npm run tonemap -- --linear=r,g,b` predicts the on-screen sRGB for a
linear colour, and `--luminance= --br=` solves back from what `[rig]` logs.
Reach for it instead of tuning colours by eye.

*Verified:* mirrors the upstream GLSL exactly; used to diagnose a deep-water
colour whose red measured exactly 0 on screen.

### `PlaneGeometry` rotated flat: the UV↔world mapping

`new THREE.PlaneGeometry(w, h)` then `.rotateX(-Math.PI / 2)` maps local
`(x, y, 0)` to world `(x, 0, -y)`. Combined with three's UV convention that
gives, for a plane of side `worldSize` centred on the origin:

    uv.x = 0.5 + worldX / worldSize
    uv.y = 0.5 - worldZ / worldSize

Any geometry that wants to sample the sim fields the way the terrain does must
reproduce **both** lines. `buildSkirtGeometry` does.

### Depth precision goes as `far / near`

The shoreline z-fight that showed up as a per-frame flash in playtest is held
off by a tuned `polygonOffset` in `OceanMesh`, tuned when the frustum ratio was
5000. Moving the far plane without moving near coarsens the depth buffer by the
same factor and puts that fix at risk. `Scene.ts` derives `CAMERA_NEAR` from
`CAMERA_FAR` to hold the ratio fixed — keep it that way.

---

## This project's conventions

### Field textures are Nearest + ClampToEdge + `flipY = false`

`fieldTexture.ts`: float textures use `NearestFilter` because float *linear*
filtering is not universally supported across GPUs/drivers; smoothing comes from
the manual `sampleFieldBilinear` helper instead. `flipY` is pinned false so row
order does not depend on a three.js default, and `fieldUv()` does the V flip —
sim fields upload row-major with increasing z, three's plane V decreases with
it.

**ClampToEdge is load-bearing, not incidental.** Sampling past the grid returns
the edge row, which is what lets the seabed skirt inherit the terrain's real
boundary values instead of wrapping to the far side of the map.

### ClampToEdge extrudes the boundary row outward — defuse it

The seabed skirt and the ocean's depth lookup both sample the elevation field
past the grid, where `ClampToEdge` returns the **boundary cell repeated
outward**. That is load-bearing (it is what lets the skirt meet the terrain
exactly), and it is also a trap: whatever sits on the boundary row is smeared
outward for the skirt's entire 60-unit reach.

*The tell:* axis-aligned ridges radiating N/S/E/W from the middle of each map
edge, with matching pale streaks in the water where the same clamped sample
tells the ocean shader "shallow here". A uniform boundary row smears into a
flat square shelf; a single raised cell — raise a berm near an edge — smears
into a long tapered spike. Reported from the deployed build as a "mirror image
effect", which is a fair description: the edge row mirrored outward.

*The fix:* `seabedForget()` in `seabed.ts` fades the sampled bed toward a basin
depth over 12 world units outside the grid, so per-cell edge detail is
forgotten. It starts at zero distance (the seam stays exact) and never *raises*
the seabed (genuinely deep edges stay deep). Both the skirt vertex shader and
the ocean fragment shader must apply it, or colour and geometry disagree.

*Verified by A/B:* with the fade disabled, a hard square shelf reappears around
the footprint; with it on, the shelf fades and the break wanders. Note the
berm-placement path itself was **not** reproduced under scripted clicks — the
mechanism is confirmed, the specific interaction that triggers it is not.

### The terrain Group is raycast recursively — new children become colliders

`ui/siting.ts` does `raycaster.intersectObject(terrainMesh, true)` against the
whole terrain **Group**. Anything added to that group joins the edit picking
path. The skirt sets `raycast = () => {}` for this reason; `worldToGrid` would
reject its off-grid hits anyway, but a ~168-unit invisible collider in the edit
path is a trap for the next tool that raycasts.

Also worth knowing: three's raycaster tests **geometry attributes, not
vertex-shader displacement**. Terrain picking has always been against the flat
plane at y=0, which is intentional — do not "fix" it by expecting the displaced
surface.

### One definition per physical thing, consumed everywhere

Two files exist purely because duplicating a constant produced a real,
shipped-looking bug:

- **`lightingRig.ts`** — sun direction/colour and sky tones. `OceanMesh` and
  `WaterMesh` used to each carry their own literal copy; the sun rig moved, the
  copies did not, and the water rendered near-black. Nothing typechecks a stale
  copy of a lighting constant.
- **`seabed.ts`** — the shape of the seabed outside the sim grid. Written twice
  (geometry in `TerrainMesh`, depth in `OceanMesh`) it produced water painting
  shallow turquoise over troughs the geometry had actually sunk. The TS and GLSL
  bodies in that file are deliberately line-for-line twins.

If you find yourself writing a second description of one physical thing, that is
the bug, not the starting point.

### The skirt shares the terrain material on purpose

`TERRAIN_DISPLACE_INJECT` does `transformed.y = vFieldElev + position.y`. That
`+ position.y` is a **no-op for the terrain plane** (flat, so `position.y` is 0)
and the drop channel for the skirt. It exists so the skirt can reuse the
terrain's exact material and therefore cannot drift from it in colour. Do not
"simplify" it away.

---

## Things that look like bugs and are not

- **The thin line tracing the map boundary is `ExtentCage`** — an intentional
  sea-level horizon ring (C-015 / §4.2), with soft verticals up to the peak when
  sea level is absent. Not a crack, not a seam. Check before "fixing" it.
- **A white island in run-forward captures is snow accumulating in-sim**, not
  overexposure. At step 0 the terrain measures a correct tan.
- **Hard-edged material boundaries on the terrain are the art direction**, not
  an unblended splat. See `reference/OBSERVATIONS.md` — a critic once filed
  "feather these edges" as the top finding and it was the exact opposite of the
  brief.

---

## Measuring the output

### `gl.readPixels` on the live canvas returns all zeros

The renderer is created without `preserveDrawingBuffer`, so the backbuffer is
cleared once the frame composites. The tell is **every band reporting 100%
clipped-black**. Screenshot instead and decode the PNG in-page — that is what
`scripts/shot.ts` does.

### The quality tier silently changes what you are looking at

`detectQualityTier()` returns `"low"` when `cores <= 4`, and `"low"` sets
`postFx: false`. Any container or CI box with four cores renders with SSAO,
bloom and the whole composer **disabled**, which invalidates any finding about
AO or bloom made there. Force `?quality=high` when it matters; `npm run shot`
captures both tiers by default for this reason.

### Vegetation will not grow in a headless run

Real-time playback cannot grow vegetation in reasonable wall-clock time — ~24
sim-days under heavy rain produced 0% cover, because succession is slower than
that in this model. Seed biomass directly for rendering verification, and say so
when reporting, because the resulting density is more uniform than real
gameplay produces.

### `npm run shot` reports numbers, not adjectives

Mean RGB, HSV saturation, blue/red, clipped-white % and clipped-black % per
band, plus named `--probe=name:xPct,yPct` patches for region-to-region
comparisons (bar v2 point 7 is a comparison between two regions, which a
whole-frame average cannot express). Captures are gitignored — regenerate them.
