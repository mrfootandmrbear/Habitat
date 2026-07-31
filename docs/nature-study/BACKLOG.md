# Nature-study backlog

Authority: [PROTOCOL.md](PROTOCOL.md). Ranked after parent merge of cards. **Hypothesis only** — Open candidates stay Open.

Last updated: 2026-07-30 (Wave 1 merged).

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

## Priority buckets (authoritative after merge)

### P0 — next engagement ROI

| Order | Card | Why |
|---|---|---|
| — | *(empty)* | C-006 / C-013 framing / C-010 framing Done; agent tip → Nature P1 (hydroperiod, light→Liebig) |


### P1 — derived field, no new Process

| Card / topic | Lane | Notes |
|---|---|---|
| Light / aspect into Liebig vs competition-only | factor | `lightCompetition.ts` already ships; card before promoting to HSI |
| Hydroperiod / inundation gate (≠ soil.salinity) | factor | Island evidence separates spray / soil salt / inundation |

### P2 — deferred / new Process / later guilds

| Topic | Lane | Notes |
|---|---|---|
| Salt-marsh engineer | guild | After strand + inundation factor |
| Woody / shrub | guild | Stage 3; climate-capped (needs NS-002) |
| Cryptogam / crust | guild | Stage 2 bootstrap |
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

| Date | Cards merged | P0 set | Notes |
|---|---|---|---|
| 2026-07-30 | NS-001 exemplar only | — | Protocol seeded |
| 2026-07-30 | — | — | Doc sync: sourced_from, propose vs land, card→slice checklist |
| 2026-07-30 | NS-002…NS-006 | NS-006 → NS-002 → NS-004 | Clip first; dial next; one guild (strand). NS-003/NS-005 → P1. No invent-Locked. |
| 2026-07-30 | NS-006, NS-002 shipped | NS-004 | Slice N encoding + Slice N2 `f_temp`; tip → strand guild |
| 2026-07-30 | NS-004 shipped (N4) | NS-003 | Strand vs inland under one seed; tip → spray stress |
| 2026-07-30 | NS-003 shipped (N3) | NS-005 | Herb `f_spray` from shore.exposure; tip → sand-binder |
| 2026-07-30 | NS-005 shipped (N5) | — (P0 empty) | Crest binder + physicalCover coastal blunt; tip → C-005 scaffold |
