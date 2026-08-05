# Bug — snow ground-cover hold stuck visible for in-game years despite Heat: warm

**Found:** 2026-08-05, owner playtesting A1. Reported as "white patches that look like ice or snow" with the temperature dial set to warm; owner reproduced it by leaving the game running at heavy rainfall and warm heat continuously and captured the sequence in this directory (`Screenshot 2026-08-05 at 3.10.34 PM.png` through `3.12.08 PM.png`).

## Symptom

Large pale patches (`RainCueMesh`'s snow ground-cover hold, `#eef2f6`) sat on flatter/higher terrain and never cleared, even after **over two full in-game years** of continuous `Heat: warm`. Confirmed via the `Inspect: water` screenshot (`3.11.13 PM`) that the patches are a separate overlay, not water-depth coloring — the whole terrain recolored blue under that inspector layer, but the white patches stayed white on top of it.

## Root cause

`RainCueMesh`'s ground-cover opacity is a **wall-clock** (real-time) fade, by design ("Snow ground hold — pale sheet that lingers after flakes", `src/render/RainCueMesh.ts`) — it should melt over roughly 10-15 *real* seconds once `climate.precipPhase` drops out of snow/sleet.

`src/main.ts`'s render loop clamps the per-frame wall-clock delta to 0.05s before using it anywhere:

```ts
const wallDt = Math.min((now - lastFrame) / 1000, 0.05);
```

That clamp is correct and necessary for the *sim clock* (`clock.tick(wallDt)` — keeps one huge frame from stuffing an enormous amount into `SimClock`'s accumulator at once; `SimClock` already bounds steps-per-frame independently and carries the remainder as time debt, SIMULATION_MODEL §6.4). But the same clamped `wallDt` was also being fed into every **presentation-only** wall-clock fade: `RainCueMesh.update`, `CloudMesh.update`, `stormReleaseHold`, `snowAffinityRefreshTimer`, and the water-display smoothing (`waterDisplayTauSeconds`).

Running `Heat: wet` + `1 week/s` unattended for a long stretch produces exactly the backlog visible in every one of the owner's screenshots (`dropped 13586` / `20981` / `27900` — `SimClock`'s own debt-abandonment counter). Under that backlog, real animation frames render rarely. Each one still only ever credited 0.05s to the melt's exponential decay, no matter how many real seconds had actually elapsed since the last frame — so the fade's *real-time* clock effectively stalled while sim-time kept advancing normally. A hold that started once, early, could then sit fully visible indefinitely in wall-clock terms.

## Fix

`src/main.ts` now computes an unclamped `trueWallDt` alongside the clamped `wallDt`, and routes every presentation-only fade through `trueWallDt` instead:

```ts
const trueWallDt = Math.max(0, (now - lastFrame) / 1000);
const wallDt = Math.min(trueWallDt, 0.05);
```

`clock.tick(wallDt)` keeps the clamped value (sim-clock stability, unchanged). `rainCue.update`, `cloudMesh.update`, `stormReleaseHold`, `snowAffinityRefreshTimer`, and `syncWaterDisplay` now use `trueWallDt`.

## Verified

Live in `npm run dev` (not just read from code): built real snow cover to its max (`getGroundCoverOpacity() = 0.55`, the ceiling for heavy rain) via `Heat: cold` + `Rainfall: wet`, switched to `Heat: warm`, and forced the exact backlog shape (a long synchronous burst of `stepEvent()` calls with no intervening render frames — the same mechanism as the owner's unattended long session). Confirmed via a temporary console probe that `getGroundCoverOpacity()` dropped from `0.55` to `~1.9e-15` within about 20 real seconds afterward, and confirmed visually that the large patches cleared. `npm run gate` stays green (this is a render-loop timing fix; nothing in `src/sim/` changed).

A few small pale dots remained at the shoreline in the same test — traced separately to ordinary shore/wave rendering, unrelated to this bug and present before and after the fix.
