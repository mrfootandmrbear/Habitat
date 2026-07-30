# Full C-020 — Clouds / precip phase

**Status:** Done — machine green (C-020 Lock still owner)  
**Register:** **C-020** Open (hypothesis). **D-007** Locked. C-004 force dials. T-001 / T-006 / H-004 / N-004.

## Clip verdict (D-007)

**Pass (2026-07-30, authorizing).** Slice R established the twenty-second clip — weather the world made. Owner queued full visible clouds / precip phase as the remaining weather read and directed §4.21. Clip exists → new `Process` registration allowed.

## Steal / rejection

| Taken | Rejected |
|---|---|
| Authored climate dial → atmospheric state → delivery (C-020 / C-004) | Cell-targeted cloud painter / smiting |
| Wind × moisture × heat → phase (rain / snow / sleet) as real referents (N-004) | Free stochastic weather while C-003 Open |
| Orographic placement stays geography-derived (Slice F) | Second precip ledger; charts / precip meters |

No EXTERNAL_REFERENCES cloud engine. Rule-shape only.

## Ownership

| Field | Owner | Band | Notes |
|---|---|---|---|
| `climate.cloudWater` | `climate` | event | Global precipitable store (m depth-equivalent) |
| `climate.precipPhase` | `climate` | event | 0 rain · 1 sleet · 2 snow |
| `climate.airTemperature` | `climate` | event | °C from Heat dial |
| `ledger.precipitation` | `climate` | event | Already registered; delivery writes here |

`surfaceWater` reads `climate.cloudWater` so the scheduler runs atmosphere before routing.

## Delivery model

1. Rainfall dial remains the **climate moisture budget** (archetype cadence + mean depth) — not a faucet dump from UI.
2. On wet days the atmosphere **charges** `cloudWater` from that budget.
3. During the storm fraction, precip **discharges** from cloud via existing orographic `addRainField` (H-004).
4. Phase from air temperature (warm → rain, mild → sleet, cold → snow). All phases land as liquid on the surface this slice (**melt-on-contact**); dedicated `snow.waterEquivalent` store is next-but-one if Lock needs it.
5. No `(x,z)` arguments on any climate API.

## Presentation (T-006)

- `CloudMesh` — soft cloud bodies whose opacity tracks `cloudWater` (observer only).
- `RainCueMesh` — liquid / sleet streaks while discharging rain or sleet.
- Snow cue — flake points while phase is snow (same mesh family, different look).

## Paired expectations (Tier-M)

1. Same seed + same forcing → identical hash (T-001).
2. Precip only while cloud is charged; dry regime never charges.
3. Cold heat dial → snow phase; warm → rain; mass residual closes.
4. No cell-targeted rain API.

Probe: `cloud-delivery`.

## Bans

- Skipping D-007 (recorded above).
- Place-targeted storms / cloud paint.
- Stochastic free weather while C-003 Open.
- Claiming C-020 Locked (owner taste half).
- Charts or precip HUD meters.

## Notebook seed

The sky thickened before the shower; the cold spell left the hollow pale.
