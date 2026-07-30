# Island colonization — cross-climate study (research)

**Kind.** Research evidence for Open **C-018** / **C-019** — not a probe baseline.  
**Date.** 2026-07-30.  
**Method.** Five parallel climate/theory passes (theory · tropical/subtropical · temperate · cold/subarctic · volcanic barren), then synthesis under Locked **C-007**, **W-003**, **S-001**.  
**Authority.** Advisory. Open candidates stay hypotheses; do not treat this note as Locked policy. Study log rows in [EXTERNAL_REFERENCES.md](../EXTERNAL_REFERENCES.md).

---

## 1. Unified cycle (stages Habitat can express)

Same ladder on every climate. Climate retunes **rates and which guilds clear each gate** — it does not invent stages (**S-001**, **ES-001**: stages describe, do not drive).

| Stage | Process | Typical band | HSI / arrival factors |
|---|---|---|---|
| **0 — Substrate only** | Bare sand / rock / ash / fresh spit; no local seed bank | months–years | Overseas kernel only; local seedBank ≈ 0 |
| **1 — Splash / strand pioneers** | Marine splash biofilms (hard coast) → sea-dispersed strand guilds on shore | years–few decades | Salt spray / inundation / burial OK for pioneers; inland guilds fail |
| **2 — Cover & soil bootstrap** | Litter / OM / cryptogams; mild facilitation; still few guilds | decades | Moisture holding ↑; N still limiting outside hotspots |
| **3 — Structural escalation** | Shrubs / early woody / marsh turf *if climate allows*; bird vectors matter more | decades–centuries | Stage/cover filters unlock eligibility — still W-003 catalogue |
| **4 — Richness approach** | New types mostly replace, not add; area–isolation ceiling bites | centuries+ | \(S_{\text{elig}} = f(A,d)\); immigration of novelties falls as slots fill |
| **Reset branch** | Storm washover, ice scour, eruption, wave remobilization | episodic | Local rewind to 0–1; soil salt may spike (C-018 hysteresis) |

**Play sessions live in stages 0–3.** MacArthur–Wilson \(S^*\) is a **ceiling / immigration schedule**, never “paint equilibrium on load.” Young islands are **non-equilibrium**.

**Parallel tracks (not a single timeline):** intertidal woody/marsh (Branch A), hypersaline pan (Branch B), seabird-nutrient flush (Branch C). Elevation × salt × nutrients pick the branch under one engine.

---

## 2. Climate parameter table

Hold catalogue fixed (**W-003**). Move dials / derived fields.

| Knob | Tropical / subtropical | Temperate | Cold / subarctic | Volcanic barren (cross) |
|---|---|---|---|---|
| Growing season | Near year-round | Strong winter dieback; spring WoO | Short; frost kill high | Climate-capped survivors after substrate gates |
| Overseas pressure | Higher; hydrochory ≫ wind ≫ bird | Pulsed (wrack, storm); spring flush | Low mean + rare packets → long empty-suitable windows | Sea → wind → animal after cover/roost |
| Storm / ice reset | Cyclone / surge return interval | Storm + optional ice scour | Ice / freeze–thaw / surf | Eruption / ash / surf |
| Dilution of salt | Fast under high precip | Wet winters deepen freshening | Snowmelt pulses; freeze-concentration spikes | Warm rain dilutes faster than cool spray persistence |
| End-guild ceiling | Littoral woodland / mangrove where sheltered | Salt marsh turf / dune scrub / rock canopy | Sparse mosaic; guano cores green; forest often never | Tropical: forest in decades; cool: shore–moss–birdlawn for half-century+ |
| Dominant early guilds | Strand vine/mat, sand-binder, pan succulent; mangrove = **one** guild | Pioneer annual → mid-marsh engineer; dune binder; rock biofilm | Strand pioneer, cliff spray specialist, cryptogam crust | Splash algae first on hard lava; then strand; inland waits on AWC/N |
| Nutrient story | Guano accelerates cay woodland | Redox often blocks when elev “looks right” | Guano is the step-change; barren default is honest | N poverty until cyanobacteria / N-fixers / birds |

