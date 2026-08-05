# Sim → Render Interface — the wiring map

> **Status:** Working draft, seeded 2026-08-04 from a full read of `src/render/`,
> `src/main.ts`, and the sim surface they consume.
> **Role:** [SIMULATION_MODEL.md](SIMULATION_MODEL.md) answers *what the sim
> does*. [RENDER_NOTES.md](RENDER_NOTES.md) answers *what the render engine's
> traps are*. Neither answers *how a number gets from one to the other* — which
> `WorldState` field, read by which `render/*.ts` file, uploaded how, consumed
> by which shader. This file is that map.

**Why this file exists.** Round after round of visual work in this project
diagnosed rendering defects — the seabed edge extrusion, near-black water, a
muddy non-reflective ocean, a "square tray dropped into the ocean" — by
screenshotting, guessing, and re-deriving the sim→render data path from
scratch each time. Every one of those bugs was a data-crossing bug (the wrong
field, the wrong sample, a convention two files disagreed on), not a shader-math
bug. A map of the crossing itself, read before editing, is cheaper than
re-discovering it from a screenshot. Read this **before** touching rendering
code for anything that smells like "the picture is wrong" — check whether the
picture is wrong because the *data reaching the shader* is wrong first.

**What this file is not.** Not a tutorial on three.js (see RENDER_NOTES.md).
Not a field registry (see SIMULATION_MODEL.md §3 — the authoritative list).
Not a status log. Enumerable things that live in code (the full `InspectorLayer`
union, the full field list) are cited by file, not copied here — a copied list
goes stale the moment someone adds a field, and this project already has a
conformance check (`npm run conformance:check`) that fails on exactly that
class of drift for the docs it covers. This file describes the *mechanism*,
which changes far less often than the list of fields riding through it.

---

## 1. The boundary itself (T-006)

`WorldState` (`src/sim/WorldState.ts`) is the sole authority. Every field the
renderer shows is either a `Grid2D`-backed raster with a public `.data:
Float32Array` and getters (`getSoilMoisture(x,z)`, `getVegCover(x,z)`, …), a
plain scalar (`world.seaLevel`, `world.cloudWater`, `world.precipPhase`), or a
`Set<number>` of cell indices (`world.oceanCells`).

Two ways render code reads it, by how much of it a component needs:

- **`WaterStateView`** (`src/sim/types.ts`) — a deliberately narrow read-only
  interface: `width`, `height`, `getTerrainHeight`, `getWaterDepth`,
  `getSurfaceHeight`. Used wherever a component only needs geometry height —
  `terrainSample.ts`, the `model` parameter threaded through `updateFrom` calls
  in `main.ts` (`world.hydrologyModel` satisfies it). This is the type-level
  half of the boundary: a component typed to take `WaterStateView` cannot
  accidentally reach for an unrelated field.
- **Direct `WorldState` reference** — passed alongside `model` to most
  `updateFrom(...)` methods (`TerrainMesh`, `OccupantMesh`, `FlowCueMesh`).
  This is deliberately wider than `WaterStateView` because the number of
  fields a full terrain/vegetation redraw needs (elevation, moisture, cover,
  fire scar, salinity, material, ocean mask, sea level…) makes a narrow view
  impractical. **This is where the boundary is a convention, not a compiler
  guarantee**: nothing stops render code from writing `world.terrain.data[i] =
  …` in place. T-006 (renderer holds read-only views) is enforced by nobody
  doing that, not by the type system. If you're auditing for a determinism
  bug that only reproduces with rendering enabled, `grep -rn '\.data\[' src/render
  src/ui` for writes (not reads) is the first thing to check.

**One-way, and the direction that's actually forbidden.** Render code reading
wall-clock/frame time for its *own* animation (ripple `uTime`, cloud puff
spin, `performance.now()` in `OceanMesh.onBeforeRender`) is fine and common —
it never touches sim state. What SIMULATION_MODEL.md §5.3 actually forbids is
the sim reading renderer/frame state. Don't confuse "render reads a clock" (a
local animation phase, harmless) with "sim reads a clock" (a determinism
violation) — they look similar in a diff and are not the same rule.

