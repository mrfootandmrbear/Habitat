# Slice A+ — Recovery audible (AUD-003)

**Status:** Done (machine)  
**Register:** AUD-003 Locked; **C-014** Open (do not promote). No new `Process` (D-007).

## Field choice

**Driver:** `veg.cover` → `ambient.life`

Cover is the visible recovery field (greening after moisture / after fire fade). It already exists in the registry — no invented wildlife presence. Herb biomass (`veg.biomass.herb`) remains the arrival accounting field; sonifying cover keeps the bed tied to what the eye sees (AUD-003 + T-006).

Rejected for this slice: biomass-only (can be non-zero with cover 0), arrival occupancy (not a continuous field), canned victory mix.

## Mapping

| Mean cover | Level | Silent |
|---|---|---|
| ≤ ε | 0 | true |
| 0.25 | 0.25 | false |
| 0.5 | 0.5 | false |
| ≥ 1 | 1 | false |

Water bed (`ambient.water` ← `water.surfaceDepth`) unchanged. Beds are independent: a dry vegetated hollow can have life without water ambience.

## Contract

- `audioObserver.reads`: `water.surfaceDepth`, `veg.cover`; `writes: []`
- Snapshots only — no live buffer alias (T-006)
- No `Math.random` / sim RNG (T-001)
- Web Audio optional; CI uses pure mix data

## Notebook seed

The green came back, and the place sounded fuller.
