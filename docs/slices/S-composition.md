# Slice S — Substrate contrast (C-009)

**Status:** Done (machine + owner legibility Pass; Lock still owner)  
**Register:** **C-009** Open (hypothesis). T-004 data-driven properties. No new `Process` (D-007).

## Steal

From Dust: deposit matter as a **cause**; sand erodes, rock resists. Falling-sand *personality* rejected as invented rules (THESIS §2.2). Property table, one law. Carry-sphere / arcade erosion / lava→rock rejected.

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
| rock | 3 | Near-zero infil + erosionK; very low porosity; gray dry BASE |

Rock = rocky ground / lithosol — **not** derived bedrock (`elev − depth`).

## Geological deposit tool

Opening tools = geological setup (sandcastle). **Tool: deposit** + **Material** (sand / clay / rock): raises elev+depth like berm and stamps `soil.material` where mass lands. Berm/dig stay material-agnostic.

## Paired expectation

Identical slope + storm; material class only:

1. Sand infiltrates more than clay / rock (soilWater)
2. Sand loses more elevation than clay / rock under hillslope erosion (geomorphology)

Probes: `substrate-contrast` (sand vs clay fill); `substrate-deposit` (deposit API + sand vs rock).

## Encoding

Default view dry BASE from `dryRgb` on the table. Seeded shore→sand / inland→clay mosaic on the island (`paintSubstrateMosaic` — not a mid-x bisect). Tier-P: `substrateEncodingDelta` > 0.12 (min of sand↔clay and sand↔rock).

## Bans

- Player paint-ecosystem / paint-wetland (N-001) — deposits are causes, not outcomes
- Second infiltration or erosion Process
- Invented material with no real-world referent (C-011 / N-004)
- Gravel / organic this pass; From Dust carry-sphere

## Clip verdict (D-007)

Can you film berm-on-sand vs berm-on-clay under one rain regime with no inspector? Owner legibility Pass 2026-07-30. Rain-feel remains a separate clip sentence (Slice R).
