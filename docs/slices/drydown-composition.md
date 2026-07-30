# Dry-down ET composition

**Cited:** [NATURAL_PROCESS_MATH.md](../NATURAL_PROCESS_MATH.md) §1.6–1.7 (bucket + moisture-limited AET); Slice 11 insolation (§1.9); H-001, H-003, H-004, ES-005, S-009.

## Choice

Potential ET is proportional to terrain insolation (Slice 11 `I₀`), not a flat daily sink:

```
PET = etRate · dt · insolation
AET = PET · stress(θ)   after open-water take
stress = 0 below wilting; ramp to 1 at field capacity
```

Partition of soil-column AET:

```
transpiration     = AET_soil · veg.cover
soil evaporation  = AET_soil · (1 − veg.cover)
open-water        = min(surfaceDepth, openWaterPet · insolation)
```

`veg.cover` is **lagged** one daily band so soil water can run before vegetation while still letting denser cover transpire more. Insolation is derived from terrain inside the soil step (same `terrainInsolation` as Slice 11) so PET does not wait on the vegetation owner.

Evaporation remains an **external boundary sink** tracked in `ledger.et` (plus partition ledgers). It is not recycled into local rain — at preserve scale that would invent a closed atmospheric loop Habitat does not model (C-011).

## Why this reduced form

1. South-facing cells dry faster under identical rain (insolation → PET).
2. Vegetation still improves infiltration (Slice 6) but now also pays a transpiration cost — balancing feedback (ES-003).
3. Moisture stress makes dry soil stop evaporating, so hollows that stay wet remain wetter without a second store.
4. Partitions are inspectable and sum to `ledger.et` for H-004.

## Deferred

- Hargreaves temperature range / seasonal PET dial (would need a filed climate candidate).
- Green–Ampt moisture-dependent infiltration within the event band.
- Recycling evaporated mass into downwind precip.
