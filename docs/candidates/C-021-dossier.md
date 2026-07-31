# C-021 — Season as a force dial

**Status:** Open (machine half discharged — owner taste unverified)

**Criterion (verbatim, DECISION_CONFORMANCE).** A Force-panel season / seasonal-regime control (no cell arguments) changes which seasonal-band outcomes fire or how strongly under identical terrain and rainfall/heat settings; paired regimes diverge on a named seasonal observable (T-001 hash or field delta); the dial has a real-world referent (N-004) and does not rewind or erase legacy state (S-007).

## Machine half (discharged)

| Claim | Result | Artifact |
|---|---|---|
| Force-panel control, no cell args | `setSeasonPressure(multiplier: number)` — single global scalar, no `(x, z)` | `src/sim/WorldState.ts`, `src/ui/controls.ts` `#season-regime` select |
| Distinct from Heat (C-011) | Scales establishment-tick strength (phenology pressure / day-length referent), never gates HSI/limiting factor — Heat keeps sole ownership of the temperature axis | `src/sim/climate/seasonRegime.ts`; `seasonRegime.test.ts` "does not gate on temperature" |
| Paired regimes diverge | `long` earns more herb biomass than `short` under identical seed/HSI after one seasonal tick | `season-regime` probe; `seasonRegime.test.ts` |
| Neutral default | `typical` (=1) reproduces the pre-dial unscaled `runHerbEstablishmentStep` output exactly — every existing probe/test that never touches the dial is unaffected | `seasonRegime.test.ts` "untouched dial matches explicit typical"; `npm run probe -- --all --check` green with zero drift elsewhere |
| Does not erase legacy state (S-007) | Season pressure only scales additive growth for the current tick; existing biomass never decreases from the dial alone | `seasonRegime.test.ts` "never erases existing biomass" |
| Determinism (T-001) | Identical dial + identical seed → identical `stateHash()` | `seasonRegime.test.ts` "replay determinism" |

**Notebook seed.** The warm hollow grew fastest under the long season; the same warmth, given less season, grew slower — not less alive, just less pushed.

**Slice.** G — Season + erosion-intensity dials (`docs/slices/G.json`).

## Owner half (outstanding)

Not yet sat. **Do not Lock** — DECISION_CONFORMANCE names the owner as judge of whether the dial *reads* as choosing the season the place is living through, distinct from a calendar-skip cheat.

## Owner-only question (unasked)

When you set the season dial and watched growth respond, did it feel like you chose how much of the growing season this place gets — or did it feel like a second heat knob, or a fast-forward?
