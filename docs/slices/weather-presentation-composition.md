# Weather presentation — cloud-sourced precip, phase motion, patchy snow, weather fog

**Cited:** [C-020-dossier.md](../candidates/C-020-dossier.md) G6–G9; C-020 Locked (v2.0.13, delivery model untouched); D-007 Locked (no new Process, clip gate does not apply); T-006 (observer-only); C-004 Locked (no cell targeting).

## Why the fix stays inside C-020's Lock

C-020's Lock covers the *delivery model*: climate dial → `cloudWater` → orographic discharge, phase from air temperature, no cell arguments on any climate API. None of that changed. `CloudMesh` and `RainCueMesh` are presentation (T-006) — they read `world.cloudWater` / `world.precipPhase` and draw something; they never write back. Everything here is a render-layer follow-up to the G1–G5 pass the Lock itself already banked, named G6–G9 in the same dossier rather than filed as a new candidate, because it doesn't touch the criterion the owner already Locked.

## G6 — precip needed a visible source

`RainCueMesh` scattered ~1400 points uniformly across the whole world and `CloudMesh` drifted 7 bodies on a completely independent track — nothing tied the two together, so rain read as a spigot regardless of where the clouds actually were. Two pieces close this:

- `releasingCloudCount(regime, totalClouds)` (`stormCue.ts`) maps `stormCueStrength` (the same ladder G5 already established: arid weakest, wet strongest) onto a discrete count of the fixed 7-body pool. This is also the answer to the owner's framing question — "how many precipitation-releasing clouds are coming" reads directly off the existing regime dial, no new state.
- `CloudMesh.getReleasingFootprints()` picks the top-N bodies by their *existing* windward-biased opacity (the G4 ranking) as this frame's releasing set, and reports their world-space position + an approximate radius (derived from each body's own sphere radius × mean XZ scale, computed once at construction). `RainCueMesh.setCloudFootprints()` takes that list; when a particle would respawn, it now spawns under one of those footprints instead of a uniform random `(x, z)`. Deterministic selection (`i % footprints.length`), no new RNG source — the assignment of particle-slot to cloud is fixed, only the jitter within a footprint uses `Math.random()`, exactly like the uniform-scatter code it replaces.

Empty footprints (nothing releasing yet, e.g. right as a spell arms) fall back to the old uniform scatter so precipitation never just vanishes for a frame.

## G7 — rain and snow were the same particle

Fall kinematics were identical across phases; only `PointsMaterial.color`/`size` changed in `setStorm`. Real divergence needed three numbers per phase, applied in `update()`: fall-speed multiplier (rain 1×, sleet 0.7×, snow 0.35×), wind-response multiplier (rain 1×, sleet 1.2×, snow 1.6× — snow is lighter, blows more), and a sway amplitude (0 for rain, ramping to 0.55 for snow) driven by a per-particle-phase sine/cosine pair so flakes drift and tumble instead of falling straight. A true motion-streak (elongated rain geometry, e.g. `LineSegments` trailing the previous position) was considered and rejected for this pass — it would have meant swapping `Points` for a second geometry/material pair per phase, a larger and riskier change than the kinematic divergence actually asked for; flagged as a follow-up if the point-based read still isn't enough.

## G8 — snow needed to look like it fell somewhere specific

`groundCover` was a single translucent plane whose opacity was the entire signal — presentation-correct (still the melt-on-contact hold the C-020 Lock already accepted; SWE stays off the tip) but visually a flat sheet. `computeSnowAffinity(elevation, width, height)` (new file, `render/snowAffinity.ts`) reads `world.terrain.data` — already-existing state, nothing new — and combines normalized elevation (higher collects more), inverse local slope via central differences (flatter collects more, steep sheds), and a deterministic value-noise pass (patch-scale, not per-cell static) into a 0..1 mask. `buildSnowAffinityTexture` bakes that into an RGBA `DataTexture` reused as `groundCover`'s `alphaMap` — three.js multiplies material `opacity` by the sampled channel automatically, so `groundOpacity`'s existing build/melt schedule is untouched; only the per-texel weighting is new. Recomputed on terrain regenerate and throttled to once every few seconds while snow is relevant during play, so sculpting mid-storm doesn't go stale without re-scanning the grid every frame.

One orientation note: three's default `PlaneGeometry` V decreases with the geometry's local +Z row index (the same fact `fieldTexture.ts`'s `fieldUv` helper corrects for in the GPU terrain shader), but the built-in `alphaMap` sampling path has no equivalent custom UV flip. `buildSnowAffinityTexture` bakes the flip into the data instead (writes grid row `z` into texture row `height-1-z`) rather than adding a custom shader just for this plane.

## G9 — the haze had nothing to say

`Scene.ts`'s `Fog(0xb8c9d4, 70, 140)` is set once at construction and never touched again. At `worldSize=48` with the default camera ~55 units from target, that band mostly sits beyond where the camera normally looks — inert render cost, not a signal, which is exactly the "doesn't really do much" complaint. `weatherFogRange(base, veilStrength, cloudCover)` pulls both bounds in proportionally (`veilStrength` from `RainCueMesh`'s own overcast-veil opacity, `cloudCover` from `CloudMesh.meanOpacity()` — both already-computed presentation scalars) and relaxes back to the authored base on a clear day. `main.ts` captures `scene.fog`'s authored near/far once at startup as the base rather than hardcoding 70/140 a second time, so `Scene.ts` stays the single source of truth for the undriven range.

## Deferred / rejected

- **Persistent SWE store.** Explicitly off the tip (AGENTS.md, `CLOUD_AGENT_PIPELINE.md`). G8 stays a recomputable, stateless mask over existing terrain — nothing persisted, nothing WorldState reads back.
- **Rain motion-streak geometry.** Noted under G7 — a real elongated-trail look is a larger, separate change; the kinematic divergence shipped here is the legibility gap that mattered most.
- **Cell-targeted footprints from player input.** Footprints come only from `CloudMesh`'s own drift/opacity state, never from siting cursor or click position — the C-004 boundary this dossier already holds.

## Tier-P

`src/ui/stormCue.test.ts` — G6 (`releasingCloudCount` ladder + floor/ceiling; `CloudMesh` footprint count and finiteness; `RainCueMesh` footprint-clustered spawn vs. uniform-veil baseline), G7 (snow mean-height drop under rain's in one step, same wind/dt), G9 (fog pulls in monotonically with veil/cover, relaxes to base, ratio preserved). `src/render/snowAffinity.test.ts` — G8 (flat-uniform terrain still varies from noise; higher flat ground beats lower flat ground; a steep step sheds relative to either flat side; texture shape sanity).
