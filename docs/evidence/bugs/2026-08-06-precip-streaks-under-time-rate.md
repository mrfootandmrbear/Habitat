# Bug — precip particles stretch into laser streaks as time rate rises

**Found:** 2026-08-06, owner playtesting on GitHub Pages after the 2026-08-05 snow-hold fix. Screenshots in this directory (`Screenshot 2026-08-06 at 10.16.03 AM.png` … `10.16.44 AM.png`).

## Symptom

Same Forces throughout (`Rainfall: wet`, `Heat: warm`), with a large sim backlog (`dropped 3331 — lower the rate` on every frame):

| Shot | Time rate | What precip looks like |
|---|---|---|
| 10.16.03 | `1 s/s` | Sparse white square dots |
| 10.16.17 | `Pause` | Particles gone; pale ground-cover blanket still on the island |
| 10.16.33 | `1 s/s` | Short dashes / light streaking |
| 10.16.44 | `1 day/s` | Long continuous diagonal streaks across the whole view |

The owner called out the coupling: **time controls change how precipitation is drawn**, not just how fast the sim advances.

Phase under `Heat: warm` is rain (`airTempC: 16` → `PRECIP_PHASE_RAIN`). The white read is the rain PointsMaterial against dark water / the leftover snow ground-cover hold — the *new* defect is the rate-linked streak length.

## Root cause

`23499d8` correctly introduced an unclamped `trueWallDt` so presentation fades (snow-hold melt, storm veil, water display) keep progressing under a sim backlog. That same uncapped delta is also passed into `RainCueMesh.update` **particle kinematics**:

```ts
rainCue.update(trueWallDt, wind.ux, wind.uz);
// …
y = pos.getY(i) - velocities[i] * dt * speed;
```

At `1 day/s` / `1 week/s`, each rendered frame runs up to `maxStepsPerFrame` event steps on the main thread before the next paint. Real wall time between paints grows with that work (and with the abandoned debt the HUD reports as `dropped`). One hitch-sized `trueWallDt` (hundreds of ms to seconds) integrates a full fall/respawn jump per particle in a single frame → persistence-of-vision / capture reads as laser streaks. At `1 s/s` the same code path sees ~16 ms and looks like dots.

Melt/fade *needed* the uncapped credit (2026-08-05). Motion did not.

## Fix

In `RainCueMesh.update`, split the delta:

- **Fade / melt / veil** — full wall `dt` (keeps the 2026-08-05 hold-clear contract).
- **Particle kinematics** — `min(dt, 1/30)` so a hitch cannot stretch flakes into streaks.

Tier-P proxy in `stormCue.test.ts`: a 1.0 s hitch-sized update must not drop mean particle height much farther than a single capped step.

## Related (Pages lag)

The terrain-drape follow-up (`5479947`) that stops the flat ground-cover plane clipping through peaks **failed to deploy** to GitHub Pages (Actions "Service Unavailable" fetching the deploy action). Live `mrfootandmrbear.github.io/Habitat/` was still on `f47b344` when these screenshots were taken — so any jagged white ground shards in the Pause frame are that missing drape, not a new melt regression. Re-run the Pages workflow once Actions is healthy.
