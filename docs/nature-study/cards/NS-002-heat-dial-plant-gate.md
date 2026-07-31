# NS-002 — Heat dial plant gate

| Field | Value |
|---|---|
| id | NS-002 |
| lane | factor |
| title | Heat dial plant gate |
| real_world_referent | Growing-season warmth sets establishment and biomass ceilings; frost and short seasons kill tender cover and cap woody escalation |
| player_bet | Cold should stall or kill green cover in an otherwise wet hollow; warm should let the same site establish faster |
| maps_to_fields | climate.airTemperature, habitat.suitability, proposed:f_temp, proposed:limiting.temperature, veg.establishment.herb, veg.biomass.herb |
| hsi_or_growth_rule | HSI = min(f_moisture, f_depth, f_gw, f_salinity, f_temp); f_temp from airTemperature vs guild cold tolerance |
| physics_feedback | Biomass accrual / winter dieback scales with f_temp; physicalCover → roughness / infil when established |
| register | C-004 Open; C-020 Open; C-007 Locked; C-011 Locked; N-004 |
| sourced_from | docs/evidence/island-colonization.md §2 growing season / climate knobs |
| steal | • Reuse existing Heat dial as f_temp in Liebig HSI — precip phase plus plant gate, one field (C-020 hypothesis) · Stage-3 structural guilds need f_temp floor; pioneers tolerate wider band per island climate table |
| reject | • Hidden temperature multiplier with no inspectable limiting label (C-011) · Second plant-climate Process while airTemperature already exists |
| legibility | limiting factor label: temperature |
| priority | P0 |
| evidence_grade | abstract |
