# Slice L8 — Deep-time skip + presentation LOD

**Cited:** [C-024](../DECISION_REGISTER.md) Locked; [C-025](../DECISION_REGISTER.md) Locked; [C-024-C-025-framing.md](../candidates/C-024-C-025-framing.md); [time-architecture review](../reviews/2026-07-31-time-architecture-review.md) §3; S-009; T-001; T-002; T-003; T-006; U-002; C-008.

## What was wrong

Centuries are unreachable by throughput. Continuous L6 catch-up at `1 day/s` / `1 week/s` still piles `dropped` debt; presentation under hitch produced the snow-hold freeze and precip laser-streak bugs. L7 bought dry-time savings (hash-identical); storm time and deep time need a **declared** coarser floor, not a silent skip under the rate dial.

## Lock choices (owner unlock 2026-08-06)

| Candidate | Choice |
|---|---|
| **C-025** | Discrete skip menu (1 day … 1000 years), separate from L6. Floor binds per preset. Sparse `skipSchedule` on `SaveDocument` (schema v13). HUD names floor. Floor invariance = band-refinement family ≤8%, not hash-identity across floors. |
| **C-024** | Keep compressed band periods (`annualDailySteps=36`, `decadalDailySteps=10`) for continuous L6 (**C-008**). Rates already match that calendar. Each skip floor states its coarsening in code (`commitSkip*`). Do not fix by HUD relabel alone. |

## Skip floors

| Preset | Floor | Mechanism |
|---|---|---|
| 1 day | event | `stepEvent` loop |
| 1 month | daily | `commitSkipDay` × 30 |
| 6 months, 1 year | seasonal | `commitSkipSeasonal` (+ daily remainder) |
| 5–25 years | annual | `commitSkipAnnual` (+ daily remainder) |
| 50–1000 years | decadal | `commitSkipDecadal` × (years / 10); residual via annual |

Decadal HUD years use `YEARS_PER_DECADAL_BAND = 10` so a "100 years" skip advances 100 years on `formatSimElapsed`.

## Presentation LOD

`presentationLod.ts` keys off debt / dropped / rate / skip — **no sim writes** (T-006):

| Tier | Shed | Keep |
|---|---|---|
| P0 | — | full |
| P1 (day+) | streaks, sway, cloud spin | water, snow hold, veg refresh |
| P2 (debt) | + fog drama | water, terrain uploads |
| P3 (dropped rising) | + occupant rebuild skip | hold last matrices |
| P4 (skip) | freeze weather theatre | post-skip sync; HUD floor |

## Ship gates (machine)

| Check | Result |
|---|---|
| 1-day / 1-month / 100-year duration exact | `timeSkip.test.ts` |
| Skip schedule save round-trip | schema 13, schedule length preserved |
| Seasonal vs annual 1-year cover relative error | **&lt; 0.08** |
| C-024 period assertions | 36 / 10 / 10 |
| PresentationLod tiers | unit tests for P0–P4 |

## Explicitly deferred

- **SIM §6.5 #2** semi-implicit / fewer flux substeps — next-but-one if continuous day/s still drops after LOD.
- Event-band locality (§6.5 #4).
- Owner Tier-O: does a 1000y cold skip still feel like the same place, coarser?

## Next-but-one

SIM §6.5 #2 flux cost (continuous storm hitch) **or** Track A §4.67 Seed disperser (independent tip).
