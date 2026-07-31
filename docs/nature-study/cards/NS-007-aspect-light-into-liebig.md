# NS-007 — Aspect light into Liebig

| Field | Value |
|---|---|
| id | NS-007 |
| lane | factor |
| title | Aspect light into Liebig |
| real_world_referent | Slope/aspect sets incoming light; south faces dry/bright, north faces shade-cooler — establishment differs before canopy competition |
| player_bet | Sculpting a north vs south face should change what can establish there, not only how succession plays once cover exists |
| maps_to_fields | light.insolation, habitat.suitability, habitat.limitingFactor, proposed:f_light, proposed:limiting.light, veg.establishment.herb |
| hsi_or_growth_rule | HSI = min(…existing, f_light); f_light from light.insolation (open-sky I₀), not understoryLight |
| physics_feedback | n/a — gate only; Beer–Lambert understoryLight stays succession/competition |
| register | C-007 Locked; C-011 Locked; N-004 |
| sourced_from | docs/NATURAL_PROCESS_MATH.md §1.9 insolation; §3.2 Beer–Lambert / Tilman R*; src/sim/vegetation/lightCompetition.ts |
| steal | • Promote existing light.insolation into Liebig as inspectable f_light — no new Process · Keep evaluateLight / canopy attenuation on succession only |
| reject | • Folding understoryLight into arrival HSI (confuses establishment with post-cover competition) · Hidden light multiplier with no limiting.light label (C-011) |
| legibility | limiting factor label: light |
| priority | P1 |
| evidence_grade | Habitat-already |
