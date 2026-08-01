# Slice L7 — Activity-gated event band composition

**Cited:** [SIMULATION_MODEL.md](../SIMULATION_MODEL.md) §6.2; [time-architecture review](../reviews/2026-07-31-time-architecture-review.md) §3; S-009 Current; T-001 Locked; T-002 Locked; H-001; S-005.

## What was actually wrong

§6.2 already specifies the event band as **activity-gated** — *"Between storms the ladder starts at `daily`"* — and argues it is determinism-safe because the gate is a pure function of authoritative state. `WorldState.stepEvent` ignored that and ran surface flow + fire every simulated minute. Dry decades paid full storm-band cost for nothing.

## The gate

```
eventBandActive = (any water.surfaceDepth > 0)
               or (storm window will discharge precip)
               or (any cell burning)
```

**Surface threshold.** §6.2 writes `dryEpsilon`. `fluxStep` continues only when `w <= 0`, so any positive depth still moves. Gating on `dryEpsilon` while leaving `(0, dryEpsilon]` puddles on a slope would diverge from an ungated run. The ship gate is hash-identity, so surface activity follows flux authority (`> 0`). Presentation `dryEpsilon` is unchanged.

**Precip.** Evaluated before the step mutates cloud: armed rain regime + `regimeRainsThisEvent` for the current day/event index. That is the proactive form of §6.2's `climate.precipitation > 0` — the storm window opens the band so dawn charge and discharge run together.

## Atmosphere excluded from the gate

`atmosphereProcess` charges `climate.cloudWater` at wet-day dawn and decays it on dry days. Skipping it would freeze cloud between storms and change outcomes. Decision: **always run atmosphere**; skip only `surfaceWater` and `fire` when the gate is inactive.

```
if active:  scheduler.runBand("event")   // climate → fire → surfaceWater
else:       runAtmosphereStep()          // cloud decay / phase only
simMinutes += eventDtMinutes             // clock never skips
// daily / seasonal / annual / decadal counters unchanged
```

No analytical multi-step cloud advance — per-event atmosphere on skipped spans is exact and cheap relative to flux.

## Ship gate: hash-identity

Probe `event-band-gate`: same seed, light regime, 40 sim-days (crosses daily, seasonal, and annual at the compressed 36-day mark). Gated vs ungated:

| Metric | Value |
|---|---|
| `stateHash` match | **1** (identity, not a tolerance) |
| clock `simMinutes` | 57600 both arms |
| precip / cloud | bit-identical |
| skipped / total | **1152 / 3840** (skipFrac **0.3**) |

Ungated arm forces `setEventBandGating(false)` and runs every event step (`skipped = 0`).

## What moved

**Nothing.** Every existing probe baseline and `GOLDEN_*` hash is unmoved — the gated path is outcome-identical to the previous unconditional event band. New baseline: `docs/evidence/event-band-gate.baseline.json`.

## Deferred / explicitly not touched

- **L8 / C-024 / C-025** — coarser integration floors and the calendar fix that make centuries cheap. Still owner-judged; implement nothing under them. L7 is the honest interim (39.9 min → ~6.7 min at 30 storm-days/year per the review).
- **Event-band locality** (SIM §6.5 option 4) — step only wet cells. Separate from this gate.
- **L4 biotic motion** — next Living-wave tip; presentation only.
