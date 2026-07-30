# Slice S — Substrate contrast (C-009)

**Status:** In progress  
**Register:** **C-009** Open (hypothesis). T-004 data-driven properties. No new `Process` (D-007).

## Steal

From Dust / falling-sand *personality* is rejected as invented rules (THESIS §2.2). What transfers: **real substrates under the same forces answer differently** — sand drains and slumps; clay holds. Property table, one law.

## Ownership

| Field | Owner | Band | Notes |
|---|---|---|---|
| `soil.material` | geomorphology | decadal | Class id; legacy (T-003) |
| porosity / infil / erosionK | *lookup* | — | `src/sim/terrain/substrates.ts` |

soilWater and geomorphology **read** material and apply the existing laws. No per-material process fork (C-009 Failure means).

## Materials (MVP)

| Class | Id | vs loam |
|---|---|---|
| loam | 0 | Prior globals — default for probes |
| sand | 1 | Higher infil + erosionK; lower porosity; warm dry BASE |
| clay | 2 | Lower infil + erosionK; higher porosity; cool dry BASE |

## Paired expectation

Identical slope + storm; sand vs clay only:

1. Sand infiltrates more than clay (soilWater)
2. Sand loses more elevation than clay under hillslope erosion (geomorphology)

Probe: `substrate-contrast`.

## Encoding

Default view dry BASE from `dryRgb` on the table. West sand / east clay mosaic on the island (`paintSubstrateMosaic`). Tier-P: `substrateEncodingDelta` > 0.12.

## Bans

- Player paint-ecosystem / paint-wetland (N-001)
- Second infiltration or erosion Process
- Invented material with no real-world referent (C-011 / N-004)
- Full rock/organic table this slice

## Clip verdict (D-007)

Can you film berm-on-sand vs berm-on-clay under one rain regime with no inspector? Record in closeout.
