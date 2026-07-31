# Time throughput — what each rate actually delivers (L1 + L6)

Measured 2026-07-31 on the reference machine (Darwin 25.5.0, Node 24.14), default
island, `moderate` rain, world facts per [DECISION_CONFORMANCE.md](../DECISION_CONFORMANCE.md) §5.
Method: drive the real frame loop — `SimClock.tick(1/60)` followed by that many
`WorldState.stepEvent()` calls — for 4 wall-seconds at every rate on the ladder,
and compare steps delivered against steps demanded.

Not a probe: throughput is machine-dependent, so it is recorded here rather than
baselined into `probe --all --check`. The *behavioural* half — deferral, the
guard, and label ↔ delivery agreement — is asserted headlessly in
`src/sim/time-invariance.test.ts` and `src/ui/timeRates.test.ts`.

## Per-event-step cost

| Case | ms / event step | steps affordable in a 16.67 ms frame |
|---|---|---|
| event band only, dry (< 1 sim-day) | 0.853 | 19 |
| event band only, wet | 0.843 | 19 |
| amortized dry, 10 sim-days | 0.703 | 23 |
| amortized wet, 10 sim-days | 0.918 | 18 |
| amortized wet, 100 sim-days | 0.913 | 18 |

Worst realistic case is the amortized wet figure — 0.918 ms — because it carries
the daily, seasonal, annual and decadal band commits as well as the event band.
`config.maxStepsPerFrame = 16` is that measurement minus ~1.9 ms of frame budget
kept for the frame's own work.

## Delivered vs demanded, at `maxStepsPerFrame = 16`, `maxTimeDebtSteps = 64`

| Rate | demand (steps/frame) | delivered | dropped | debt | sim ms/frame (mean) | sim-days / wall-s |
|---|---|---|---|---|---|---|
| `1 s/s` | 0.00 | — | 0 | 0 | 0.00 | 0.00 |
| `1 min/s` | 0.00 | — | 0 | 0 | 0.00 | 0.00 |
| `1 h/s` | 0.07 | 16/16 (100.0%) | 0 | 0 | 0.11 | 0.04 |
| `1 day/s` | 1.60 | 384/384 (100.0%) | 0 | 0 | 1.78 | 1.00 |
| `1 week/s` | 11.20 | 2688/2688 (100.0%) | 0 | 0 | 12.38 | 7.00 |
| *`1 month/s` — withheld* | 48.00 | 3840/11520 (**33.3%**) | **7616** | 64 | 17.34 | 10.00 |

**Every offered rate delivers 100.0% of what its label claims, with nothing
dropped.** The withheld row is the point of the exercise: `1 month/s` reproduces
the old defect exactly — a 33.3% delivery rate against a label promising 100%,
which is the same shape as the pre-L1 "16×" running at an effective 5.00×. It is
not offered, so the ladder cannot lie.

## What this replaces

| Old control | What it actually was |
|---|---|
| "1×" | 54,000× real time — 15 sim-hours per wall-second |
| "4×" | 216,000× |
| "16×" | 270,000× (effective 5.00×; 6600 of 9600 steps discarded per 10 wall-s) |
| true real time | unreachable, by a factor of 54,000 |

The new default is `1 day/s`, the nearest nameable rate to the old "1×".

## Residuals, stated not hidden

- **The floor is quantised.** `1 s/s` is true real time as a *rate*, but the
  clock's quantum is one 15-sim-minute event step, so the world advances in
  15-sim-minute jumps every 15 wall-minutes. The rate is honest; the cadence is
  coarse, and that is `config.eventDtMinutes` showing through rather than
  anything L6 introduced.
- **Worst-frame cost exceeds the mean.** At `1 week/s` the mean sim cost is
  12.38 ms but the worst frame reached 43.37 ms, when a full 16-step catch-up
  lands on the same frame as a seasonal band commit (the most expensive single
  call in the system, 7.53 ms). The debt mechanism absorbs that hitch on
  following frames instead of discarding it — which is the L1 change working,
  not a failure of it.
- **Branch mode doubles the per-step cost.** `branchSession.stepBoth()` runs two
  worlds, so `1 week/s` costs ~24.8 ms/frame while comparing lanes. The ceiling
  is not re-derived per mode; carried debt absorbs the difference.
- **The calendar incoherence is untouched and now visible.** At any labelled
  rate the world still receives 10 years of seed-bank dynamics and 360 years of
  geomorphology per labelled sim-year
  ([time-architecture review](../reviews/2026-07-31-time-architecture-review.md) §2).
  L6 makes that legible; **C-024** decides it. Nothing here rescales a band.
