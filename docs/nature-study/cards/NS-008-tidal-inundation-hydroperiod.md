# NS-008 — Tidal inundation hydroperiod gate

| Field | Value |
|---|---|
| id | NS-008 |
| lane | factor |
| title | Tidal inundation hydroperiod gate |
| real_world_referent | Fraction of time a cell is flooded by tide — blocks upland guilds in the intertidal; marsh needs some wetness |
| player_bet | Widening the tide band or sitting a form in the wet zone should keep upland herbs out while marsh holds — not the same bet as salty soil or spray |
| maps_to_fields | shore.intertidal, water.depth, seaLevel, habitat.suitability, habitat.limitingFactor, proposed:f_inundation, proposed:hydroperiod |
| hsi_or_growth_rule | HSI = min(…, f_inundation); upland: low when often flooded; marsh: needs some wetness in band (≠ f_salinity, ≠ f_spray) |
| physics_feedback | n/a — derive from C-016 mask + depth/tide occupancy; no new Process |
| register | C-016 Locked; C-018 Locked; C-007 Locked; C-011 Locked |
| sourced_from | docs/evidence/island-colonization.md §3 Distinct gates — Tidal inundation / Hydroperiod |
| steal | • Separate Liebig arm from intertidal + flood occupancy — keep C-018 soil.salinity and f_spray distinct · Marsh vs upland twin under same salt: inundation band decides |
| reject | • Collapsing inundation into soil.salinity or f_moisture/depth alone · Instantaneous tidal phase every step (rejected by C-016) |
| legibility | limiting factor: inundation (distinct from salinity, spray, moisture) |
| priority | P1 |
| evidence_grade | Habitat-already |
