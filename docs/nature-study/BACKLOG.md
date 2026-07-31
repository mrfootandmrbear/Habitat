# Nature-study backlog

Authority: [PROTOCOL.md](PROTOCOL.md). Ranked after parent merge of cards. **Hypothesis only** — Open candidates stay Open.

Last updated: 2026-07-30 (Wave 1 merged).

---

## Shipped (do not re-study as new)

| Card | Topic | Notes |
|---|---|---|
| [NS-001](cards/NS-001-wet-site-herb.md) | Wet-site herb guild | Slice 12–13; HSI moisture/depth/GW/salinity |

---

## Wave 1 — merged

| Id | Lane | Title | Merge bucket |
|---|---|---|---|
| [NS-002](cards/NS-002-heat-dial-plant-gate.md) | factor | Heat dial plant gate | **P0** |
| [NS-003](cards/NS-003-onshore-spray-stress-gate.md) | factor | Onshore spray stress gate | P1 |
| [NS-004](cards/NS-004-strand-splash-pioneer.md) | guild | Strand splash pioneer | **P0** (one new guild) |
| [NS-005](cards/NS-005-sandy-crest-sand-binder.md) | guild | Sandy crest sand-binder | P1 — hold until strand differentiates |
| [NS-006](cards/NS-006-twin-hollow-salt-memory.md) | engagement | Twin hollow salt memory | **P0** (clip first) |

---

## Priority buckets (authoritative after merge)

### P0 — next engagement ROI

| Order | Card | Why |
|---|---|---|
| 1 | [NS-006](cards/NS-006-twin-hollow-salt-memory.md) | Sim signal exists (C-018 Pass); encoding / default-view clip is the gap — Tier-P, no new Process |
| 2 | [NS-002](cards/NS-002-heat-dial-plant-gate.md) | Heat dial already player-facing; plants ignore it — add `f_temp` under Open C-004 / C-020 |
| 3 | [NS-004](cards/NS-004-strand-splash-pioneer.md) | One new guild; couples shipped salt + shore + overseas; differentiates strand vs inland herb |

### P1 — derived field, no new Process

| Card / topic | Lane | Notes |
|---|---|---|
| [NS-003](cards/NS-003-onshore-spray-stress-gate.md) | factor | `proposed:stress.spray` from Wind × shoreExposure; keep distinct from `soil.salinity` |
| [NS-005](cards/NS-005-sandy-crest-sand-binder.md) | guild | Second guild — hold until NS-004 differentiates two bets |
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
