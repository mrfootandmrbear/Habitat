# C-022 — Erosion intensity as a force dial

**Status:** Open (machine half discharged — owner taste unverified)

**Criterion (verbatim, DECISION_CONFORMANCE).** A Force-panel erosion / geomorph intensity control (no cell arguments) scales existing hillslope/channel/shore work under one GEO-002 law; paired high vs low intensity on identical terrain diverges on channel loss / deposit metrics with mass conserved (H-004); intensity has a storminess / disturbance referent (N-004).

## Machine half (discharged)

| Claim | Result | Artifact |
|---|---|---|
| Force-panel control, no cell args | `setErosionIntensity(multiplier: number)` — single global scalar, no `(x, z)` | `src/sim/WorldState.ts`, `src/ui/controls.ts` `#erosion-intensity` select |
| One law, dialled intensity (T-004 / GEO-002) | Multiplier scales the existing hillslope + coastal erosion terms in `runGeomorphologyStep`; no second erosion `Process`; soil production is never scaled (weathering ≠ disturbance, N-004) | `src/sim/WorldState.ts` `erosionScale`; `erosionIntensity.test.ts` |
| Paired regimes diverge | `stormy` channel loss > `calm` channel loss on identical ramp+pit terrain | `erosion-intensity` probe; `erosionIntensity.test.ts` |
| Neutral default | `moderate` (=1) reproduces the pre-dial unscaled `runGeomorphologyStep` output exactly — every existing probe/test that never touches the dial is unaffected | `erosionIntensity.test.ts` "untouched dial matches explicit moderate"; `npm run probe -- --all --check` green with zero drift elsewhere |
| Mass conserved (H-004) | Total soil-column mass on the closed ramp world does not shrink unexplained under either `calm` or `stormy` | `erosionIntensity.test.ts` "both conserving mass"; `erosion-intensity` probe `massOk` |
| Determinism (T-001) | Identical dial + identical seed → identical `stateHash()` | `erosionIntensity.test.ts` "replay determinism" |

**Notebook seed.** The same channel wore down twice as fast under the stormy dial as under the calm one — the same slope, worked harder.

**Slice.** G — Season + erosion-intensity dials (`docs/slices/G.json`).

## Owner half (outstanding)

Not yet sat. **Do not Lock** — DECISION_CONFORMANCE names the owner as judge of whether dialling intensity feels like choosing how hard the landscape-work forces act, distinct from a "smooth this hill" brush.

## Owner-only question (unasked)

When you turned the erosion dial up and ran time, did it feel like you chose how hard the place gets worked by weather — or did it feel like a smoothing tool acting on the terrain directly?
