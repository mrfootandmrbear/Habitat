# C-014 — How audio derives from simulation state

**Status:** Open (owner half incomplete — audible silence unverified)  
**Criterion (verbatim).** One registry field audibly drives one source, demonstrated both ways: raising the field raises the source, and **removing the field produces meaningful silence** rather than a missing asset (AUD-002). The audio layer holds no authoritative state and consumes no simulation RNG stream (T-006, T-001).

## Machine half (discharged)

| Claim | Result | Artifact |
|---|---|---|
| Field → source mapping | `water.surfaceDepth` mean → `ambient.water` gain | `src/audio/AudioBus.ts` |
| Raising the field raises the source | depth 0 → 0; 0.05 → 0.2; 0.125 → 0.5; ≥0.25 → 1 (saturation) | `src/audio/audio.test.ts` |
| Removing the field → meaningful silence | dry grid → `level === 0`, `silent === true` (true 0, not a quiet floor) | same |
| Write isolation | `audioObserver.writes === []`; sample + mutate snapshot copy leaves `stateHash` unchanged | same |
| RNG isolation | AudioBus mix path contains no `Math.random` / sim RNG; same depths → identical mix | same |
| No Web Audio in CI | Mix is pure data; `applyMixToGain(null)` / `createAmbientBeds()` without AudioContext are no-ops | `src/audio/webAudioHook.ts` |
| Live beds (Wave 0) | First user gesture creates `AudioContext` + two looping beds; gains driven by existing mixes; text-hint stand-ins retired | `webAudioHook.ts`, `main.ts`; composition `docs/slices/W0-composition.md` |

**Notebook seed.** The hollow went quiet when the water left.

**Slice.** A — Audio scaffold (`docs/slices/A.json`); live wire — Wave 0 (`docs/slices/W0.json`). C-014 remains **Open**; do not promote.

## AUD-003 recovery bed (Slice A+ — machine)

Second bed, same contract: `veg.cover` mean → `ambient.life`. Bare → silent; 0.25 → 0.25; 0.5 → 0.5; ≥1 → 1. Independent of the water bed. Composition: `docs/slices/A-plus-composition.md`. Does **not** close C-014 owner half. Wave 0 feeds this mix into a real gain node.

## Owner half (2026-07-30 stewardship sitting) — partial

[batch-stewardship-alive.md](../playtests/batch-stewardship-alive.md) Q-C: **"cannot hear, by appearance yes it was still."**

| Half | Result |
|---|---|
| Stillness-by-appearance | **Pass** (visual still when water left) |
| Audible silence (AUD-002 / criterion) | **Unverified** — owner environment could not hear (beds were unwired) |
| Lock | **Do not Lock** — DECISION_CONFORMANCE owner half for silence-as-ecological needs hearing |

**Unblocked (Wave 0):** live ambient beds now exist. Owner sitting can hear. Leave **Open** until the question below is answered.

## Owner-only question (still outstanding)

When the water left, did the quiet feel like the place going still — or like the sound broke?
