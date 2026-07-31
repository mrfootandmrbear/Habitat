# Nature-study backlog

Authority: [PROTOCOL.md](PROTOCOL.md). Ranked after parent merge of cards. **Hypothesis only** — Open candidates stay Open.

Last updated: 2026-07-31 (NS-010 shipped as Slice N10).

---

## Shipped (do not re-study as new)

| Card | Topic | Notes |
|---|---|---|
| [NS-001](cards/NS-001-wet-site-herb.md) | Wet-site herb guild | Slice 12–13; HSI moisture/depth/GW/salinity |
| [NS-006](cards/NS-006-twin-hollow-salt-memory.md) | Twin hollow salt memory | Slice N; `saltMemoryEncodingDelta`; C-018 Q-A Pass |
| [NS-002](cards/NS-002-heat-dial-plant-gate.md) | Heat dial plant gate | Slice N2; `f_temp` / `heat-arrival`; C-004/C-020 Open |
| [NS-004](cards/NS-004-strand-splash-pioneer.md) | Strand splash pioneer | Slice N4; `veg.*.strand` / `strand-arrival`; C-018/C-019 Open |
| [NS-003](cards/NS-003-onshore-spray-stress-gate.md) | Onshore spray stress | Slice N3; `f_spray` / `spray-arrival`; C-017 Open |
| [NS-005](cards/NS-005-sandy-crest-sand-binder.md) | Sandy crest sand-binder | Slice N5; `veg.*.binder` / `binder-arrival`; C-009/C-017 Open |
| [NS-008](cards/NS-008-tidal-inundation-hydroperiod.md) | Tidal inundation hydroperiod | Slice N8; `f_inundation` / `inundation-arrival`; C-016 |
| [NS-007](cards/NS-007-aspect-light-into-liebig.md) | Aspect light into Liebig | Slice N7; `f_light` / `light-arrival`; C-007/C-011 |
| [NS-009](cards/NS-009-salt-marsh-engineer.md) | Salt-marsh engineer | Slice N9; `veg.*.marsh` / `marsh-arrival`; C-016 |
| [NS-010](cards/NS-010-woody-shrub.md) | Climate-capped woody shrub | Slice N10; `veg.*.shrub` / `shrub-arrival`; C-007 / NS-002 |

---

## Wave 1 — merged

| Id | Lane | Title | Merge bucket |
|---|---|---|---|
| [NS-002](cards/NS-002-heat-dial-plant-gate.md) | factor | Heat dial plant gate | **Shipped** (N2) |
| [NS-003](cards/NS-003-onshore-spray-stress-gate.md) | factor | Onshore spray stress gate | **Shipped** (N3) |
| [NS-004](cards/NS-004-strand-splash-pioneer.md) | guild | Strand splash pioneer | **Shipped** (N4) |
| [NS-005](cards/NS-005-sandy-crest-sand-binder.md) | guild | Sandy crest sand-binder | **Shipped** (N5) |
| [NS-006](cards/NS-006-twin-hollow-salt-memory.md) | engagement | Twin hollow salt memory | **Shipped** (N) |

---

## Wave 2 — P1 factors (merged 2026-07-31)

| Id | Lane | Title | Merge bucket |
|---|---|---|---|
| [NS-007](cards/NS-007-aspect-light-into-liebig.md) | factor | Aspect light into Liebig | **Shipped** (N7) |
| [NS-008](cards/NS-008-tidal-inundation-hydroperiod.md) | factor | Tidal inundation hydroperiod gate | **Shipped** (N8) |

---

## Priority buckets (authoritative after merge)

### P0 — next engagement ROI

| Order | Card | Why |
|---|---|---|
| — | — | empty |

### P1 — derived field, no new Process

| Card / topic | Lane | Notes |
|---|---|---|
| — | — | empty |

### P2 — deferred / new Process / later guilds

| Topic | Lane | Notes |
|---|---|---|
| Cryptogam / crust | guild | Stage 2 bootstrap — **tip** |
| Nutrients / guano | factor | Needs candidate if not covered |
| Animals / F-001 engineers | — | Deferred; out of protocol scope |

---

## Merge → queue tip

After merge, parent updates in the **same session**:

1. This file’s P0/P1/P2 + merge log
2. [BUILD_GUIDE.md](../BUILD_GUIDE.md) Current gate / Next — one line `Nature P0: NS-00x …`
3. [AGENTS.md](../../AGENTS.md) queue tip — same Nature P0 line

---

## Merge log

| Date | Cards | Tip after merge |
|---|---|---|
| 2026-07-31 | NS-010 | Nature P2 cryptogam/crust (N10 woody/shrub shipped) |
| 2026-07-31 | NS-009 | Nature P2 woody/shrub (N9 salt-marsh shipped) |
| 2026-07-31 | NS-007 | (shipped N7; tip was salt-marsh) |
| 2026-07-31 | NS-008 | (shipped N8) |
