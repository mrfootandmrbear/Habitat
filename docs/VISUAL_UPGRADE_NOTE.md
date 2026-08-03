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

## Honest scope note

"AAA quality" here means: real shadow mapping, PBR materials with image-based lighting, a proper water shader, post-processing (tone mapping, bloom, ambient occlusion, anti-aliasing), richer instanced vegetation, and an adaptive quality tier so it still runs on iPad Safari. It does not mean verified parity with, or a blind win against, any specific shipped commercial title — that isn't a claim this note or the accompanying work makes.
