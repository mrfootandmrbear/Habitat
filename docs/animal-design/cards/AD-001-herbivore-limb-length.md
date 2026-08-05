# AD-001 — Herbivore limbLength (terrain slope)

| Field | Value |
|---|---|
| id | AD-001 |
| role | herbivore |
| trait | limbLength |
| kind | continuous |
| pressure_axis | terrain slope / ruggedness factor (already computed for geomorphology) |
| real_world_referent | Mountain goats and chamois carry proportionally longer, stockier limbs on rugged terrain than plains grazers like bison on flat ground |
| mechanism | bone-scale |
| rungs | n/a — continuous. Fore/hind leg-bone scale, plausible range ~0.85x (flat-ground compact build) to ~1.25x (rugged-ground long-limbed build) of the Foxel base rig's rest scale |
| player_bet | If I carve a rugged, steep preserve, the herbivores living there should look leggier than the ones grazing my flat lowland |
| register | C-027-framing.md §3.5 (worked example, already named); Locked C-027 |
| sourced_from | docs/candidates/C-027-framing.md §3.5 |
| reject | • A discrete "mountain/plains" swap instead of continuous scale — rejected, slope is naturally continuous and bone-scale handles it without a ladder · Antler/horn size as a co-varying trait — out of scope for this card, would need its own referent and pressure axis |
| evidence_grade | Habitat-already |
