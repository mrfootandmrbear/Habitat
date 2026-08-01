# Fire spread as a rate — composition

**Cited:** [fire/fuel review](../reviews/2026-07-31-fire-fuel-review.md) §1–§3 (and §5 for the slope clamp); T-001 Locked (determinism); T-006 Locked (single WorldState authority); C-003 Open (authored ignition, untouched); ES-002 (disturbance is a process, not a punishment); §2.1 Refinement invariant class.

## Three defects, one function, one root cause

`runFireStep` took `dt` and never read it — the parameter was literally named `_dt`. The BFS ran from every burning cell to full queue exhaustion inside one call, and the post-effects loop cleared every burn flag before returning. So a whole connected fuel region burned instantly, a 1-hour tick and a 30-day tick produced identical results, and `fire.burning` — a *declared written field* — was never observably `1` to the renderer, the inspector, or vegetation feedback.

The other two defects fall out of the same design. Because nothing tracked which cells were alight between calls, the function rebuilt its world every step: a fresh full-grid `Uint8Array` for `visited`, a full-grid scan for sources, and a full-grid scan for effects. The `intensity` reset lived only in that last scan, behind an early `return` taken when no sources were found — so once a fire went out, the early return skipped the only line that could clear it and the cell reported its last burn's intensity forever. And `visited` was marked on a candidate *before* the spread gate was tested, so a cell rejected when probed from one neighbour was permanently excluded from the neighbour that would have carried fire into it.

Fixing the rate required tracking the front explicitly, and tracking the front explicitly is what fixes the other two.

## The rate is `ROS · Δt / Δx`, in rings

Spread is now capped at a whole number of cell-rings per call: `fireRateOfSpreadMetersPerMinute · dt · eventDtMinutes / cellSizeMeters`, floored. `dt` is event-band units (1 = one event step), matching every other rate in the band. At the shipped event step this is **3 rings per step** — the front moves visibly without crossing the map in one tick.

ROS is `2` m/min (≈0.033 m/s), the moderate end of an unwinded surface fire in light fuels. It is a real-world rate in real-world units, so it composes with the L6 rate ladder rather than being tuned against a tick.

Measured on a flat, uniformly fuelled 40² sheet from a single ignition, where 4-neighbour spread fills a Manhattan diamond:

| `dt` | rings | burned cells | closed form |
|---|---|---|---|
| 1 | 3 | 25 | 1 + 4·(1+2+3) |
| 2 | 6 | 85 | 1 + 4·(1+…+6) |
| 4 | 12 | 313 | 1 + 4·(1+…+12) |

Every count is exactly the diamond its ring budget predicts, and reach is linear in `dt`. Before this change all three rows read the same number.

**Known limit, stated rather than hidden.** The ring budget floors, so a `dt` small enough that the front has not yet crossed one cell (below ~0.34 event steps at the shipped ROS and Δx) advances zero rings. The fire still burns and still has duration at that `dt` — it just does not spread, which is the honest behaviour at a resolution where sub-cell front position is not representable. Production never calls it there (`stepEvent` passes `dt = 1`). A fractional-ring carry would remove the floor entirely, but it is integrator state that would have to be serialized to survive save/load, and this slice did not need it.

## Duration, and the intensity that used to outlive the fire

A cell now keeps `burning = 1` while it still carries fuel at or above `fuelSpreadThreshold`, and goes out below it. With 85% consumption per step a rich cell burns for two steps and a whole 16² sheet of 3.0 kg/m² fuel takes **7 steps** to burn out — a fire with a beginning, a middle, and an end, which is what ES-002 asks disturbance to be and what A-002 / A-006 need in order for intervention to mean anything.

Intensity cleanup moved to the *front* of the function, into the same single pass that collects the active front:

```
if (burning[i] > 0.5) active.push(i);
else if (intensity[i] !== 0) intensity[i] = 0;
```

This is deliberately on the near side of the `active.length === 0` early return, which is precisely where the old reset was not. An isolated fuel cell measured through the fix: intensity `0.85` after the step it burns, `0` after the next — the field clears within one tick of the last active cell going out, and stays cleared.

Net loop count also went *down*: the old function made two full-grid passes plus a full-grid allocation per call; the new one makes one full-grid pass and walks explicit cell lists for everything else. `claimed` is a persistent stamped `Int32Array` rather than a per-call `Uint8Array`, so a fire step allocates nothing. It is integrator scratch, deliberately outside the registry — it never enters `stateHash` and needs no save/load (T-006).

## `visited` gates re-entry, not eligibility — and the burn shape claim is now tested

`claimed` is now set only when a cell actually ignites. A cell that fails the gate stays unclaimed and remains probeable from every other neighbour in the same ring, so ignition is the logical **OR** of the spread test over all already-burning neighbours — which is order-independent by construction. The frontier is also re-sorted ascending at every ring, making true the "sorted queue by index" claim the old comment made about what was in fact a plain FIFO.

