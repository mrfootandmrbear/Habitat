# Nature study protocol — low-token guild & factor cards

> **Status:** Working protocol  
> **Role:** Orchestrate parallel subagent study of ecological *guilds* and *factor gates* for Habitat engagement — not a species catalog  
> **Authority:** Advisory. Cards are hypotheses. Binding decisions stay in the Decision Register; steals that land in code use [EXTERNAL_REFERENCES.md](../EXTERNAL_REFERENCES.md) Study log via `/study-steal`.

**Companion files.** [CARD_SCHEMA.md](CARD_SCHEMA.md) · [BACKLOG.md](BACKLOG.md) · cards in [`cards/`](cards/) · skill [`.cursor/skills/nature-study/SKILL.md`](../../.cursor/skills/nature-study/SKILL.md).

---

## Why this exists

The living-sand-castle payoff needs a **robust, legible ecosystem**: temperature, wind, moisture, salt, and plant growth must differentiate places so the player can bet and find out if they were right (**C-011**). Habitat already forbids the naive path (paint species, unlock checklists, collection game).

**Nature items** here means:

- **Plant functional types (guilds)** — roles under **E-004** / **W-003**
- **Environmental factor gates** — drivers that enter Liebig HSI or growth (**C-007**)
- **Engagement loops** — felt bets a stranger can follow (THESIS §8 clip)

Not: named-species Pokédex, animal food webs (**F-001** Deferred), or Terra Nil place-tool biomes (**N-001**).

**Prior art in-repo.** Stages 0–3 and climate dials: [island-colonization.md](../evidence/island-colonization.md). Current HSI: moisture · depth · GW · salinity (`hsiComposition.ts`). One arrival guild: `herb` (Slice 12). Heat/wind dials exist for atmosphere; they do not yet gate plants.

---

## Habitat ban block (paste into every Task prompt)

Copy this block verbatim (≤15 lines of constraints):

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

**Island stages excerpt** (paste stages 0–3 only when useful):

| Stage | Process | Gate sketch |
|---|---|---|
| 0 Substrate only | Bare; no local seed bank | Overseas / perimeter seed only |
| 1 Splash / strand | Sea-dispersed pioneers | Salt / inundation / burial OK for pioneers |
| 2 Cover bootstrap | Cryptogams / litter | Moisture holding ↑ |
| 3 Structural | Shrub / marsh turf if climate allows | Cover filters; still W-003 catalogue |

Play sessions live in stages 0–3. Stages describe; they do not drive (**S-001**, **ES-001**).

---

## Token caps

| Limit | Rule |
|---|---|
| One lane, one topic | e.g. “temperature as Liebig factor” **or** “strand pioneer guild” — never both |
| Input | Ban block + ≤40 lines Habitat context + 1–3 abstract/URL titles — **no full papers, no repo crawls** |
| Output | Exactly one card filling [CARD_SCHEMA.md](CARD_SCHEMA.md); ~150–250 tokens; reject free-form essays |
| Parallelism | 3–5 Tasks per wave; parent merges cards — does not re-synthesize literature |
| Honesty | Grade evidence: `abstract` · `recalled` · `Habitat-already` — never claim a replay you did not do |

Cold-session success: Wave N+1 launches from this file + skill + one exemplar card — without re-reading THESIS or EXTERNAL_REFERENCES in full.

---

## Three lane types

### 1. Factor lane

One physical driver → HSI / growth response shape.

Wave-1 / backlog targets (dials or rasters exist; plant gate missing or thin):

- Temperature (Heat dial → growth / establishment, not only precip phase)
- Wind stress (Wind + shore exposure → burial / desiccation / spray)
- Light / aspect (`lightCompetition.ts` — Liebig vs competition-only)
- Hydroperiod / inundation (distinct from `soil.salinity`)

### 2. Guild lane

One plant functional type (SIMULATION_MODEL §3.5 / island stages). Card must name:

- Limiting factors that unlock it
- Physics feedback (roughness, infil, fuel, erosion resistance)
- **Player bet** — one sentence, no numbers (**C-011**)

Examples: strand pioneer · sand-binder · salt-marsh engineer · woody/shrub · cryptogam/crust · wet-site herb (already shipped as `herb`).

### 3. Engagement lane

One *felt* loop, not a taxon. Output: clip-test sentence (THESIS §8) + which factor/guild cards it needs. No numbers for the owner.

Examples: bare→pioneer after first wet season; salty twin stays sparse; north slope holds cover; windward berm sheds cover.

---

## Launch procedure

1. Open [BACKLOG.md](BACKLOG.md); pick 3–5 uncarded Wave topics.
2. For each topic, Task with `generalPurpose` (or explore if reading one known file) using the matching prompt template in the nature-study skill.
3. Write each returned card to `docs/nature-study/cards/NS-###-<slug>.md`.
4. Parent merge (checklist below) → update BACKLOG priorities.
5. Implementation slices cite cards + register IDs; new `Process` requires **D-007** clip gate first.
6. When a steal lands in **code**, same-commit Study log row via `/study-steal`. Study cards alone do not invent Locked policy.

---

## Parent merge checklist

- [ ] Drop cards that invent product policy without a Locked ID or Open **C-00x**
- [ ] Collapse duplicates (same factor/guild under two titles → keep clearer player_bet)
- [ ] **P0** = factor already player-controllable (temp/wind) **or** guild that differentiates two player bets under one seed schedule
- [ ] **P1** = needs a new derived field but no new Process
- [ ] **P2** = needs new Process / deferred (nutrients, animals, F-001)
- [ ] Any slice registering a new Process: D-007 clip verdict in BUILD_GUIDE first
- [ ] Rank into [BACKLOG.md](BACKLOG.md); do not write a synthesis essay

---

## Citation rules

| Situation | Cite |
|---|---|
| Arrival / HSI / roles / pool | **C-007**, **E-004**, **W-003**, **N-001**, **N-003**, **N-004** |
| Force dials / climate | **C-004**, **C-020** (Open — hypothesis) |
| Salt / overseas | **C-018**, **C-019** (Open) |
| Shore / exposure / tide | **C-016**, **C-017** |
| New product policy | File a candidate first — do not smuggle via a card |

Open candidates stay hypotheses. Cards never promote them.

---

## Out of scope for this protocol

- Full species lists per biome
- Animal food webs / ecosystem engineers (**F-001**)
- Richards / ML vegetation cores as authority
- Terra Nil–style place-tool → biome unlocks
- Hydro package surveys unless a card names a *compartment* Habitat lacks (GW → **C-001**)

---

## Relationship to other docs

- Island succession research → [island-colonization.md](../evidence/island-colonization.md)
- Tool / game steals → [EXTERNAL_REFERENCES.md](../EXTERNAL_REFERENCES.md) + `/study-steal`
- Equations → [NATURAL_PROCESS_MATH.md](../NATURAL_PROCESS_MATH.md) §3
- Queue → [BUILD_GUIDE.md](../BUILD_GUIDE.md); [BACKLOG.md](BACKLOG.md) feeds next slices
