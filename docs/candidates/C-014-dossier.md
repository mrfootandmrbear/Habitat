# C-014 — How audio derives from simulation state

**Status:** Open (owner-judged half outstanding)  
**Criterion (verbatim).** One registry field audibly drives one source, demonstrated both ways: raising the field raises the source, and **removing the field produces meaningful silence** rather than a missing asset (AUD-002). The audio layer holds no authoritative state and consumes no simulation RNG stream (T-006, T-001).

## Machine half (discharged)

| Claim | Result | Artifact |
|---|---|---|
| Field → source mapping | `water.surfaceDepth` mean → `ambient.water` gain | `src/audio/AudioBus.ts` |
| Raising the field raises the source | depth 0 → 0; 0.05 → 0.2; 0.125 → 0.5; ≥0.25 → 1 (saturation) | `src/audio/audio.test.ts` |
| Removing the field → meaningful silence | dry grid → `level === 0`, `silent === true` (true 0, not a quiet floor) | same |
| Write isolation | `audioObserver.writes === []`; sample + mutate snapshot copy leaves `stateHash` unchanged | same |
| RNG isolation | AudioBus / webAudioHook contain no `Math.random` / sim RNG; same depths → identical mix | same |
| No Web Audio in CI | Mix is pure data; `applyMixToGain(null)` is a no-op | `src/audio/webAudioHook.ts` |

**Notebook seed.** The hollow went quiet when the water left.

**Slice.** A — Audio scaffold (`docs/slices/A.json`). C-014 remains **Open**; do not promote.

## Owner-only question

When the water left, did the quiet feel like the place going still — or like the sound broke?

(Not a playtest request by itself; joins the Tier-O batch when the ask gate fires.)