The review said burn shape was an artifact of scan order; this slice measured how much. On a ridged 16² case with gate strengths deliberately near threshold, **32 cells** have an outcome that depends on which neighbour probes them. Replaying the *old* mark-before-test rule on that same case and rotating the neighbour order N/S/W/E:

| neighbour order | ignited cells (old rule) | same burn as base? |
|---|---|---|
| base | 42 | — |
| rotate 1 | 42 | yes |
| rotate 2 | 42 | **no** |
| rotate 3 | 41 | **no** |

So the invariance test in `fire.test.ts` is a real regression guard, not a tautology: it fails against the code this slice replaces and passes against the code it ships. That is the claim the original comment asserted and never checked.

## The slope factor saturates

`exp(slopeA · dz/Δx)` was unbounded over a *player-controlled* elevation difference. A near-vertical sculpted face produced a factor in the thousands, swamping both fuel and moisture and making any cliff edge an unconditional ignition source no matter how wet it was — a sculpting tool that silently doubled as an igniter.

The factor is now clamped at `fireSlopeFactorMax = 5`. The number is chosen against the gate it has to lose to, not picked for feel: at the ceiling a cell still needs `moistureFactor > fireSpreadStrengthMin / 5 = 0.03` to catch, i.e. soil moisture below ~0.97 × extinction. Moisture stays decisive at every gradient the player can sculpt. Verified at 500 m of rise across one 10 m cell (unclamped, `e^40`): a nearly-saturated cell does not ignite, a dry one does, and ordinary relief is untouched because the clamp does not engage there. Real rate of spread saturates with slope, so the ceiling is the physical behaviour as well as the safe one.

## Baselines that moved, and why

**`burn-recover`** — the one probe baseline this slice moves, and every headline number is analytically accounted for rather than merely re-recorded:

| metric | before | after | why |
|---|---|---|---|
| `fire.burnedCells` | 256 | 133 | 256 was the *entire 16² grid* — the old BFS ran to exhaustion. 133 is exactly the 49-cell ignition brush disc (radius 4) plus 3 rings of spread, computed independently and matched cell-for-cell. |
| `fire.consumed` | 741.465 | 385.214 | 133 cells × 3.4075 kg/m² × 0.85 consumption = 385.2. |
| `fire.accountingError` | 6.1e-6 | 3.2e-6 | conservation still holds, slightly tighter over fewer cells. |
| `fire.determinismMatch` | 1 | 1 | **unchanged** — T-001 intact. |
| `fire.hashN` | 2096492907 | 31881457 | intentional physics change. |
| `delta.wetVsDry` | 6.480 | 1.812 | still > 1; the ecological claim survives. |

The probe's own internal assertions — determinism, fuel accounting, wet-recovers-more-than-dry — all still pass; only the recorded values moved.

One honest caveat, now written into the probe's docstring: with a rate-limited single step the two moisture sectors are no longer burned to identical depth, because the centred ignition sits on the dry side of the `x < w/2` split. The recovery claim is unaffected and reads cleanest as a *change* rather than a level — over the recovery window the dry sector gains **0.000** cover while the wet sector climbs **0.336 → 0.410 → 0.608**. That comparison has no burn-extent confound in it at all.

**`fire.test.ts`** — anticipated to move; it did not. All 19 pre-existing assertions pass **unchanged** against the new implementation, which is the useful result: the rate rewrite preserved every behaviour the slice already claimed (no spread without fuel, wet ground stops fire, determinism, conservation, bounds) and only added duration and rate on top. Ten new tests were added, not edited.

No other probe baseline moved; the full suite was re-checked.

## Deferred — named, not silently dropped

- **`veg.cover` is read by `runFireStep` but absent from `fireProcess.reads`** (review §5), and the cover kill is an in-place multiplicative write against a declared *contribute*. Both are real, but the fix changes scheduler topological order and therefore has a blast radius well outside a fire-rate slice. Not taken here.
- **`fuelMoistureExtinction` is miscalibrated against its own name** by 15–45% (review §5) — the hard moisture check is unreachable behind the `spreadStrengthMin` gate. `fireSpreadStrengthMin` was moved into `config.ts` at its existing value `0.15` (numerically inert, needed as a parameter by the extracted module), but the calibration itself is untouched: it belongs with the fuel numerics, not here.
- **Intensity is still a fuel-mass quantity with a magic clamp**, not Byram fireline intensity (`I = H·w·R`). Unchanged — this slice fixes *when* intensity clears, not what it means.
- **No wind term.** Parked deliberately per the review: it is the dominant real-world rate-of-spread driver and the highest-value single addition now that spread has a rate for it to modify.
- **Fuel and scar `dt`-fragility** (review §4) is §4.45's, immediately next in the queue.
