---
name: nature-study
description: >-
  Launches low-token Habitat subagent lanes that study ecological guilds and
  factor gates (temperature, wind, plant growth, engagement loops), producing
  one steal card each. Use when expanding ecosystem content, Wave 1/N nature
  backlog, or researching what should arrive under HSI — never species catalogs.
---

# Nature study

Authority: [docs/nature-study/PROTOCOL.md](../../../docs/nature-study/PROTOCOL.md), [CARD_SCHEMA.md](../../../docs/nature-study/CARD_SCHEMA.md), [BACKLOG.md](../../../docs/nature-study/BACKLOG.md).

## Policy

- Study **guilds + factor gates + engagement loops**, not named-species lists (**N-003**, **E-004**).
- One Task = one topic = one card file under `docs/nature-study/cards/`.
- Cite Locked ID or Open **C-00x** only; do not invent Locked policy.
- **Propose vs land:** cards **propose** steals. When a steal later lands in **code**, use `/study-steal` for the EXTERNAL_REFERENCES Study log — cards alone are not a study-log substitute.
- Prefer `sourced_from` citing [island-colonization.md](../../../docs/evidence/island-colonization.md) when the topic is already researched there.
- After parent merge: fill BACKLOG P0/P1/P2, then one-line Nature P0 in BUILD_GUIDE Current gate / Next **and** AGENTS queue tip.

## Parent procedure

1. Pick 3–5 rows from BACKLOG Wave / P1 lists.
2. Launch parallel Tasks (`generalPurpose`), one prompt template below per topic.
3. Write each reply to `docs/nature-study/cards/NS-###-<slug>.md`.
4. Run PROTOCOL parent merge checklist; update BACKLOG priority buckets + merge log.
5. Do **not** implement sim in the same turn unless the user asked — study infrastructure and cards first.

## Shared ban block (required in every prompt)

```
Habitat bans for this study:
- N-001 / N-003: no ecosystem painter; no species collection game
- E-004 / W-003: roles + fixed preserve pool; no player-placed named species
- C-007: arrival = conditions × dispersal, not spawn tables
- C-011 / N-004: real-world referents only; inspectable limiting factors
- C-003 Open: no stochastic arrivals while Open
- T-001 / T-006 / T-007: no vendored sim engines; no GPU as WorldState authority
- Do not invent Locked policy; cite Locked ID or Open C-00x only
- Output ONE card per CARD_SCHEMA; max ~200 words; no essay
```

## Stages excerpt (optional paste)

```
Stage 0 Substrate only — overseas/perimeter seed only
Stage 1 Splash/strand pioneers — salt/inundation/burial OK for pioneers
Stage 2 Cover bootstrap — cryptogams/litter; moisture holding up
Stage 3 Structural — shrub/marsh if climate allows; still W-003 catalogue
Play = stages 0–3. Stages describe; they do not drive (S-001).
```

## Exemplar to attach when helpful

Paste or point at `docs/nature-study/cards/NS-001-wet-site-herb.md` so the agent matches format.

---

## Prompt template A — Factor lane

```
You are a Habitat nature-study factor lane. One topic only. Return ONE markdown card matching the schema below. Max ~200 words. No essay. No species census.

TOPIC: <e.g. Temperature as Liebig / growth factor for plant establishment>
ASSIGNED_ID: <NS-###>
REGISTER_HINT: <e.g. C-004, C-020, C-007>
SOURCED_FROM_HINT: <e.g. docs/evidence/island-colonization.md §2 growing season>

CONTEXT (≤40 lines — parent pastes):
<Heat dial / wind / existing HSI factors / relevant file names only>

SOURCES (titles only, 1–3):
<abstract or URL titles — do not fetch full papers unless parent attached snippets>

BAN BLOCK:
<paste shared ban block>

ISLAND STAGES (optional):
<paste stages excerpt>

SCHEMA — fill every row:
# NS-### — <title ≤8 words>
| Field | Value |
| id | NS-### |
| lane | factor |
| title | |
| real_world_referent | |
| player_bet | one sentence, no numbers |
| maps_to_fields | |
| hsi_or_growth_rule | one line |
| physics_feedback | or n/a |
| register | |
| sourced_from | path §section or none |
| steal | ≤2 bullets |
| reject | ≤2 bullets |
| legibility | |
| priority | P0 or P1 or P2 |
| evidence_grade | abstract | recalled | Habitat-already |

Honesty: state evidence_grade truthfully. Recalled/abstract-only is fine. Prefer sourced_from when island-colonization already covers the topic.
```

---

## Prompt template B — Guild lane

```
You are a Habitat nature-study guild lane. One plant functional type only. Return ONE markdown card. Max ~200 words. No species list. Role name only (E-004).

TOPIC: <e.g. Strand / splash pioneer guild>
ASSIGNED_ID: <NS-###>
REGISTER_HINT: <e.g. W-003, C-007, C-018, C-019>
SOURCED_FROM_HINT: <e.g. docs/evidence/island-colonization.md §1 stage 1>

CONTEXT (≤40 lines — parent pastes):
<What HSI factors exist; herb already shipped; shore/salt if relevant>

SOURCES (titles only, 1–3):
<…>

BAN BLOCK:
<paste shared ban block>

ISLAND STAGES:
<paste stages excerpt>

SCHEMA — same table as CARD_SCHEMA; set lane | guild |
Must include: sourced_from; limiting factors that unlock it; physics_feedback (roughness/infil/fuel/erosion); player_bet with no numbers.
```

---

## Prompt template C — Engagement lane

```
You are a Habitat nature-study engagement lane. One felt loop only — not a taxon. Return ONE markdown card. Max ~200 words.

TOPIC: <e.g. Freshened vs salty hollow under one seed schedule>
ASSIGNED_ID: <NS-###>
REGISTER_HINT: <e.g. C-018, C-007, C-011>
SOURCED_FROM_HINT: <e.g. island-colonization §3 paired expectation; playtests/batch-salt-overseas>

CONTEXT (≤40 lines):
<What is already visible / probed>

BAN BLOCK:
<paste shared ban block>

SCHEMA — lane | engagement |
player_bet: clip-test sentence a stranger could follow (THESIS §8), no numbers.
maps_to_fields: existing fields only when encoding-only (sim signal already exists).
hsi_or_growth_rule: n/a — needs cards: NS-… (list factor/guild cards this loop depends on)
physics_feedback: n/a unless the loop is about veg changing terrain feel
sourced_from: required when playtest/evidence already names the loop
priority: usually P0 if sim signal exists and encoding is the gap
```

---

## After cards return

1. Write files under `docs/nature-study/cards/`.
2. Update BACKLOG: move topics into P0/P1/P2 from the merge checklist (not from Wave “expected” preview); append merge log row.
3. Same session: Nature P0 one-liner in BUILD_GUIDE Current gate/Next and AGENTS queue tip.
4. Stop unless the user asked to implement. Implementation uses PROTOCOL card→slice checklist; new Process → D-007 first.