**S-001 proof case.** Krakatau vs Surtsey: identical causal order (substrate → splash/strand → inland cryptogam/herb → nutrient-facilitated cover → climate-capped woody); orders-of-magnitude different clocks.

---

## 3. C-018 steal list (salinity)

Criterion ([DECISION_CONFORMANCE](../DECISION_CONFORMANCE.md)): one ocean-sourced field, freshwater dilution, save-legacy, paired freshened-vs-salty hollow under **one** seed schedule; no cleanup tool; water residual class unchanged.

### Steal (rule-shape)

1. **One mobile `soil.salinity`** (or equivalent) on the **existing water ledger** — ocean source at shoreline / inundated cells; dilute by freshwater / snowmelt; concentrate by ET / closed basins (hypersaline pans).
2. **HSI gate, not a score** (**C-007**, **N-002**): salty hollow earns less or different occupancy than freshened twin under identical seed pressure.
3. **Hysteresis** (**S-007** / **S-008**): storm inundation spikes salt; rain/runoff/lens dilute over seasons — “ground still tastes of the sea.”
4. **Where salt bites** couples to elevation / intertidal (**C-016**) and exposure (**C-017**) — not a second biology engine.
5. **Cold-pack delta:** freeze-concentration multiplier on the same field (not a second substance).
6. **Guild-specific responses** (catalogue roles): pioneers tolerate spray/moderate soil salt; woodland / inland herbs fail on soil salt; intertidal woody needs inundation band; pan guild needs high soil salt; freshened hollow unlocks oligohaline / freshwater wetland.

### Distinct gates (do not collapse into one scalar forever)

Research converges on three *physical* meanings. Slice 20 can ship **one soil.salinity field** first (register leading direction); spray and inundation may remain derived from exposure / tide until a retune needs them as separate HSI inputs:

| Gate | Memory | Who it blocks |
|---|---|---|
| Salt spray | Fast / short (exposure × onshore wind) | Interior / canopy on windward berm |
| Soil / porewater salinity | Legacy (C-018 field) | Non-halophytes; hypersaline pans |
| Tidal inundation | Hydroperiod (C-016) | Upland guilds in intertidal; marsh/mangrove need *some* wetness |

### Paired expectation (probe later)

Identical elevation, climate, and seed schedule → freshened twin recovers faster / richer (seedling path); salty twin stays sparse or halophyte-only (stress / runner path). Temperate estuarine literature: freshened recovery often ~3–10× faster — encode as HSI + establishment rate, not species AI.

### Reject (C-018)

Player desalinate / cleanup tool · separate salt mass-balance that breaks water residual · salt-as-mangrove-theater only · scoring biota from salinity · inventing new species from salt rather than filtering the catalogue.

---

## 4. C-019 steal list (overseas arrival / biogeography)

Criterion: overseas pressure replaces mainland-perimeter rain on island worlds; smaller area or greater isolation → lower eligible richness / establishment under identical regimes; W-003 catalogue remains the universe; deterministic (**T-001**).

### Steal (rule-shape)

1. **Replace** `distanceToPreserveEdge` / mainland ring seed rain on island worlds with an **over-water dispersal kernel**.
2. **Eligible richness** \(S_{\text{elig}} = f(A, d)\): monotonic in area ↑ and isolation ↓ — sizes eligibility and pressure, does not invent types.
3. **Shore / landfall bias:** hydrochory deposits on strand / washover / lee beaches — not uniform cell rain.
4. **Vector order (weights, not stages):** sea ≫ wind ≫ bird; bird kernel rises after cover / roost / guano structure exists.
5. **Non-equilibrium young islands:** immigration of new types high early, declines as eligible slots fill — do not snap to \(S^*\).
6. **Sparse feel (cold + isolated):** low continuous pressure + rare **authored** packets (storm/wrack/bird) so suitable cells stay empty for long stretches — owner criterion for C-019.
7. **Guild-ordered eligibility** from curated catalogue: strand/salt pioneers before bird-dependent woody; climate params lock out forest where frost/ET demand it.
8. **Stepping-stone factor** as optional isolation modifier (later).

### Monotonicity tests to write later (Slice 21)

