# Slice 9 — HSI composition rule

**Cited:** [NATURAL_PROCESS_MATH.md](../NATURAL_PROCESS_MATH.md) §3.3 (Liebig / HSI), §8.2 framing; BUILD_GUIDE §4.4; ES-006, E-009, N-002, N-004.

## Choice

**Liebig minimum**, not product and not geometric mean:

```
HSI = min(f_moisture, f_depth, f_groundwater)
limitingFactor = argmin(f_moisture, f_depth, f_groundwater)  // ties → lowest factor id
limitingGap = secondMin − HSI
```

## Why min

1. The argmin *is* the inspector answer — “what is holding this back?” falls out of evaluation (NATURAL_PROCESS_MATH §3.3).
2. Improving a non-limiting input cannot raise HSI — that asymmetry is the Tier-M test that catches a disguised average (BUILD_GUIDE §4.4).
3. Under **C-007**, this field is the arrival gate, not a health score (N-002). Geometric mean (USFWS HSI) remains available later if multi-factor softness is needed; Slice 9 ships min.

## Factor curves (MVP)

| Factor | Source fields | Suitability |
|---|---|---|
| moisture | `soil.moisture` | `m / porosity` clamped to [0, 1] |
| depth | `soil.depth` | `depth / hsiDepthRef` clamped to [0, 1] |
| groundwater | `groundwater.storage` | `gw / hsiGwRef` clamped to [0, 1] |
| salinity | `soil.salinity` | `1 − S` clamped to [0, 1] (Slice 20 / C-018) |

No light or nutrient factors until those stores exist. Zero on any factor zeroes HSI (correct for arrival). Salinity is the non-halophyte herb gate; pan/halophyte guilds are later catalogue roles on the same field.

## Banned

- A single “health” scalar without named contributors (N-002).
- Fixed carrying capacity `K` (ES-006).
- Hidden thresholds the player cannot trace to a registered field (N-004).
