# NS-003 — Onshore spray stress gate

| Field | Value |
|---|---|
| id | NS-003 |
| lane | factor |
| title | Onshore spray stress gate |
| real_world_referent | Wind-driven salt spray and sand burial stress windward shore and berms, distinct from porewater salinity |
| player_bet | Turning wind onto the exposed shore should punish inland and canopy guilds on the windward face while strand pioneers hold — not the same bet as salty soil alone |
| maps_to_fields | shoreExposure, climate.windRegime, habitat.suitability, soil.salinity, proposed:stress.spray, proposed:stress.burial |
| hsi_or_growth_rule | HSI = min(..., f_spray, f_burial); f_spray = shoreExposure × onshore(wind); f_burial = f(exposure, geomorph sediment flux) |
| physics_feedback | n/a — factor gate until guild cards; established cover may modestly damp spray reach (hypothesis) |
| register | C-004 Open; C-017 Open; C-018 Open; C-007 Locked; C-011 Locked |
| sourced_from | docs/evidence/island-colonization.md §3 salt spray gate; C-017 shoreExposure |
| steal | • Derived spray stress on existing exposure × Wind dial — separate HSI input from soil.salinity (C-018) · Paired windward vs lee berm under same rain: interior/canopy fails spray side first |
| reject | • Collapsing spray into soil.salinity or a second salt ledger · Per-species spray tables or wind-targeted placement |
| legibility | limiting factor: spray (distinct from salinity, moisture) |
| priority | P0 (shipped N3) |
| evidence_grade | abstract |
