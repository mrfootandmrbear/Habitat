# Slice L3 — Mortality as a rate composition

**Cited:** [living-world review](../reviews/2026-07-31-living-world-review.md) §2; S-007 Locked; S-008 Current; ES-006 Locked; ES-002; C-011 Open; T-001; N-004.

## What was actually wrong

`nextHerbBiomass` returned `min(capacity, biomass + growth)` with `capacity = biomassMax · HSI`. An HSI collapse from 1.0 → 0.2 took biomass **2.500 → 0.500 in a single seasonal band**. Loss was instantaneous; only recovery had a rate — backwards from real ecology, where loss is fast but finite and recovery is slow. Vegetation was therefore a *render of current HSI* rather than a state with history, and every scrap of ecological memory lived in `soil.depth` / `soil.salinity` / `soil.porosity` with **none in the biota**.

## The update law

Below capacity: establishment growth unchanged.
Above capacity: first-order decline

```
biomass -= mortalityRate · (biomass − capacity) · dt
```

with a floor at capacity so Euler never overshoots when `m · dt > 1`. Capacity stays `biomassMax · HSI` — **ES-006**: mortality does not smuggle in a fixed ecological K.

## Per-guild rates (N-004)

Rates live in `config.ts` beside the establishment rates. Inventing six independent numbers without referents would fail N-004; three referents cover the six guilds:

| Guild | Rate / band | Referent |
|---|---|---|
| crust | 0.9 | NS-011 — living crust / moss mats desiccate and lose cover within days–weeks when moisture collapses |
| herb, strand, binder, marsh | 0.5 | NS-002 — herbaceous green tissue dies over weeks under drought / winter dieback; four guilds share one number because their cards state the same herbaceous habit |
| shrub | 0.15 | NS-010 — woody stems persist across seasons; dieback is leaf/fine-twig, not structural |

Measured bands-to-half after HSI 1 → 0.2 from full biomass: **crust 1 · herb 2 · shrub 7**. Recovery from the drought floor past half-max takes **3** herb bands — slower than the 2-band loss, which is the asymmetry the slice exists to restore.

## Short drought ridden out; long drought is not

One seasonal band of collapse leaves herb at 1.84 (capacity 0.5) — still a meadow. Eight bands leave it at 0.508, against the new capacity. That is the first drought a player can *see* the stand ride out and then lose, rather than watching it snap.

## S-008 — first biological hysteresis

After a moisture collapse, `habitat.limitingFactor` names moisture while `veg.biomass.*` still sits above `biomassMax · HSI`. The Field Notebook already pairs those two readouts ("Water — not light — is limiting here." + herb biomass above epsilon); until this slice the biomass half of that pair was a lie about the present rather than a memory of the past. The `dieback-lag` probe asserts standing excess after one band on both the composition path and the WorldState moisture→HSI→establishment path.

## What moved, and why

| Probe | Why |
|---|---|
| **`dieback-lag`** | New — the slice's own Tier-M contract |
| **`deep-time`** | Full band cascade over 100 sim-years; biomass now carries history through HSI swings, so `p005.hashFirstN` / `hashSecondN` move. `p005.hashMatch` stays 1 (P-005 intact) |
| **`disturbance-recovery`** | Moisture pulse couples through physicalCover; slower biomass decline changes infiltration slightly (`finalMoisture` +3.1e-5) |
| **`*-arrival` hashes** (salinity, heat, strand, binder, shrub, spray, light, island) | Establishment schedules that previously snapped biomass to capacity on any HSI dip now leave a lag; state hash moves. Scalar biomass/HSI claims that stay within tolerance are unchanged in meaning |

**Did not move:** `arrival-earned`, `marsh-arrival`, `crust-arrival`, `inundation-arrival`, `spread-front` — those either never put biomass above capacity, or their asserted scalars are insensitive to the lag. Same class of "prediction was wider than reality" note as L2's overseas-only arrival probes.

## Deferred / explicitly not touched

- **L4 biotic motion** — standing dead should eventually sway differently from green; that is presentation, not this law.
- **L5 / C-023** — guild displacement still blocked; without this rate a suppressed guild could not recede, and now it can, but competition itself is owner-judged.
- **HSI curve-shape corrections (§4.46)** — MHW step and binder burial remain as they were; mortality just makes those wrong shapes *visible* as lagged dieback.