- Same regimes, small vs large island → fewer establishments / lower eligible richness.
- Near vs far isolation → same direction.
- Hash-stable under same seed (**T-001**).
- Island world must **not** use perimeter mainland rain as sole source.

### Reject (C-019)

Species simulator / speciation / adaptive radiation · per-species unlock checklists · stochastic free weather arrivals while **C-003** Open · keeping mainland perimeter rain as island default · instant equilibrium community paint · tropical-mangrove-as-default first life · treating every suitable cell as instantly occupied (destroys empty-suitable feel).

---

## 5. Reject list (shared)

| Reject | Why |
|---|---|
| Species simulator / per-taxon life histories | Ban; W-003 roles / PFTs only |
| Mangrove-as-only-coast story | Misses cay, strand, pan, bird island, temperate marsh, cold barren |
| Marine fauna engine this ladder | Guild evidence only; no crabs/seals as WorldState authority |
| Random / ambient spawn tables | Breaks **C-007**, **N-004**, **T-001** |
| Authored stage timers (“year 20 = forest”) | Breaks **ES-001** |
| Separate tropical vs cool succession engines | Breaks **S-001** |
| Coastal SWE as WorldState authority | Already banned |
| Player salt cleanup | **N-001** / **C-010** |
| Decorative wildlife without nutrient writeback | If seabirds exist later, guano must couple to soil N or stay out |

---

## 6. Optional dossier note (shore fauna)

Research consistently names **seabirds as ecosystem engineers** (dispersal + N/P subsidy), not decoration. Habitat does **not** need a fauna sim for Slices 20–21.

**Recommendation:** do **not** invent a new C-id in this pass. If a later slice wants colony hotspots, either:

- encode guano as a **deterministic nutrient param / field** read by HSI (engineer without fauna NPCs), or  
- file an Open candidate dossier (owner-judged) for shore fauna as optional later content under **E-008** role mapping.

Splash-zone algae / rocky-shore settlers are **guild evidence** for intertidal geometry (**C-016**), not a reason to ship a second biota owner now.

---

## 7. Draft Study log rows

For [EXTERNAL_REFERENCES.md](../EXTERNAL_REFERENCES.md) Study log (same commit as this note):

| Reference | Studied | What was taken | What was rejected | Landed in |
|---|---|---|---|---|
| **MacArthur–Wilson + new-island succession** (Surtsey, Krakatau, spit/marsh) | Parallel literature pass 2026-07-30 — theory + four climate bands; abstracts/pages + Habitat constraints; not a species census | Overseas kernel replaces mainland perimeter rain; \(S_{\text{elig}}=f(A,d)\); non-equilibrium young islands; guild-ordered eligibility; shore-biased hydrochory (**C-019**) | Species simulator; equilibrium paint-on-load; random spawn; mangrove-default | `docs/evidence/island-colonization.md`; Open **C-019** |
| **Coastal salinity / freshening (multi-climate)** | Same pass — tropical pans, temperate hollows, cold freeze-concentration, volcanic splash/strand | One ocean-sourced soil salinity on water ledger; freshwater dilution; HSI gate; freshened vs salty twin under one seed schedule; spray/inundation as related but distinct gates (**C-018**) | Player cleanup; second salt ledger; salt-as-mangrove-only | `docs/evidence/island-colonization.md`; Open **C-018** |

---

## Hand-off

| Slice | Read |
|---|---|
| **20** | §3 C-018 steal + paired hollow expectation — **landed** (machine half; dossier) |
| **21** | §4 C-019 steal + monotonicity tests — **landed** (machine half; dossier) |
| Presentation | Empty-suitable windows and sparse overseas are the owner-feel hinge — dossier C-019; only after Tier-M (done) |

**Researchers:** [Theory](665911ca-6d32-4f87-a10a-3ffc66239ee6) · [Tropical](51b62ea8-3d4c-4eea-8432-cdd158d29733) · [Temperate](2d13a2aa-24b3-4a9c-af9e-8d09f1f78146) · [Cold](ad5d4d9c-5e4c-4c7b-a812-01a3a87e693e) · [Volcanic](d047bef5-b367-48d0-b1c4-caa6b2cf7378).
