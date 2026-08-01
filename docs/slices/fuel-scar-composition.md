# Slice — Fuel / scar numeric fix (§4.45)

**Cited:** [fire/fuel review](../reviews/2026-07-31-fire-fuel-review.md) §4; T-001; S-009 Current.

## What was actually wrong

`runFuelAccumulationStep` was explicit Euler for `dF/dt = I − kF` with `k = min(1, fuelDecayK·dt)` but input left as `I·dt`. For `dt ≥ 1/k` the equilibrium became `cover·I·dt`, growing with tick size until `fuelLoadMax`. `decayFireScar` claimed exponential fade but used `scar·(1 − 0.08·dt)`, hard-zeroing at `dt ≥ 12.5`.

## Analytic updates

```
F' = F·e^(−k·dt) + (I/k)(1 − e^(−k·dt))   // Olson; I = cover · fuelInputMax
S' = S·e^(−κ·dt)                           // scar; κ = fireScarDecayK
```

`fireScarDecayK = 0.08` moved into `config.ts` beside `fuelDecayK` / `fuelInputMax`.

## Measured

Probe `fuel-scar-refine`: one step of 12 vs twelve steps of 1 — fuel delta **0**; scar over 20 days one vs many — delta **0**, scar still **> 0** (Euler would have zeroed).

## Baselines moved (stated)

| Probe | Why |
|---|---|
| `burn-recover` | Eight decadal fuel steps before ignition; analytic ≠ Euler → fuelBefore/After/consumed/hashN |
| `deep-time` | Decadal fuel over 100y → `p005` hashes |
| `orographic-wind` / `event-band-gate` | `fire.fuelLoad` in `stateHash` |

Recovery scalars on `burn-recover` (wet/dry cover) **unmoved**.
