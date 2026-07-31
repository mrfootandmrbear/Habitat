# Slice L1 + L6 — Time throughput defect, and the clock in real-world units

**Status:** Done — machine (defect fix + permitted tuning/presentation)
**Register:** S-009 Current; T-002 Locked; T-001 Locked; D-006; U-003; C-008 Open
**New Process?** no — presentation cadence, rate values and labels only. The
fixed timestep, every band period, and every authoritative outcome are
unchanged, so no probe baseline and no `GOLDEN_*` hash moves. D-007 clip gate
does not apply.
**Evidence:** [time-throughput.md](../evidence/time-throughput.md)

Shipped together because they are one defect seen from two sides: L1 is the
clock discarding time it promised, L6 is the label that made the promise
unstateable. Fixing either alone leaves the other lying.

## L1 — the surplus is owed, not lost

[SIMULATION_MODEL §6.4](../SIMULATION_MODEL.md) already specified this and named
it a defect: *"`config.maxStepsPerFrame = 5` currently drops the surplus
silently… Under S-009 the dropped time must be visible."*

`SimClock.tick` ran up to `maxStepsPerFrame` steps and then **drained the
accumulator** of everything past it, so a rate the machine could not hold in one
frame quietly became a slower rate. Now the leftover stays in the accumulator as
debt and is paid down on later frames.

```
tick(wallDt):
  accumulator += wallDt · timeScale
  run steps while accumulator ≥ simDt, up to maxStepsPerFrame   // per-frame ceiling
  // leftover accumulator IS the debt — carried, not drained
  if accumulator > maxDebtSteps · simDt:                        // spiral-of-death guard
      abandon the overflow and surface it
```

Two ceilings, doing two different jobs:

| Constant | Job | Value |
|---|---|---|
| `maxStepsPerFrame` | hard bound on worst-case frame cost | 16 (was 5) |
| `maxTimeDebtSteps` | how much may pile up before the rate is admitted unsustainable | 64 (4 frames) |

16 is measured, not chosen: 0.918 ms per event step in the worst realistic case
(wet, crossing every band) means 18 steps fit a 16.67 ms frame with no render
left; 16 keeps ~1.9 ms of that budget and still leaves ~4.8 steps/frame of
catch-up above the fastest offered rate, so debt can actually be worked off.

`getTimeDebt()` now means *owed* and `getDroppedSteps()` means *abandoned past
the guard*, where before they were the same counter. §6.4 says the correct
response to sustained debt is to lower the player's rate rather than skip ticks,
so the HUD says exactly that when the second one is non-zero.

An epsilon (`1e-9` of a step) guards both the step loop and the debt readout.
Without it an accumulator summed and drained in floating point strands the last
owed step just below the boundary, and the readout and the run disagree about
what is owed by one.

## L6 — rates a person can name

The control was a multiplier against a base nobody could state. Measured: "1×"
was 54,000× real time, and true real time was unreachable by that same factor.
**T-002** is Locked and says *"exact multipliers are tuning parameters rather
than constitutional decisions"*, so this needs no candidate.

Every rate is declared as **sim-time delivered per wall-second**, and the machine
scale is derived from `config.eventDtMinutes` and `config.wallSecondsPerEventStep`
in `src/ui/timeRates.ts` and nowhere else — so a label cannot drift away from the
clock it labels.

```
stepsPerWallSecond(rate) = rate.simSecondsPerWallSecond / (eventDtMinutes · 60)
timeScaleFor(rate)       = stepsPerWallSecond(rate) · wallSecondsPerEventStep
```

| Offered | Pause · `1 s/s` · `1 min/s` · `1 h/s` · `1 day/s` · `1 week/s` |
|---|---|
| Withheld | `1 month/s` — 48 steps/frame, 3× the ceiling |

`1 s/s` is true real time, reachable for the first time. `1 day/s` is the default,
the nearest nameable rate to the old "1×".

## The ceiling is a measurement, not a preference

The ladder in `TIME_RATE_LADDER` deliberately runs *past* what the machine can
hold; `sustainableRates()` applies the ceiling. A rate is offered only if its
steady demand fits `maxStepsPerFrame · CATCH_UP_HEADROOM` (0.75) — the remaining
quarter is what pays debt back down. So the end of the offered list is the result
of a throughput measurement, and the test can assert that by pointing at the
first rate past it.

That withheld rate is what makes the fix legible: `1 month/s` measured at **33.3%
delivery with 7616 steps dropped** — the same shape as the old "16×" running at an
effective 5.00×. Rates above the ceiling are now not offered, rather than offered
and discarded.

## Readout

HUD status leads with the rate label and **elapsed simulation time in real
units** — `3h 15m` → `2d 12h` → `2y 5d` on the world's own 360-day calendar
(S-009: sim time is the readout, wall time is presentation). Step counts remain,
but they are no longer the only thing a player can read the clock in.

## Surfaced, not fixed here

At `1 year/s`-scale rates the world still advances 10 years of seed-bank dynamics
and 360 years of geomorphology per labelled sim-year
([time-architecture review](../reviews/2026-07-31-time-architecture-review.md) §2).
L6 makes that incoherence visible for the first time by speaking in real units.
**C-024** decides it. No band period is rescaled in this slice.

## Bans

Rescaling any band period (that is **C-024**) · rate-selected integration floor
(that is **C-025**, and **L8** under it) · gating the event band (that is **L7**) ·
any ecological read of `timeDebt` (§6.4) · a baseline or `GOLDEN_*` move —
here that would be a defect, not an update.
