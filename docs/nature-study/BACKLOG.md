# Nature-study backlog

Authority: [PROTOCOL.md](PROTOCOL.md). Ranked after parent merge of cards. **Hypothesis only** — Open candidates stay Open.

Last updated: 2026-07-30 (Wave 1 launch seeded; cards pending except exemplar).

---

## Shipped (do not re-study as new)

| Card | Topic | Notes |
|---|---|---|
| [NS-001](cards/NS-001-wet-site-herb.md) | Wet-site herb guild | Slice 12–13; HSI moisture/depth/GW/salinity |

---

## Wave 1 — launch set (uncarded → run five Tasks)

Launch in one parent turn using [`.cursor/skills/nature-study/SKILL.md`](../../.cursor/skills/nature-study/SKILL.md). Assign ids NS-002…NS-006 as cards return.

| Agent | Lane | Topic | Why first | Expected id |
|---|---|---|---|---|
| F-temp | factor | Temperature → growth / establishment | Heat dial exists; plants ignore it | NS-002 |
| F-wind | factor | Wind → stress / spray / burial | Wind + C-017 exposure exist; plants ignore them | NS-003 |
| G-strand | guild | Strand / splash pioneer | Island stage 1; salt+shore shipped | NS-004 |
| G-binder | guild | Sand-binder / dune | Berms “come alive” vs bare (thesis payoff #2) | NS-005 |
| E-freshen | engagement | Freshened vs salty hollow | C-018 owner half Pass — deepen felt loop | NS-006 |

Paste PROTOCOL ban block + stages 0–3 table into each Task. One topic per agent.

---

## Expected P0 merge targets (after Wave 1 — hypothesis)

Not Locked. Do not implement until cards exist and D-007 is considered for any new Process.

1. **Temperature and/or wind as HSI (or growth) factors** — under Open **C-004** / **C-020** adjacency; Heat/Wind dials already player-facing.
2. **Second guild** (strand pioneer **or** sand-binder) — under **W-003** / **C-019**; still arrival-gated; still single vegetation owner.
3. **Engagement encoding** for freshened-vs-salty (and later windward-vs-lee) — prefer Tier-P / presentation over a new Process when the sim signal already exists (**C-018**).

Any slice that registers a new `Process` records a twenty-second clip verdict (**D-007**) in BUILD_GUIDE first.

---

## Priority buckets (fill after merge)

### P0 — next engagement ROI

_Empty until Wave 1 cards merge. Expect F-temp, F-wind, G-strand or G-binder, E-freshen._

### P1 — derived field, no new Process

| Topic | Lane | Notes |
|---|---|---|
| Light / aspect into Liebig vs competition-only | factor | `lightCompetition.ts` already ships; card before promoting to HSI |
| Hydroperiod / inundation gate (≠ soil.salinity) | factor | Island evidence separates spray / soil salt / inundation |

### P2 — deferred / new Process / later guilds

| Topic | Lane | Notes |
|---|---|---|
| Salt-marsh engineer | guild | After strand + inundation factor |
| Woody / shrub | guild | Stage 3; climate-capped |
| Cryptogam / crust | guild | Stage 2 bootstrap |
| Nutrients / guano | factor | Needs candidate if not covered |
| Animals / F-001 engineers | — | Deferred; out of protocol scope |

---

## Merge log

| Date | Cards merged | P0 set | Notes |
|---|---|---|---|
| 2026-07-30 | NS-001 exemplar only | — | Protocol seeded; Wave 1 not yet run |
