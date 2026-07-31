# Fire / fuel review — the burn has no duration

> **Date:** 2026-07-31
> **Role:** Advisory measurement of fire-behavior modeling against the fire/fuel slice ([BUILD_GUIDE §4.5](../BUILD_GUIDE.md)) and its determinism/conservation claims (T-001, H-004)
> **Authority:** Does not supersede the [Decision Register](../DECISION_REGISTER.md). Plan lives in [BUILD_GUIDE.md](../BUILD_GUIDE.md) §4.44–§4.45.
> **Trigger:** Owner asked which other subsystems would benefit from the same scoped-expert-review treatment as the renderer ([3c4b9f0](https://github.com/mrfootandmrbear/Habitat/commit/3c4b9f0)); fire/fuel was the first domain picked.
> **Companion:** [living-world review](2026-07-31-living-world-review.md) and [vegetation/habitat review](2026-07-31-vegetation-habitat-review.md) — this one is fire and fuel specifically; those are the rest of the biota.
> **Scope:** `src/sim/process/fireProcess.ts`, `src/sim/process/fuelProcess.ts`, `src/sim/WorldState.ts` lines 1765–1905 (`runFuelAccumulationStep`, `runFireStep`, `decayFireScar`, `igniteCell`).

---

## 0. Verdict

Slice 10 ([BUILD_GUIDE §4.5](../BUILD_GUIDE.md), Done) claims BFS spread "cited and deterministic under T-001" and Tier-M conservation across a burn. Both claims survive, narrowly — but three defects sit underneath them that make fire behave nothing like the thing being measured:

1. **Fire has no rate of spread.** `runFireStep` ignores `dt` and the BFS runs to queue exhaustion in a single call — an entire connected fuel region burns instantly, then every burn flag clears before the step returns. A 1-hour tick and a 30-day tick burn identically, and `fire.burning` — a declared written field — is never observably `1` to anything outside the function.
2. **`fire.intensity` never clears once nothing is burning.** The only reset lives in a post-effects loop that an early return skips. A fire that has gone out keeps reporting the intensity of its last burn, forever.
3. **`visited` is marked before the spread test, not after ignition succeeds** — a cell that fails the check from one neighbor can never be re-probed from a better neighbor, so burn shape is an artifact of scan order, worst exactly on ridgelines where slope-driven runs should be strongest.

A fourth class — fuel accumulation and scar decay using a fixed-point update where the constants assume small `dt` — is a **Refinement-class bug** in the §2.1 sense ("dead `dt` / non-convergent schedules"): on the decadal band the fixed step already exceeds where the math breaks.

None of this needs a new `Process`, a wind model, or a design decision. Every finding below is a defect against the slice's own documented intent.

---

## 1. Fire has no rate of spread (critical)

`runFireStep(_dt)` (`WorldState.ts:1785`) takes `dt` as a parameter and never reads it. The BFS at `WorldState.ts:1817–1853` runs from every source cell to full queue exhaustion — i.e., across the entire connected, fuel-bearing, gate-passing region — inside one function call. `WorldState.ts:1872` then clears every `burning` flag before the function returns.

Net effect: whatever calls `runFireStep` once produces a complete, instantaneous burn of the reachable region, and by the time control returns to any other system, `fire.burning` is uniformly `0` again. The event-band cadence this runs on ([BUILD_GUIDE §4.5](../BUILD_GUIDE.md): fire is gated on fuel/moisture/slope, event band) is irrelevant to how far or how visibly the fire spreads — a real fire that should take days to cross a ridge crosses it in one tick, and there is no in-between state for the player, the renderer, or vegetation feedback to read.

The natural fix is a rate: cap BFS expansion per step at `ROS · dt / cellSizeMeters` rings, and leave `burning` set between steps so a fire has duration a player can watch and, per **A-002**/**A-006**, intervene against.

## 2. `fire.intensity` never clears (critical)

`WorldState.ts:1806` early-returns when no source cells are found (`sourceCount === 0`). The *only* place `intensity[i] = 0` is written is inside the post-effects loop at `WorldState.ts:1857–1858`, which that early return skips entirely.

Sequence: fire burns → `intensity[i]` set nonzero → `burning[i] = 0` at `WorldState.ts:1872` clears the burn flag → next call finds zero sources → returns immediately → `intensity` retains the last burn's values, indefinitely. Any consumer of `fire.intensity` — renderer, vegetation feedback, a future notebook seed about fire — sees a fire that never went out.

Fixing Finding 1 (tracking burning cells explicitly, rather than a fresh full-grid scan each call) also fixes this: a maintained set of active cells can be checked for emptiness and cleared without an early return that skips cleanup.

## 3. `visited` marked before the spread test (high)

`WorldState.ts:1831–1832` marks a candidate neighbor `visited` before `WorldState.ts:1834–1848` decides whether it actually ignites. A cell that fails the fuel/moisture/slope gate when probed from one (say, downslope) neighbor is permanently excluded from re-probing by a different (upslope) neighbor that would have passed the gate.

Consequence: fire outcome depends on BFS discovery order and on the literal neighbor-iteration order at `WorldState.ts:1823–1828` (N, S, W, E) — producing directionally biased spread and spurious unburned cells exactly on ridgelines, where slope-driven runs should be strongest. `visited` should gate re-enqueuing of a cell already in the frontier, not exclude a cell from ever being tested again; only cells that actually ignite should become permanently unavailable.

**Determinism note:** the run *is* deterministic today (no RNG, no unordered-container iteration, ledger accumulates in ascending index order at `WorldState.ts:1870`), but the code comments (`WorldState.ts:1782`, `fireProcess.ts:5`) claim the mechanism is "sorted queue by index." It isn't — the queue is a plain FIFO (`WorldState.ts:1810,1818,1850`); only the seed cells are index-sorted. Determinism currently rests on the neighbor-array literal order plus this bug, which is fragile: an 8-neighborhood, a tiled grid, or a parallelized frontier would silently change results despite the comment's implied invariant.

## 4. Fuel and scar decay are `dt`-fragile, not analytically stable (medium — Refinement class)

`WorldState.ts:1769–1776` implements explicit Euler for `dF/dt = I − kF`, but clamps the decay coefficient (`k = min(1, fuelDecayK·dt)`, `WorldState.ts:1770`) while leaving the input unclamped (`iMax = fuelInputMax·dt`, `WorldState.ts:1769`). For small `dt` the equilibrium is the intended `F* = cover·I/k`; once `dt ≥ 1/fuelDecayK`, `k` saturates at 1 and the equilibrium becomes `cover·I·dt` — growing without bound until it pins at `fuelLoadMax`. On a decadal band with variable/catch-up timesteps (the exact mechanism [Slice L1](../BUILD_GUIDE.md) exists to manage), fuel load ends up a function of tick size rather than of climate.

`decayFireScar` (`WorldState.ts:1879`) has the identical shape at smaller stakes: it advertises "exponential fade" in comment but implements `scar · (1 − 0.08·dt)`, which hard-zeroes (goes negative, presumably clamped) at `dt ≥ 12.5` rather than decaying. The `0.08` is also the one hardcoded rate in a file where every other tunable lives in `config.ts` (**AGENTS.md** non-negotiable: numbers in config are generated, not typed).

The unconditionally stable, `dt`-invariant form for both is the analytic exponential update `F' = F·e^(−k·dt) + (I/k)(1 − e^(−k·dt))`.

## 5. Secondary findings (not slice-forming on their own; fold into the above where the fix touches the same code)

- **Cover kill is an in-place multiplicative write** (`WorldState.ts:1864`: `cover[i] *= (1 − mortality)`) while `fireProcess.ts:21` declares `veg.cover` a *contribute*, and the process's own comment (`fireProcess.ts:8–9`) says fire is explicitly "not a second owner of that field." A multiplicative in-place write does not commute with an additive contribute from vegetation — if both land in the same tick the result is process-order-dependent. `veg.cover` is also read (`WorldState.ts:1789,1864`) but absent from `fireProcess.ts`'s declared `reads` (`:14`) — invisible to any scheduler dependency analysis.
- **`fuelMoistureExtinction` doesn't gate what its name says.** The hard check at `WorldState.ts:1835` is effectively unreachable (if moisture ≥ extinction, `moistureFactor ≤ 0` already fails the downstream `spreadStrength > 0.15` test at `:1848`). Real extinction is set by the interaction of that 0.15 threshold with `fuelFraction`'s floor of 1/3 (`:1844`), landing actual extinction at 0.55–0.85× the named `Mx` depending on fuel saturation — the knob is miscalibrated by 15–45% against its own name.
- **Unbounded `exp()` on player-sculpted terrain** (`WorldState.ts:1841`, `exp(slopeA · dz/dx)` with `dz` a raw, player-controlled elevation difference): a near-vertical sculpted cliff face produces a slope factor in the thousands, swamping fuel and moisture and making any cliff edge an unconditional ignition source regardless of wetness. Needs a clamp on `tanPhi` or the factor itself; real rate-of-spread saturates with slope.
- **Consumption and intensity mix per-tick amounts with rates**: `consumed = fuel · fireFuelConsumption` (`WorldState.ts:1861`) has no `dt`, `intensity = min(10, consumed)` (`:1862`) is a fuel-mass quantity with a magic clamp, not Byram fireline intensity (`I = H·w·R`, kW/m).
- **Hot-loop cost**: a 4-element neighbor array allocated per dequeued cell (`WorldState.ts:1823–1828`), a full-grid `Uint8Array` allocated and zeroed per call (`WorldState.ts:1809`), and a boxed `number[]` queue grown by `push` (`:1810`) — all avoidable with persistent scratch buffers, and all disappear naturally once burning cells are tracked explicitly for Finding 1/2.
- **No wind term.** Understood as a scope decision, not a bug — flagged because wind is the dominant real-world rate-of-spread driver and the reason fire perimeters are elliptical rather than round; the highest-value single addition once spread has a rate to modify. Parked, not queued.
- **`igniteCell` bypasses the moisture gate** (checks fuel, not moisture) and silently no-ops if no cell in the ignition brush clears the fuel threshold, with no signal to the player that ignition failed.

---

## 6. What can ship without a candidate

All of it. Every finding above is a defect against Slice 10's own stated claims (deterministic BFS, Tier-M conservation) or against a documented invariant class (§2.1 Refinement for the `dt` issues). None registers a new `Process` — D-007's clip gate does not apply.

---

## 7. Suggested work order

```
Fire spread as a rate      (Findings 1–3, same function; fixes stale intensity as a side effect of tracking active cells)
     │
Fuel / scar numeric fix    (Finding 4 — Refinement-class dt bug, independent of the above)
```

Queued as [BUILD_GUIDE §4.44](../BUILD_GUIDE.md) and [§4.45](../BUILD_GUIDE.md).

Plan sync: [BUILD_GUIDE.md](../BUILD_GUIDE.md) §4.44–§4.45; [AGENTS.md](../../AGENTS.md) queue tip.