---

## 2. The per-frame call sequence

This is `src/main.ts`'s `frame()`, annotated. Read it once; it's the spine
everything below hangs off.

```
frame(now):
  wallDt = min((now - lastFrame)/1000, 0.05)
  stepsRun = clock.tick(wallDt)              # may be 0 (paused / time-debt-free)

  repeat stepsRun times:
    world.stepEvent()                        # sim only — headless, no renderer access

  cloudMesh.setAtmosphere(world.cloudWater, world.precipPhase)   # direct scalar read,
                                                                  # not through updateFrom
  stormDisplayActive = (derived from rainingThisTick / cloudWater / wetDay — presentation
                         hysteresis, see ui/stormCue.ts, NOT a sim field)
  cloudMesh.update(wallDt, wind.ux, wind.uz)         # presentation animation, every wall frame
  rainCue.update(wallDt, wind.ux, wind.uz)           # same

  if stepsRun > 0:
    syncMeshes(now/1000):
      world.ensureStructureFresh()           # SIMULATION_MODEL.md §7.2 lazy structural recompute
      terrainMesh.updateFrom(model, world, inspector, elevDelta)
      flowCue.updateFrom(model, world)        # throttled to ~4 Hz internally, not every call
      occupantMesh.updateFrom(model, world)
      syncAudio()                             # not covered by this file — audio/AudioBus.ts

  syncWaterDisplay(wallDt):                   # EVERY wall frame, regardless of stepsRun — see §4
    waterMesh.updateFrom(world, wallDt, stormDisplayActive)   # or .snapFrom() on a hard reset
    oceanMesh.setTerrain(world.terrain.data)

  controls.update()
  renderFrame()                               # Scene.ts's render() — composer or direct
  requestAnimationFrame(frame)
```

**The asymmetry worth internalizing:** terrain / vegetation / flow cues update
**only when a sim step actually ran** (`stepsRun > 0`). Water and ocean update
**every rendered wall-clock frame**, sim step or not, because their shaders
animate (ripple `uTime`, sun-sparkle phase) on wall-clock time independent of
simulation time — see `WaterMesh.updateFrom`'s `wallDt`-driven exponential
catch-up. **If you observe "the water is moving but the world is paused," that
is the design, not a bug** — the sim is frozen; only the water's *presentation*
animation runs. Don't go looking for a stray `stepEvent()` call.

---

## 3. Terrain

Files: `render/TerrainMesh.ts` (consumer) · `sim/terrain/generateIsland.ts` +
`sim/terrain/substrates.ts` (producers, world-gen only, not per-frame) ·
`ui/terrainEncoding.ts` (hand-mirrored CPU color twin) · `render/fieldTexture.ts`
(upload mechanism) · `render/seabed.ts` (skirt shape, shared with OceanMesh).

### 3.1 Two coloring paths that must agree, and don't share code

`TerrainMesh` is a `Group` with two mutually-exclusive children
(`setActiveChild` — exactly one is ever attached, so raycasting only ever hits
the visible surface):

- **GPU default path** (`updateGpuDefault`, active when `overlay === "none"`
  and no "remembered form" delta) — uploads six sim fields verbatim as
  `DataTexture`s (`elevation`, `soilMoisture`, `vegCover`, `fireScar`,
  `salinity`, `material`) plus a seventh derived in TS (`erosionPulseField`, a
  decaying signed impulse tracker computed from consecutive elevation frames —
  *not* a registered sim field, purely a render-side visual accent). All
  coloring, displacement and normal computation happen **in the shader**,
  injected into a stock `MeshStandardMaterial` via `onBeforeCompile`
  (`TERRAIN_COLOR_INJECT`, `TERRAIN_DISPLACE_INJECT`, etc.). This is what
  players see essentially all the time.
