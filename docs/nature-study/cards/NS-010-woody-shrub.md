# NS-010 — Climate-capped woody shrub

| Field | Value |
|---|---|
| id | NS-010 |
| lane | guild |
| title | Climate-capped woody shrub |
| real_world_referent | Inland shrubs escalate only where growing-season warmth and pioneer cover already hold — frost and bare substrate lock them out |
| player_bet | If I warm an inland hollow that already holds herb cover, shrub should escalate there — not under cold, and not on bare ground |
| maps_to_fields | proposed:veg.seedBank.shrub, proposed:veg.establishment.shrub, proposed:veg.biomass.shrub, climate.airTemperature, veg.biomass.herb, soil.moisture, soil.salinity, shore.intertidal |
| hsi_or_growth_rule | establishment ∝ seedBank × HSI; HSI = min(f_temp*, f_cover, f_moisture, f_salinity, f_inundation) — warmer kill/opt than herb; cover facilitation from herb fraction; upland inundation zero |
| physics_feedback | physicalCover → roughness / infil / erosion blunt (thesis payoff #2) |
| register | C-007 Locked; C-011 Locked; C-004 Locked; W-003; E-004; N-004; NS-002 |
| sourced_from | docs/evidence/island-colonization.md §1 stage 3; §2 climate-capped woody; NS-002 f_temp floor |
| steal | • Warmer f_temp floor than herb so mild/cold stall woody while warm inland escalates · Cover facilitation arm (stage filter) without a new Process |
| reject | • Authored grass→shrub timers (ES-001) · Painting shrub / tree picker · Bird-nutrient Process this slice |
| legibility | limiting factor labels: temperature, cover, moisture, salinity, inundation |
| priority | P2 |
| evidence_grade | Habitat-already |
