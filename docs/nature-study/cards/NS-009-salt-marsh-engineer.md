# NS-009 — Salt-marsh engineer

| Field | Value |
|---|---|
| id | NS-009 |
| lane | guild |
| title | Salt-marsh engineer |
| real_world_referent | Mid-intertidal turf prefers a hydroperiod band and holds shore with living cover |
| player_bet | If I leave a mid-tide foreshore open under one seed schedule, marsh cover should arrive there — not on the dry terrace where herbs earn |
| maps_to_fields | proposed:veg.seedBank.marsh, proposed:veg.establishment.marsh, proposed:veg.biomass.marsh, shore.intertidal, terrain.elevation |
| hsi_or_growth_rule | establishment ∝ seedBank × HSI; HSI = min(f_inundation_hump, f_salinity*, f_temp) — hump peaks mid-envelope, 0 at dry terrace and deep subtidal |
| physics_feedback | physicalCover → roughness / infil / erosion blunt on living foreshore (thesis payoff #2) |
| register | C-016 Locked; C-007 Locked; C-011 Locked; W-003; E-004; N-004 |
| sourced_from | docs/evidence/island-colonization.md §2 mid-marsh engineer; NS-008 deferred hump |
| steal | • Guild-local hydroperiod hump on same envelope field as upland zero · Cover feedback without a new Process |
| reject | • Painting marsh onto cells · Folding the hump into herb `habitat.suitability` (breaks inundation-arrival) |
| legibility | limiting factor labels: inundation, salinity, temperature |
| priority | P2 |
| evidence_grade | Habitat-already |
