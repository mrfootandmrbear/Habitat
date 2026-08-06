# Bug — white ground under Heat:warm (not groundwater)

**Found:** 2026-08-05/06 owner playtests. Screenshots in this directory.
**Misread as:** temperature/groundwater rendering white, or Three.js overload.
**Actual:** weather *presentation* lying under hitch + a stale precip phase.

## Symptom

Pale / blocky white on the land under `Rainfall: wet` + `Heat: warm`, worse at
`1 day/s` / `1 week/s` (large `dropped` counts). Pause frames still show a
near-solid white blanket. Inspect: water recolors the terrain blue underneath —
the white is an overlay, not a sim field.

## Cause chain (three stacked defects)

1. **Snow ground-cover hold** (`RainCueMesh`, `#eef2f6`) is a presentation
   sheet, not SWE / groundwater. Affinity mask makes it patchy and
   terrain-following — reads as "snow or saturated ground."
2. **`precipPhase` lagged the Heat dial.** `setAirTemperature` wrote air °C
   only; phase updated on the next atmosphere event step. `main.ts` also only
   refreshed the cue's phase when precip discharged that tick, so a wet-day
   frame with no discharge could call `setStorm(..., snow)` after the owner
   had already switched to warm — re-arming the sheet.
3. **Sim hitch is the amplifier, not the root.** Rare frames + slow melt
   (pre-`5479947`) + uncapped particle motion (pre-`4b6c0c3`) turned the same
   hold into stuck blankets and laser streaks. Foam at rain-puddle banks
   (`uFoamColor` ≈ white) added a second "snow" read during storms.

Not a groundwater render path. Not NaN terrain. Not "need a planetary LOD
engine" — Habitat's grid is tiny; the bug is theatre coupled to hitch.

## Fix (this pass)

| Change | Why |
|---|---|
| `setAirTemperature` also writes `precipPhase` via `precipPhaseFromTemp` | Heat dial is instantly honest |
| `main.ts` always passes `world.precipPhase` after the step loop; refreshes `setStorm` every wall frame (not only when `stepsRun > 0`) | No sticky snow phase between event steps |
| `RainCueMesh`: rain/sleet **snap-clears** ground cover | Warm world cannot keep a pale sheet across a hitch |
| Storm foam attenuated (`×0.22` while `uStormActive`) | Puddle-bank foam stops reading as snow dusting |

Prior related commits: `23499d8` (trueWallDt melt credit), `f47b344` (foam edge
gate), `5479947` (terrain drape + faster rain melt), `4b6c0c3` (motion dt cap).

## Bigger picture (animals / fast-forward)

Weather theatre must stay **rate-invariant**: drawing style must not change with
time rate or hitch. L8 presentation LOD already sheds streaks/clouds under
debt; this pass makes the ground sheet heat-truthful. Do not invent a
planetary render stack for this — keep shedding theatre when `dropped` rises,
and never let a presentation hold contradict the Heat dial.
