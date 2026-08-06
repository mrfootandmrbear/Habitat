# Bug — white-lag under Heat:warm where water settles

**Found:** 2026-08-05/06 owner playtests. Screenshots in this directory.
**Misread as:** temperature/groundwater rendering white, or Three.js overload.
**Actual:** two stacked presentation defects — snow hold *and* inland water foam.

## Symptom

Pale / blocky white on the land under `Rainfall: wet` + `Heat: warm`, worse at
`1 day/s` / `1 week/s` (large `dropped` counts). Owner narrowed: **white sits
exactly where water settles on the ground** (basin rims, sheet-flow edges).
Inspect: water recolors the terrain blue underneath — overlay, not a sim field.

## Cause chain

### A — Snow ground-cover hold (fixed in `0e52fad`)

1. `RainCueMesh` pale sheet (`#eef2f6`) + affinity mask (more on flat lows —
   same places water pools).
2. `precipPhase` lagged the Heat dial; sticky phase re-armed snow under warm.
3. Sim hitch amplified melt lag.

### B — Inland WaterMesh foam on puddle banks (this pass)

Every wet cell that borders a dry neighbor scored `vEdgeT ≈ 1`, then mixed
**85% toward near-white foam** (`uFoamColor ≈ 0.93,0.97,0.98`). That is the
rim of every settling puddle — grid-aligned, blocky, reads as snow/groundwater.
Storm attenuation (`×0.22`) was not enough; foam does not belong on inland
surface water at all (beach foam stays on `OceanMesh`).

Shallow specular + fresnel-into-pale-sky on microfilms were a second whitening
path from god view; both now depth-gated.

Not a groundwater render path. Not NaN terrain.

## Fix

| Change | Why |
|---|---|
| `setAirTemperature` syncs `precipPhase` | Heat dial instantly honest |
| `main.ts` always passes post-step phase; `setStorm` every wall frame | No sticky snow phase |
| `RainCueMesh` rain/sleet snap-clears hold | Warm world cannot keep pale sheet |
| **Remove inland WaterMesh foam** | Puddle banks stay water-colored |
| Depth-gate shallow specular + fresnel | Microfilms don't flash white |

## Bigger picture

Weather/water theatre must stay **rate-invariant** and must not paint “snow”
onto warm-rain basins. Do not invent a planetary render stack for this.