- **CPU fallback path** (`updateCpuFallback`, active when an inspector overlay
  is on, or "remembered form" elevation-delta tinting is on) — rebuilds
  per-vertex colors on the CPU, one big `switch` in `applyOverlay`, at native
  sim-grid resolution (not upsampled). This exists because ~20+ inspector
  overlays (see `InspectorLayer` in `src/config.ts` for the current list —
  don't copy it here, it changes) are dev/debug tooling, not worth a shader
  permutation apiece.

**The two paths' *default* (non-overlay) coloring logic is duplicated by
hand, in two languages, and nothing catches drift automatically.**
`ui/terrainEncoding.ts`'s `defaultTerrainRgb` (TS — used by the CPU path
when no overlay is active but elevDelta tinting is) and
`TERRAIN_COLOR_INJECT` (GLSL, in `TerrainMesh.ts`, comment-labeled "GLSL port
of ui/terrainEncoding.ts defaultTerrainRgb… keep in sync") must be edited
together. There is no test or type that enforces this — the only way drift
would surface is the CPU and GPU paths visibly disagreeing, which only shows
up when an overlay is toggled on the same scene. If you change one, grep for
the other and check it by eye.

### 3.2 The seabed skirt — single source of truth, and why

`buildSkirtGeometry` (constructed once, not per-frame) extends the terrain
past the sim grid footprint using `seabed.ts`'s `seabedOutside` /
`seabedDrop` / `seabedForget`. It **shares the terrain's own material**
(`this.skirtMesh = new THREE.Mesh(geometry, this.gpuMaterial)`) rather than
having its own — deliberately, so the skirt cannot drift in color from the
terrain edge it continues. `seabed.ts` is the single most important
"if-you-touch-one-you-must-touch-the-other" file in the codebase: its
TS functions and the `SEABED_GLSL` string are hand-mirrored twins (line for
line, by the author's own comment), consumed by **both** `TerrainMesh`
(geometry — where the skirt vertices sit) **and** `OceanMesh` (depth lookup —
what color the water over that skirt reads). The bug this file exists to
prevent already shipped once: water painted shallow turquoise over troughs
the geometry had actually sunk into, because the two surfaces were computed
independently. See RENDER_NOTES.md's "ClampToEdge extrudes the boundary row
outward" entry for the specific failure mode and its fix.

**Practical rule:** any change to how the seabed looks or is shaped outside
the map footprint touches `seabed.ts`, and after that change you must check
both consumers (`TerrainMesh.buildSkirtGeometry`, `OceanMesh`'s fragment
shader) rendered together, not either alone.

### 3.3 Field texture upload mechanics

`fieldTexture.ts`'s `createFieldTexture`/`updateFieldTexture` is the shared
upload path for every `Float32Array` field going to the GPU (terrain,
moisture, cover, depth, ocean mask, …). Fixed conventions, load-bearing:
`NearestFilter` (float-linear filtering isn't universal — smoothing comes
from the manual `sampleFieldBilinear` GLSL helper instead), `ClampToEdge`
(load-bearing for the skirt, see §3.2 and RENDER_NOTES.md), `flipY = false`
plus `fieldUv()`'s explicit V-flip in GLSL (sim fields upload row-major with
increasing z; three's plane V decreases with it — see RENDER_NOTES.md's
"PlaneGeometry rotated flat" entry for the exact formula). Any new field
texture should go through these two functions rather than hand-rolling a
`DataTexture`, or it will silently pick up whatever three.js's own defaults
are instead of this project's.

---

## 4. Water (inland surface flow) vs. Ocean (sea plane) — two meshes, one rig

These are **separate classes with separate geometry, separate shaders, and
separate purposes** — a frequent point of confusion because both are "water"
and both read `world.terrain.data`.

| | `WaterMesh` | `OceanMesh` |
|---|---|---|
| Geometry | Upsampled plane matching the **sim grid** exactly (`worldSize` × `worldSize`) | A much larger plane, `SEA_HORIZON_HALF_EXTENT` (900 units) half-width — runs to the visual horizon, independent of grid size |
| What it shows | `water.surfaceDepth` — puddles, sheet flow, rivers; anywhere `depth > uShowEps` and the cell is not ocean | The sea itself at `world.seaLevel`; hidden via `mesh.visible = false` when sea level is off |
| Source field | `world.water.data` (display-smoothed, see below) | `world.terrain.data` only (`setTerrain`) — it has no depth field of its own; it derives depth from `seaLevel − bed` |
| Update cadence | Every wall frame (`syncWaterDisplay`), exponential catch-up filter | Every wall frame; also has its own `onBeforeRender` hook for `uTime` so it animates even if nothing calls `updateFrom` |
| Ocean cells | Explicitly zeroed (`world.oceanCells.has(i)` ⇒ depth forced to 0 — the inland mesh never double-draws where the sea plane already covers) | N/A — it *is* the sea |

### 4.1 Why `WaterMesh` doesn't show the sim's raw depth

`WaterMesh.updateFrom` does **not** copy `world.water.data` straight to the
GPU. It maintains a separate `displayDepth: Float32Array` that exponentially
chases the sim value with time constant `config.waterDisplayTauSeconds`
(0.28s): `next = cur + (target - cur) * (1 - exp(-wallDt/tau))`. This exists
because event-band sim steps can run many times faster than wall-clock frames
(`clock.maxStepsPerFrame`), so a rain pulse or a flux spike would otherwise
strobe the display rather than read as continuous water. **If a screenshot
seems to show water lagging behind an obvious sim change, this filter is the
first thing to check before assuming a data bug** — it's working as intended;
only `snapFrom()` (used on reset/load) bypasses it.

### 4.2 Ocean depth banding — the one thing OceanMesh actually computes

`OceanMesh` has no sim-provided depth field. Its fragment shader derives depth
per-pixel: sample the elevation texture at the fragment's world XZ (mapped
onto the sim grid's UV space, `ClampToEdge`), run it through `seabedForget`
(§3.2) to defuse boundary-row extrusion, then `depth = max(seaLevel − bed, 0)
+ seabedDrop(...)` for anything past the grid footprint. That single `depth`
value then drives *everything* visual about the ocean in one pass: the
shallow→mid→deep color ramp, the shoreline foam band, and the opacity ramp
(shallow water is more transparent by design — the owner's stated requirement
is seeing the submerged landform through it, not a uniform alpha). **A defect
in ocean color almost always traces back to this one `depth` computation**,
not to the color-ramp constants further down the shader — check the depth
math first.

### 4.3 Lighting: one rig, two consumers, one historical bug

Both `WaterMesh` and `OceanMesh` implement `SkyLightingConsumer` and are
driven by `render/lightingRig.ts`'s single `SkyLighting` value (`sunDirection`,
`sunColor`, `skyZenith`, `skyHorizon`) via `setSkyLighting(lighting)`. **This
is called exactly once**, in `main.ts` immediately after `createScene()` —
grep confirms no other call site. There is no day/night cycle or live sun
movement today: the sun is calibrated once at startup and stays fixed for the
session. If a future feature wants the sun to move over time, the mechanism
(`setSkyLighting` on each consumer) already exists, but nothing currently
re-derives `SkyLighting` after startup or re-bakes the PMREM environment map
that depends on it (`Scene.ts`'s `pmrem.fromScene` also runs once) — that
would be new code, not a config flip. **This exists because the
alternative already shipped a bug**: both shaders used to carry their own
literal copies of sun direction/sky color "to stay self-contained," the sun
rig moved, the literals didn't, and the water rendered near-black. Nothing
type-checks a stale copy of a lighting constant — the fix was structural (one
producer, both consumers read it), not a tuning fix. If you ever see yourself
about to hardcode a sun direction or sky color into a new render file, that is
the exact mistake this section exists to flag — read it from
`SceneHandles.skyLighting` or take a `setSkyLighting` call instead.

---

## 5. Sky / lighting rig (`lightingRig.ts`, `Scene.ts`)

Not sim-driven at all — this is the one major render subsystem with no
`WorldState` input. It exists in this map because §4.3 and vegetation
grounding both depend on it, and because its calibration procedure
(`calibrateSkyLighting`) is easy to mistake for something that reads sim
state (it doesn't — it renders the sky dome into an offscreen probe and
measures it). See RENDER_NOTES.md for the specific traps (`Sky`'s
diameter-not-radius scale, tone-mapping-only-to-screen, the below-horizon
achromatic band). `Scene.ts`'s `SKY_BOX_SCALE` / `CAMERA_FAR` /
`SEA_HORIZON_HALF_EXTENT` are a documented set — changing one without the
others re-opens the "sea plane extends past the sky box" bug (see the comment
block at the top of `Scene.ts`).

---

## 6. Vegetation (`OccupantMesh`)

Reads six biomass fields per cell — `getHerbBiomass` / `getStrandBiomass` /
`getBinderBiomass` / `getMarshBiomass` / `getShrubBiomass` / `getCrustBiomass`
— plus `world.wind` for sway direction and `model.getTerrainHeight` for
grounding. Presentation only (T-006): it creates no population state and
writes nothing back. Six guilds, six hand-built procedural geometries
(`buildHerbGeometry` etc. — blade clusters, lobes, no texture/model assets),
each its own `InstancedMesh` so silhouette differs per guild rather than one
shape with jittered scale. Per-instance placement is grid-cell-center plus
`hash01(x,z,…)`-jittered scale/rotation (see `ui/occupantSway.ts` /
`occupantEncoding.ts`) — deterministic and seed-stable, same discipline as
the sim's own RNG streams (SIMULATION_MODEL.md §9), even though this data
never touches simulation state.

Known gap worth stating so nobody "fixes" the wrong layer: **placement itself
is a perfect grid lattice** (cell-center only, no sub-cell offset) even though
scale/rotation are jittered — see `docs/VISUAL_UPGRADE_NOTE.md`'s vegetation
finding. If vegetation reads as "rows," the fix is a sub-cell position jitter
in `OccupantMesh`, not more variance on scale/rotation, which was already
tried and doesn't fix a lattice.

---

## 7. Weather cues (`CloudMesh`, `RainCueMesh`, `WindArrowMesh`) — thin sim input, heavy presentation state

These three read very little from `WorldState` directly and carry most of
their own state as presentation-only hysteresis:

- **`CloudMesh.setAtmosphere(world.cloudWater, world.precipPhase)`** — the
  only direct per-frame sim read in this group. Everything else (`update`,
  puff spin, opacity) is presentation animation on `wallDt`.
- **`stormDisplayActive`** (`main.ts`) is *not* a sim field — it's a derived
  presentation-layer boolean (`ui/stormCue.ts`'s `stormSpellArmed`) computed
  from `rainingThisTick`, `world.cloudWater`, and a wet-day regime check, with
  a `STORM_RELEASE_HOLD_S` hysteresis so the cue doesn't strobe at high time
  rates. If you're hunting for "why does rain visually linger after the sim
  stopped raining," this hold timer is why, and it's intentional (see the
  `G1` reference in the source comment).
- **`RainCueMesh.setTerrainAffinity(world.terrain.data, …)`** — a periodic
  (every `SNOW_AFFINITY_REFRESH_S` = 3 wall-seconds, not every frame) terrain
  rescan so patchy snow ground-cover respects sculpting without paying the
  cost every frame.
- **`WindArrowMesh`** reads no `WorldState` at all — `setWind(id)` takes the
  UI's selected `WindId`, not a simulated value.

---

## 8. Editing and picking (`SitingCursor`, `ui/siting.ts`, `ExtentCage`)

- **Raycasting** (`ui/siting.ts`'s `pickTerrainCell` → `worldToGrid`) hits the
  terrain **Group** recursively (`raycaster.intersectObject(terrainMesh.mesh,
  true)`). Anything added to that group becomes a potential collider. The
  skirt mesh (§3.2) sets `raycast = () => {}` for exactly this reason — see
  RENDER_NOTES.md's "terrain Group is raycast recursively" entry before
  adding any new child to `terrainMesh.mesh`.
- **Picking is against the flat plane at y=0, not the displaced GPU surface**
  — three's raycaster tests geometry attributes, not vertex-shader
  displacement, and the terrain's visual height comes entirely from
  `TERRAIN_DISPLACE_INJECT` in the vertex shader (§3.1). This is
  intentional, not a bug to "fix" by trying to raycast the displaced surface.
- **`ExtentCage`** reads `world.seaLevel` / `world.meanHighWater` only at
  reconstruction time (`rebuildExtentCage()` in `main.ts`, called whenever
  sea/tide changes) — it is rebuilt wholesale, not updated incrementally, so
  don't look for a per-frame update path that doesn't exist.

---

## 9. "I want to change X" — quick lookup

| Change | Start here |
|---|---|
| Shallow/mid/deep ocean color or the depth bands they switch at | `OceanMesh.ts` fragment shader uniforms (`uShallowColor`/`uMidColor`/`uDeepColor`/`uShallowDepth`/`uMidDepth`) — §4.2 |
| Shoreline foam (inland water) | `WaterMesh.ts` fragment shader, the `foam`/`uFoamColor` block |
| Shoreline foam (open sea) | `OceanMesh.ts` fragment shader, `uFoamColor`/`uFoamDepth` |
| The shape of the seabed past the map edge | `seabed.ts` — **then check both `TerrainMesh` and `OceanMesh`**, §3.2 |
| Default (non-overlay) terrain color | `ui/terrainEncoding.ts` **and** `TERRAIN_COLOR_INJECT` in `TerrainMesh.ts` — both, §3.1 |
| An inspector overlay's color | `TerrainMesh.ts`'s `applyOverlay` switch — CPU path only, doesn't touch the GPU path |
| Sun direction, sun color, sky tones | `lightingRig.ts` — never a per-file literal, §4.3 |
| Whether a mesh casts/receives shadows | Where the mesh is constructed (`TerrainMesh` constructor, or `main.ts`'s post-construction `castShadow`/`receiveShadow` assignments) |
| Vegetation silhouette per guild | `OccupantMesh.ts`'s `build*Geometry` functions, §6 |
| Vegetation placement pattern (the lattice gap) | `OccupantMesh.ts` instance-matrix loop — needs sub-cell jitter, §6 |
| Quality tier behavior (what turns off on low-end devices) | `QualityTier.ts` — remember this changes what SSAO/bloom findings even mean, see RENDER_NOTES.md's "quality tier silently changes what you are looking at" |
| Water display lag/smoothing | `config.waterDisplayTauSeconds`, consumed in `WaterMesh.updateFrom`, §4.1 |

---

## 10. Single-source-of-truth files — don't reintroduce a second copy

These exist specifically because duplicating them once already shipped a
visible bug (documented in each file and in RENDER_NOTES.md). If you find
yourself about to write a second definition of one of these, stop:

- **`lightingRig.ts`** — sun direction/color, sky tones. (Near-black water bug.)
- **`seabed.ts`** — seabed shape past the grid, geometry *and* depth. (Mismatched trough/color bug.)
- **`fieldTexture.ts`** — field upload + sampling conventions (flip, clamp, filter, bilinear helper).
- **`ui/terrainEncoding.ts` ↔ `TERRAIN_COLOR_INJECT`** — the one *tolerated*
  exception, because TS and GLSL genuinely can't share a function body. Kept
  in sync by hand, by comment convention, not by tooling — see §3.1.

---

## Relationship to other docs

- **What the sim computes and owns** → [SIMULATION_MODEL.md](SIMULATION_MODEL.md)
- **Engine traps, conventions, and how to measure output correctly** → [RENDER_NOTES.md](RENDER_NOTES.md)
- **Current visual bar and per-piece critique history** → [VISUAL_UPGRADE_NOTE.md](VISUAL_UPGRADE_NOTE.md)
- **The gauntlet-loop workflow this file was written to support** → `.claude/skills/gauntlet-loop/SKILL.md` Step 4.6
