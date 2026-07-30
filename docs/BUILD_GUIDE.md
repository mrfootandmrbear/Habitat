# Habitat — Build Guide

> **Status:** Working draft  
> **Role:** Per-slice execution checklists for the joint sim/game ladder in [MVP_SCOPE.md](MVP_SCOPE.md)  
> **Authority:** Subordinate to the [Decision Register](DECISION_REGISTER.md) and MVP_SCOPE. Architecture: [SIMULATION_MODEL.md](SIMULATION_MODEL.md). Evidence: [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md). Who verifies what: [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md). Study-not-ship: [EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md). Advisory origin: [reviews/2026-07-27-incremental-world-building-report.md](reviews/2026-07-27-incremental-world-building-report.md).

---

## 1. How to use this guide

1. Read **§4.0 Autonomous session protocol** before starting work.  
2. Pick the next open checklist in §4 (respect MVP_SCOPE fun gate for owner asks).  
3. Do not start the next slice until **Definition of done** (§2) is satisfied.  
4. After merge: `npm test`, `npm run conformance`, update golden hashes if physics intentionally changed.  
5. Every steal from [EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md) must cite a register ID or candidate (**C-001**…); bans cite the fight (T-001, T-006, T-007, GEO-002).

**Before requesting a playtest**, pass the ask gate in [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md) §4. Anything settled by a number is the agent's to settle; owner sessions are for attention, legibility, and taste.

Standing commands:

```bash
npm test
npm run build
npm run conformance             # regenerate ledger
npm run conformance:check       # CI
npm run probe -- <scenario>     # Tier-M scenario evidence (rewrites baseline-compared table)
npm run probe -- --all --check  # CI: every scenario vs committed baseline, non-zero on drift
npm run dev                     # playtest (owner only after ask gate)
```

The four green-bar commands (`test`, `build`, `conformance:check`, `probe -- --all --check`) are the session gate in §4.0 step 3. Alias: `npm run gate` (CI runs `gate`).

---

## 2. Definition of done (every slice)

A slice is complete only when all hold:

| # | Requirement | Notes |
|---|---|---|
| 1 | **Named loops** | One sim edge and one game edge stated in one sentence each (or “infrastructure” for sim). |
| 2 | **Observable** | Signal is encoded strongly enough to see without an inspector. Agent proves the encoded delta (VERIFICATION_POLICY Tier P); owner answers only whether they noticed it. |
| 3 | **Determinism** | Golden hash (or registry hash) committed; intentional physics changes update it deliberately (T-001). |
| 4 | **Invariant** | Named class from §2.1 — not the same as determinism. |
| 5 | **Inspector** | New authoritative fields registered and inspectable (T-005), if the registry exists. |
| 6 | **Notebook seed** | One sentence the Field Notebook *could* later say honestly (U-006). May be recorded in the PR even if U-006 UI does not exist. |
| 7 | **Register citations** | Code/docs cite IDs; unknown IDs fail conformance; new implicit decisions filed as candidates. |
| 8 | **Owner play** | Required **only** when the slice produces an owner-only question ([VERIFICATION_POLICY.md](VERIFICATION_POLICY.md) Tier O). Infrastructure / hygiene / perf slices satisfy this row by stating “no owner-only question; deferred to \<next observable slice\>”. If there is one, pass the §4 ask gate first and write the request per §5. |
| 9 | **Slice manifest** | `docs/slices/<slice>.json` declares register IDs, invariant class, test files, probe scenario(s), notebook seed, and the Tier-O field (a question or the literal deferral sentence). `conformance:check` validates the named artifacts exist. A slice is not checked off in §3 until its manifest validates. |
| 10 | **Queue stays two deep** | Before closing a slice, the **next-but-one** slice is specified to §4.3 depth (loops, register/candidate IDs, study source, bans, checklist). A session must never finish with only one executable item ahead of it. |

### 2.1 Invariant classes (pick deliberately)

| Class | Catches |
|---|---|
| Conservation | Mass leak / silent boundary drain |
| Refinement | Dead `dt` / non-convergent schedules |
| Monotonicity | Wrong causal direction |
| Bounds | NaN / out-of-range registry fields |
| Equilibrium | Ringing / unstable ponds |
| Symmetry | Update-order / index-order bias |
| Write isolation | Observers (prediction, inspect) mutate sim (P-006, T-006) |

---

## 3. Completed slices (MVP + post-MVP Tier-M)

Summary only — do not reopen unless fixing regressions.

| Slice | Sim | Game | Key artifacts | Invariants / gate |
|---|---|---|---|---|
| 0–1 | Heightfield hydrology scaffold | Observe rain / pool | `fluxStep`, WaterMesh | Determinism |
| 2 | WorldState, registry, no-flow, SimClock | Pause / 1× / 4× / 16× | `WorldState`, `SimClock`, CI | Conservation, S-009 |
| 3 | Terrain → watershed / accumulation | Inspector: accumulation / watershed | `flowRouting.ts` | Accumulation ≥ 1 |
| 4 | Surface → soil moisture | Ground darkens | `soilWaterProcess` | **Pass** |
| 4b | Priority-Flood depressions | Honest ponds | `pitDem.ts`, `basin-fill` probe | Agent Tier-M |
| 5a | — (observer) | Predict water (P-006) | `PredictionSession` | Write isolation **Pass** |
| 5b | Terrain edit (berm/dig) | Site a cause (A-005) | siting tools | **Pass** (open: one-tool park — §4.1) |
| 5 | Soil → vegetation | Green follows wet | `vegetationProcess` | **Pass** |
| 6 | Veg → roughness / infil → water | Cover blunts storm | paired-storm probe | **Pass** (sim MVP) |
| §4.1 hygiene | Ledgers, D8, metric clock, bounds, symmetry | — | probes | Agent-only |
| P (§4.2) | Observers / FX only | Volume without voxels | cage, cursor, flow cues | Tier-P; optional Tier-O batched |
| 8 | Soil depth legacy + geomorphology | Thin soil holds less | `save.ts`, `geomorphologyProcess` | Tier-M; Tier-O erosion deferred |
| 8b | Soil ↔ GW ↔ baseflow (C-001 Locked) | Channels seep after storms | `groundwaterProcess`, `baseflow-persist` | Tier-M conservation |
| 8c | Observers + rain regime + form memory | Return visit then→now | `rainRegime`, `regime-divergence` | **Done** — Tier-O Pass (batch 2026-07-30) |
| 9 | Liebig HSI / limiting factor | Inspect what holds a patch back | `hsiComposition`, `limiting-shift` | Tier-M; Tier-O deferred |
| 10 | Fire / fuel (Olson + BFS) | Authored ignition; wet resists | `fireProcess`, `burn-recover` | Tier-M; Tier-O deferred |
| 11 | Slope/aspect + Beer–Lambert light | Same rules, different succession trajectories | `lightCompetition`, `succession-diverge` | Tier-M + Tier-P; Tier-O deferred |
| drydown | Insolation × cover ET partitions | World dries unevenly after rain | `evapotranspiration`, `drydown-feedback` | Tier-M + Tier-P; audio wired |
| A | Audio scaffold (observer) | Water ambient + silence-as-signal | `AudioBus`, C-014 dossier | Agent Done; C-014 Open |
| 12 | Arrival / first occupant (C-007) | Shoots appear where conditions suit | `dispersalProcess`, `arrival-earned` | **Done** — C-007 Locked |
| 13 | Biology → physics (E-005) | Living hollow blunts the next storm | `physicalCover`, `living-hollow` | **Done** — Tier-O Pass (batch 2026-07-30) |
| 14 | Scenario objective scaffold (G-002) | Finite objective over same loop | `ScenarioSession`, `scenario-window` | **Done** — Tier-O Pass (batch 2026-07-30) |
| **16** | Sea level + island (**C-015**) | Shape an island; sea is the outlet | `generateIsland`, `ledger.oceanExchange` | **Done** — Tier-O Pass (batch 2026-07-30) |
| **15** | Scenario brief chrome | Accept a brief on the island world | Scenario UI observer | **Done** — Tier-O Pass (batch 2026-07-30) |
| **F** | Force panel + climate-mean rain + orographic wind (**C-020** lite) | Sculpt island · set forces · watch the place | `FORCE_PANEL`, `orographicPrecip`, `orographic-wind` | **Done** — agent (no Tier-O) |
| **17** | Tidal envelope / intertidal (**C-016**) | Widen tide → shore band grows | `tidalEnvelope`, `shore.intertidal`, `tidal-envelope` | **Done** — Tier-O Pass (batch-maritime-shore 2026-07-30) |
| **18** | Wave exposure + coastal erosion (**C-017**) | Windward shore retreats via geomorphology | `shoreExposure`, `shore-exposure` | **Done** — Tier-O Pass (batch-maritime-shore 2026-07-30) |
| **19** | Beaches / longshore deposition (**C-017**) | Windward scours; lee receives | `longshoreTendency`, `longshore-drift` | **Done** — Tier-O Pass (batch-maritime-shore 2026-07-30) |
| **20** | Salinity (**C-018**) | Freshened vs salty hollow | `soil.salinity`, `salinity-arrival` | **Done** — Tier-O Pass (batch-salt-overseas 2026-07-30) |
| **21** | Island biogeography (**C-019**) | Overseas arrival; small vs large island | overseas kernel, `island-arrival` | **Done** — Tier-O Pass (batch-salt-overseas 2026-07-30) |

**Current gate:** Slices **14** / **16** / **15** Tier-O **Pass**; **Slice F** / **17**–**21** Done. Maritime shore Tier-O **Pass** (C-016 / C-017). Salt / overseas Tier-O **Pass** ([docs/playtests/batch-salt-overseas.md](playtests/batch-salt-overseas.md) — C-018 / C-019; Lock still owner). Full **C-020** clouds/phase later (owner: rain dial still reads as a spigot — dossier). **Slice A** audio wired (C-014 Open). C-004 stewardship reading still Open. Next: later stubs (AUD-003 / Field Notebook / scenario campaign).

**The ladder, read as force dials.** [THESIS.md](THESIS.md) §4 reframes what the remaining slices are *for*: each one adds a force the player can turn, and the value is combinatorial rather than additive. 8b adds *does it stay wet between storms*; 8c / **F** add *mean rainfall climate* and make windward/leeward consequence visible in the landscape; 9 adds *what can live here* as the arrival gate; 10 adds *fire*; 11 adds *light and succession*; dry-down closes the balancing ET edge so greening is not a one-way ratchet; 12 adds *life moves in*; 13 closes *life changes how water moves*; 14 adds *finite objectives over the same loop* (G-002); **16** adds *sea level as global base level* (island form — C-015); **17** adds *tidal envelope / intertidal* (C-016); **18** adds *wave exposure → shore change* (C-017); **19** adds *longshore lee deposit / beaches* (C-017); **20** adds *salinity as legacy load* (C-018); **21** adds *overseas arrival* (C-019). Missing dials, unfiled beyond candidates: season beyond precip mean. Closing a sim edge is the mechanism; adding a dial is the reason.

**Research ↔ decisions.** Steals from EXTERNAL_REFERENCES map to Locked/Current IDs or candidates C-001…C-020. Do not implement Open candidates as if Locked. Slice 21 acted on MacArthur–Wilson + new-island succession → overseas kernel + `island-arrival` (**C-019**); rejected species simulator, equilibrium paint, perimeter-as-island-default.

---

## 4. Next work

### 4.0 Autonomous session protocol

Cold-start one-pager: [AGENTS.md](../AGENTS.md). Procedural skills (slash or auto): `/run-gate`, `/author-probe`, `/write-playtest`, `/promote-candidate`, `/study-steal`, `/blocked-note` under `.cursor/skills/`. Cloud Agents: `.cursor/environment.json` (`npm install`; headless gate preferred). Always-on policy stays in `.cursor/rules/` — do not migrate vision / verify-before-asking into skippable skills.

Every agent session that advances the sim or build plan:

1. **Classify claims** for the slice as Tier **M** / **P** / **O** ([VERIFICATION_POLICY.md](VERIFICATION_POLICY.md)).  
2. **Implement** behind tests/probes — Prefer `npm run probe -- <scenario>` for scenario-scale Tier-M.  
3. **Green bar before “done”:** `npm test`, `npm run build`, `npm run conformance:check`, `npm run probe -- --all --check` (skill: `/run-gate`).  
4. **Name Tier-M artifacts** in the commit body when physics change (golden hash, probe baseline, test file). A probe baseline may only move in a commit that says why.  
5. **No owner ask** unless VERIFICATION_POLICY §4 ask gate passes (one sentence, no numbers). Hygiene / infrastructure / Closeouts: **never** open a playtest. When the gate passes, write the request with `/write-playtest`.  
6. **Batch Tier-O** — Presentation + erosion legibility share one future ask; do not drip-feed. The batch **fires** when a third question joins it, or when the next slice cannot start without an answer, whichever comes first (VERIFICATION_POLICY §4).  
7. **Research discipline** — If acting on an EXTERNAL_REFERENCES steal, cite the register/candidate ID in code or BUILD_GUIDE checklist; if inventing policy, file a candidate first (skill: `/study-steal`).  
8. **Close what you proved** — When a candidate's **Judge** in [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md) §3 names only CI or agent probes, the agent promotes it itself once the criterion is met, in the same commit as the evidence (DECISION_CONFORMANCE §3.0; skill: `/promote-candidate`). When the Judge names the owner, the agent writes the promotion dossier instead and leaves the entry Open. Never leave a question the machine already answered sitting in the owner's queue.  
9. **Refill the queue** — DoD row 10: leave the next-but-one slice specified to §4.3 depth before closing the current one.

### 4.0.1 Stop conditions — what to do when blocked

Autonomy needs a defined failure exit, or the two failure modes are idling and inventing policy. Both are worse than a note.

| Situation | Action |
|---|---|
| Tier-P proxy red after **3** retunes | Stop retuning. Write `docs/blocked/<date>-<slice>.md` naming the encoding tried and the measured gap; add the question to the Tier-O batch; move to the next queue item. |
| A choice needs policy that no Locked entry or candidate covers | File a candidate (**C-00x**) with the five-part contract, mark it Open, implement nothing under it; move to the next queue item. |
| `conformance:check` fails on an ID the agent cannot legitimately cite | Fix the citation or file the candidate — never delete the check or invent an ID. |
| Golden hash or probe baseline changes **unintentionally** | Treat as a defect, not a baseline update. Find the cause before re-committing; an unexplained baseline move is never “done”. |
| Candidate blocks the slice and its Judge is the owner (e.g. **C-003**) | Write the dossier, park the slice, take the next queue item. Do not implement under an owner-judged Open candidate. |

A blocked note is a normal session outcome. An idle session is not. Skill: `/blocked-note` → `docs/blocked/<date>-<slice>.md`, then take the named next item.

---

### 4.1 Autonomous closeouts *(agent-only; before Slice 8b)*

No Tier-O. Order:

- [x] **Probe baseline harness** *(do first — it is the tripwire everything else in §4.0 assumes)*. `npm run probe` compares against committed baselines; CI runs `npm run gate`. Scope:
  - [x] `docs/evidence/<scenario>.baseline.json` committed per scenario; each metric carries a tolerance (absolute or relative) chosen with the scenario, not per run  
  - [x] `npm run probe -- <scenario>` rewrites `docs/evidence/<scenario>.md` as **this run vs. baseline, with deltas**, matching VERIFICATION_POLICY §8  
  - [x] `npm run probe -- --all --check` runs every scenario, exits non-zero on any out-of-tolerance metric, writes nothing  
  - [x] `npm run gate` = `test` + `build` + `conformance:check` + `probe -- --all --check`; CI runs `gate`  
  - [x] Baselines for the three live scenarios (`paired-storm`, `berm-reroute`, `basin-fill`) committed from the current tree, with the numbers stated in the commit body  
  - Tier-M: a deliberately perturbed constant fails `--check`; an unperturbed run passes (`src/sim/probes/baseline.test.ts`). No Tier-O.
- [x] **`deep-time` probe** *(do second — it is the cheapest de-risking available)*. Headless 100 compressed sim-years (10 decadal bands × prototype ladder) on a fixed-seed 24² mountain. Slow fields still move late (no f32 stall). Mass residual and step ms reported at 20-year intervals (feeds **C-008** / **C-012**). **Finding:** water-balance residual grows to ≈ −0.019 by year 100 on this fixture — recorded, not zero; investigate as ledger follow-up, not a stall. P-005 criterion discharged and entry **Locked**.
  - [x] Headless run over a decadal horizon at fixed seed; record what actually moved — elevation, soil depth, cover, ledgers — at intervals, not just at the end  
  - [x] Assert slow accumulators are **still changing** late in the run, which is the specific f32-stall failure  
  - [x] Report mass residual and step ms across the horizon (feeds **C-008** and **C-012**)  
  - [x] P-005's criterion — advance 100 sim-years, reload, advance again, identical hash — landed in `deep-time` (+ legacy `soil.depth` production divergence)  
  - Tier-M only. No Tier-O.
- [x] **Slice manifest validation** — `docs/slices/<slice>.json` per DoD row 9; `conformance:check` fails when a manifest names a missing test, probe, or field. Manifests for Slices **8** and **P** committed; earlier slices grandfathered.  
- [x] **5b one-tool — parked, won’t-do.** Berm and dig both shipped and both read as causes (A-005); “one tool only” was a spike constraint on the original prototype, not a register decision, and removing dig would cost a verb to satisfy a constraint nothing cites. Closed by decision, not by work.  
- [x] **Berm/dig ↔ `soil.depth` mass** — *thesis-critical.* Dig/berm move `soil.depth` with elevation so bedrock = elev − depth is unchanged (THESIS §2.1; snowflow steal; **C-002** / GEO-002). Tier-M in `siting.test.ts`: per-cell Δelev = Δdepth; ΣΔelev = ΣΔdepth across the brush. Moisture column conserved on depth change.  
- [x] **Deferred grains** — leave deferred (flow cues sufficient).  

---

### 4.2 Presentation track — volume without voxels *(parallel; T-006 / T-007 / A-005)*

Study origin: falling-sand peers + snowflow — catalogued in [EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md). **Steal presentation patterns; do not adopt voxel CA or GPU deform buffers as authority.**

**Loops.** Sim: none new (observers + FX only). Game: volume and agency read as column-stack × time and cause verbs.

**Standing bans:** voxel CA as world authority; RAF-coupled physics; opaque cube water as primary depth language; dual GPU+CPU hydrology engines; WebGPU-only / 90 FPS as DoD; GPU deform as hydrology authority.

**Steal from snowflow (API shape):** shared surface write; berm = displaced mass; beauty ≡ observer sampling; particles decorate.

**Checklist:**

- [x] Extent cage, snapped cursor, flow cues, dual readouts, conservation HUD, property bundles, Tier-P proxies  
- [ ] Presentation-only grains — deferred  
- [ ] Batched Tier-O: [PLAYTEST_PRESENTATION.md](PLAYTEST_PRESENTATION.md) — only after ask gate  

---

### 4.3 Slice 8b — Groundwater / baseflow store *(Done — C-001 Locked)*

**Loops.** Sim: soil ↔ cheap GW store ↔ baseflow to surface so channels persist between storms (H-001, H-004, **C-001**). Game: dry spell does not instantly empty the hollow — storage, not a silent leak.  
**Register / candidates.** H-001, H-004, T-001, T-006; **C-001** Locked.  
**Study.** GWSWEX SW/UZ/GW compartment + mass-balance history ([EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md)); NATURAL_PROCESS_MATH §4 Darcy/Boussinesq *lite*.  
**Bans.** Richards / Celia / MODFLOW in-browser; ML water-cycle cores as authority.

- [x] Register `groundwater` (or equivalent) storage field + owner/band; schema bump if legacy  
- [x] Recharge from soil moisture; baseflow contribution onto surface (or channel cells)  
- [x] Extend water balance residual to include GW compartment  
- [x] Tier-M: conservation across multi-day wet→dry; probe `baseflow-persist` — wet channel after N dry days **with** GW ≫ without  
- [x] Inspector overlay for GW / water table proxy  
- [x] Notebook seed: e.g. “The hollow kept seeping after the rain stopped.”  
- [x] `docs/slices/8b.json` manifest (DoD row 9)  
- [x] **Promote C-001** — channel ≈ 0.011 vs 0; GW sum ≈ 30; H-004 rel residual < 1e-4  
- [x] Owner play: Tier-O deferred until persistence is visible without inspector  

---

### 4.3b Slice 8c — The return visit *(game-side; the thesis slice)*

**Why this exists.** [THESIS.md](THESIS.md): the loop is *build the form → choose the forces → run time → look*. Slice 8 shipped geomorphology as Tier-M and left its legibility deferred, which means the payoff the whole project is named after — nature having its way with what you built — currently exists and is **invisible**. This slice makes the return visit real. It adds no new sim system.

**Loops.** Sim: none new (observers, encoding, and time controls only). Game: you build something you care about, run time forward, and come back to find out what became of it.  
**Register / candidates.** **C-004** (force regime as the post-build verb), **C-008** (response budget), A-005/N-001 boundary — regimes and pulses, never targeting; T-002/S-009 time rates; GEO-002 erosion already implemented.  
**Bans.** No new authoritative fields. No targeting a force at a location (THESIS §9). No scripted "your berm collapses now" event — the erosion must be the sim's (N-004).

- [x] **Save / load in the UI** — localStorage via `sessionPersist.ts` (T-003 / P-005)  
- [x] **Undo** for sculpting (**C-013** hypothesis) — edits only; cleared when time advances (S-007)  
- [x] Erosion / deposition legible **without** the inspector on player-made terrain — form-memory elev tint (Tier-P max encoding > 0.15 after geo)  
- [x] One force dial the player sets before running time — **Rain: dry / light / moderate / heavy** (authored; C-003 direction, C-004); storm wet-fraction + perimeter pour-point outlets (SIM §10.2) so heavy is not a closed-basin firehose  
- [x] Before/after readable across a fast-forward — **Remember form** captures then; default view encodes Δelev  
- [x] Tier-P: encoded-signal proxy on the eroded-vs-untouched delta at default camera; response-latency proxy per **C-008** *(proxy green; budget number still owner)*  
- [x] Tier-M: same seed + same regime → identical hash; different regime → divergent outcome (`regime-divergence`)  
- [x] `docs/slices/8c.json` manifest (DoD row 9)  
- [x] Notebook seed: “The berm I built is a low ridge now, and the channel moved.”  
- [x] **Tier-O Pass** ([docs/playtests/batch-living-return.md](playtests/batch-living-return.md), owner 2026-07-30): living hollow answered the storm; wanted another run — subsumes prior 8c return-visit ask; C-004 stewardship reading remains Open in dossier

---

### 4.4 Slice 9 — Limiting factors / HSI spine *(Done — agent)*

**Loops.** Sim: hydrological state → Liebig-style limiting factor / HSI fields (NATURAL_PROCESS_MATH §3.3, §8.2) — the first field whose *meaning* is "what is holding this patch back". Game: inspect *why* a patch is ready or not (E-009 / S-008 direction) without populations yet.

**Thesis role (C-007).** This is the **arrival gate**, not an inspector layer. THESIS §5: you dig the moat and something moves in *because the conditions suit it*. HSI is the mechanism that decides what shows up — which is why it outranks introduction machinery (E-007, E-008, RC-003) rather than serving it.  
**Register / candidates.** ES-006 (capacity emerges — no fixed `K`), E-009 (readiness inferred from state), S-008 (hysteresis legible), U-001 layered inspect, N-004 (no hidden rules — the limiting factor must be inspectable, never a magic gate).  
**Study.** NATURAL_PROCESS_MATH §3.3 Liebig minimum and §8.2 HSI composition; composition choice in `docs/slices/9-composition.md`.  
**Bans.** No scalar "health" score standing in for the limiting factor (N-002). No fixed carrying capacity (ES-006). No readiness value that the player cannot trace to a field (N-004, S-004).

- [x] Limiting-factor field: per cell, which input is minimum and by how much — derived from moisture / soil depth / GW; registered with owner + band (T-005)  
- [x] Composition rule written down before code (minimum vs. product), cited to NATURAL_PROCESS_MATH §3.3 — `docs/slices/9-composition.md`  
- [x] Inspector layer showing the limiting input, not just a score  
- [x] Tier-M: monotonicity — improving the limiting input raises HSI; improving a non-limiting input does not  
- [x] Tier-M: bounds — HSI stays in range, no NaN where an input is zero  
- [x] Probe `limiting-shift`: a patch whose limiting factor changes identity across a wet→dry schedule  
- [x] `docs/slices/9.json` manifest (DoD row 9)  
- [x] Notebook seed: “Water — not light — is limiting here.”  
- [x] Tier-O candidate (batch, do not ask alone): *does the world tell you what it needs without the inspector?* — deferred; C-007 dossier notes arrival still missing  

---

### 4.5 Slice 10 — Fire / fuel *(Done — agent)*

**Loops.** Sim: vegetation → fuel load → fire disturbance → cleared cover → succession restart (ES-002 — disturbance is necessary, not a failure state). Game: a pulse intervention with real semantics — the player sites a burn as a *cause* and lives with the result (A-002, A-006, A-005).  
**Register / candidates.** ES-002, ES-001 (succession emergent), A-002, A-006, A-005, RC-004 (ecological time constrains repetition), N-005. Fire ignition timing touches **C-003** — authored ignition only until C-003 closes; no stochastic arrivals.  
**Study.** NATURAL_PROCESS_MATH fire/fuel section; EXTERNAL_REFERENCES cellular fire-spread peers are **presentation and rule-shape study only** — spread must run on the same WorldState authority as hydrology (T-006).  
**Bans.** Fire as a scripted event or scenario trigger (N-004). Fire as pure penalty (ES-002 — it is a process, not a punishment). Stochastic ignition while C-003 is Open. A second disturbance engine parallel to the sim step.  
**Gate.** After Slice 9, so readiness / limiting factors exist to disturb and recovery is measurable.

- [x] `fuel` field accumulating from vegetation, depleted by fire; registered with owner + band (`fire.fuelLoad`, decadal)
- [x] Authored ignition only (C-003); BFS spread cited and deterministic under T-001 (`ignite` tool + `igniteCell`)
- [x] Moisture couples to spread — wet ground resists burning, closing fire back onto the hydrology spine
- [x] Tier-M: conservation/accounting across a burn (fuel consumed vs. cover lost); determinism hash across the disturbance (`fire.test.ts`)
- [x] Tier-M: post-fire recovery trajectory differs by pre-fire moisture (probe `burn-recover` — wet recover ≈ 0.454 vs dry ≈ 0.07 after Slice 11 light coupling; accountingError ≈ 6e-6; determinismMatch = 1)
- [x] `docs/slices/10.json` manifest (DoD row 9)
- [x] Notebook seed: “The burn ran to the wet ground and stopped.”
- [x] Tier-O candidate (batch): *did the burn read as something you did, or as something that happened to you?* (A-005 / N-001) — deferred
- [x] **Next-but-one:** Slice 11 specified to §4.3 depth (§4.6) before this slice closes (DoD row 10)

---

### 4.6b Dry-down ET coupling *(Done — agent)*

**Why this exists.** Flat `etRate` made vegetation a one-way ratchet: cover improved infiltration with no transpiration cost, and aspect did not dry differently. NATURAL_PROCESS_MATH §1.6–1.7 + Slice 11 insolation close the balancing edge.

**Loops.** Sim: insolation × lagged cover → moisture-limited PET/AET partitions (soil evaporation, transpiration, open water) with H-004 ledger closeout. Game: after rain, south slopes and bare ground dry faster; vegetated hollows keep drinking — readable in default terrain tint + wired water audio.

**Register / candidates.** H-001, H-003, H-004, ES-003, ES-005, S-009, T-001, T-005, T-006, C-008, C-014 (audio wire; still Open for owner half).

- [x] Composition note `docs/slices/drydown-composition.md`
- [x] Process hardening: topo scheduler, dt-scaled daily/decadal rates, fire contributes `veg.cover` / `fire.fuelLoad`
- [x] `et.potential` / `et.actual` + partition ledgers; `fire.scar` persistent fade
- [x] Default-view encoding keeps wet-vs-dry under cover; scar tint; audio observer in `main.ts`
- [x] Probes `drydown-feedback` (PET gap ≈ 0.0063; moisture gap ≈ 0.022; transpiration gap ≈ 6.68; rel residual ≈ 1e-7) and `disturbance-recovery` (half-recovery, bounded)
- [x] `docs/slices/drydown.json` manifest
- [x] Tier-O deferred (batch): *after the rain stopped, did the place feel like it was drying itself?*

---

### 4.6 Slice 11 — Light / succession *(Done — agent)*

**Why this exists.** [THESIS.md](THESIS.md) §2.1 / §5: the castle comes alive when life takes the form you built — and different aspects, burns, and moisture histories must produce different futures from the *same* rules, never from authored stages. Slice 9 already named water/depth/GW as limiting; Slice 10 clears cover. This slice adds the light dial so succession is a consequence of insolation × canopy, not a timer.

**Loops.** Sim: insolation / canopy light (Beer–Lambert) → light competition / succession trajectory without authored stages (ES-001). Game: north vs south / burned vs unburned / wet vs dry read as different futures from the same rules — not painted stages.

**Thesis role.** Force dial on the ladder (BUILD_GUIDE §3): after fire, *light and succession*. Under **C-007**, trajectories remain conditions for arrival, not introduction scripts — stage labels may describe state but cannot drive it (ES-001).

**Register / candidates.** **ES-001** (Locked — succession emergent; stage labels describe, do not drive). **ART-001** (Current — scientific impressionism; NATURAL_PROCESS_MATH §1.9 ties insolation readability here). Touchpoints: **ES-006** (capacity emerges — light may join Liebig inputs once registered, never a fixed `K`); **E-009** (readiness inferred — light must stay an inspectable field, not an unlock); **C-007** (Open — arrival verb; do not implement introduction machinery here). Field registration cites **T-005**.

**Study.** NATURAL_PROCESS_MATH §3.2 (Tilman R* + Beer–Lambert light competition) and §1.9 (insolation from slope/aspect + horizon shading); seasonal band on the timescale ladder (§7 — light competition ~10 days). Composition choice written before code as `docs/slices/11-composition.md` (same pattern as Slice 9's `9-composition.md`).

**Bans.** Authored succession stages as authority (ES-001 rejected alternatives). Light as a free-floating "health" scalar (N-002; NATURAL_PROCESS_MATH §6). A second vegetation engine parallel to existing `vegetationProcess` — extend cover/light coupling in-process, do not fork a rival owner of `veg.cover` (T-006 / GEO-002 earn-its-cost).

**Gate.** After Slice 10 (fire/fuel **Done**). Burn→cover restart is available for burned-vs-unburned trajectory contrast.

- [x] Register `light.insolation`, `veg.leafAreaIndex`, and `light.understory` with vegetation owner + daily band; understory-light inspector overlay (T-005)
- [x] Beer–Lambert reduced form cited before code — composition note `docs/slices/11-composition.md` (NATURAL_PROCESS_MATH §3.2, §1.9)
- [x] Couple to existing `veg.cover` via `vegetationProcess` (extend, do not replace); burn-cleared cells receive more understory light and a larger next-step gain
- [x] Tier-M: monotonicity / bounds — more canopy → less understory light; registered fields stay in range with no NaN (`light-succession.test.ts`)
- [x] Tier-M: paired divergence — identical moisture/rules yield south mean cover ≈ 0.506 vs north ≈ 0.361; deterministic replay match = 1
- [x] Probe `succession-diverge`: insolation gap ≈ 0.525; cover gap ≈ 0.145 with committed baseline tolerances
- [x] Tier-P: paired-aspect understory values produce inspector color-distance ≈ 0.223 (> 0.15 floor) at default encoding (`presentation.proxy.test.ts`)
- [x] `docs/slices/11.json` manifest (DoD row 9)
- [x] Notebook seed: “With the same soil moisture, the brighter south-facing slope filled in first.”
- [x] Tier-O candidate (batch, do not ask alone): *do the slopes feel like different futures, or like the same place with different tint?*
- [x] **Next-but-one:** Slice 12 specified to §4.3 depth (§4.8) before this slice closes (DoD row 10)

---

### 4.7 Slice A — Audio scaffold *(Done — agent machine half; C-014 Open)*

**Why this exists.** AUD-001 / AUD-002 / AUD-003 are **Locked** and had never appeared in a slice or a line of code. Silence is a *signal* (AUD-002), not an absence of assets, and THESIS §8's clip test cannot pass in silence. Open sub-question **C-014** (how audio derives from simulation state) — leading direction: sampled/mixed sources from field values; silence first-class.

**Loops.** Sim: none new — audio is a pure observer of an existing registry field (T-006). Game: ambient water gain rises with surface water and goes meaningfully silent when the hollow is dry (AUD-001 / AUD-002).

**Register / candidates.** AUD-001, AUD-002, AUD-003 (Locked intent); **C-014** Open (owner-judged promotion — dossier only, do not flip); T-006 (observer), T-001 (no sim RNG).

**Study.** No third-party audio engine steal required for the scaffold; EXTERNAL_REFERENCES peers remain study-not-ship for presentation. Mapping lives in `src/audio/AudioBus.ts`.

**Bans.** Writing WorldState from audio. A second sim RNG for mix decisions. Invented wildlife presence fields — drive from an existing field (`water.surfaceDepth`). Web Audio required for CI / Tier-M. Conflicting with Slice 10 fire/fuel process ownership.

**Gate.** Parallel to Slice 10 (does not own WorldState process order). Machine half closed here; owner half of C-014 stays Open.

- [x] Audio observer module (`src/audio/AudioBus.ts`) — reads `water.surfaceDepth`, maps mean → `ambient.water` gain
- [x] Zero / absent field → `silent === true`, `level === 0` (true silence as signal, AUD-002)
- [x] Raising the field raises mapped level (monotonic; saturate at 0.25 m mean)
- [x] Tier-M: write isolation — `audioObserver.writes === []`; snapshot sample does not change `stateHash`
- [x] Tier-M: RNG isolation — no `Math.random` / sim RNG in audio path; same depths → identical mix
- [x] Optional Web Audio apply hook is a no-op without a gain target (`webAudioHook.ts`) — CI does not need AudioContext
- [x] `docs/slices/A.json` manifest (DoD row 9)
- [x] Notebook seed: “The hollow went quiet when the water left.”
- [x] `docs/candidates/C-014-dossier.md` — machine half numbers; owner-only question (no playtest ask)
- [ ] **Tier-O / C-014 owner half** (batch only): *When the water left, did the quiet feel like the place going still — or like the sound broke?* — do not promote C-014
- [x] **Next-but-one:** main ladder Slice 11 already specified (§4.6); next audio follow-on remains AUD-003 recovery bed (later stub — not expanded)

---

### 4.8 Slice 12 — Arrival / first occupant *(Done — C-007 Locked)*

**Why this exists.** [THESIS.md](THESIS.md) §5 names “life moves into it” as the missing payoff. Slice 9 built the inspectable suitability gate and Slice 11 made terrain/light produce different ecological futures; this slice tests **C-007** by letting one real plant functional type arrive because a place became suitable, without a player introduction action.

**Loops.** Sim: fixed preserve seed source → dispersal pressure × Liebig HSI → establishment / biomass for one plant functional type. Game: shape and wet the place, run time, and see an occupant appear where the conditions earned it.

**Register / candidates.** **C-007** (**Locked** — owner Pass 2026-07-29: appearance mimics real life via earned conditions), **ES-006**, **E-009**, **W-003** / **E-004**, **T-001** / **T-003**, **T-005**, **N-001** / **N-004**. Steal: Viva Piñata condition-earned arrival → `12-composition.md` (authored unlock checklists rejected).

**Study.** NATURAL_PROCESS_MATH seed-dispersal kernel note (`p = 1 − e^{−Σ seeds}`) composed with §3.3 Liebig HSI; SIMULATION_MODEL §3.5 plant functional types. Write `docs/slices/12-composition.md` before code, including the fixed seed source, establishment equation, and why the chosen functional type belongs to Windward Basin.

**Bans.** An introduction/place-species tool as the primary biological verb. Occupancy copied directly from HSI with no dispersal path. Unsaved or ambient randomness. A hidden readiness unlock. Invented species/material names. A second vegetation owner parallel to `vegetationProcess`.

**Gate.** After Slice 11 (**Done**). C-007 Locked after machine half + owner Pass.

- [x] Composition note names one real functional type, fixed preserve seed source, dispersal/establishment equation, and field ownership
- [x] Register seed pressure / establishment probability / occupant biomass (minimal set) with owner + annual/seasonal band; RNG or accumulated arrival state is save-safe (T-003)
- [x] Couple establishment to existing `habitat.suitability`; zero suitability prevents establishment
- [x] Tier-M: improving the limiting HSI input raises arrival probability; improving a non-limiting input does not
- [x] Tier-M: same seed + forcing → identical arrival hash; fields bounded / finite
- [x] Probe `arrival-earned`: paired suitable/unsuitable patches under one seed schedule, with baseline tolerances and measured arrival delta (suitable biomass = 2.5, unsuitable = 0, `earned = 1`)
- [x] Tier-P: occupant encoding clears perceptual floor against the pre-arrival state without requiring the inspector (`occupantEncodingDelta > 0.15`)
- [x] Update `docs/candidates/C-007-dossier.md` with the completed machine half; owner-only question remains one sentence with no number
- [x] `docs/slices/12.json` manifest (DoD row 9)
- [x] Notebook seed: “The first shoots appeared in the hollow I kept wet.”
- [x] Tier-O **Pass**: *when it appeared, did it feel earned by the place you made — or like a spawn?* — owner: earned conditions mimic real life; **C-007 Locked**
- [x] **Next-but-one:** specify Slice 13 biology → physics integration before Slice 12 closes (DoD row 10) — §4.9

---

### 4.9 Slice 13 — Biology → physics integration *(Done — Tier-O Pass)*

**Why this exists.** Slice 12 ships a first occupant that does not yet change how water moves. The thesis payoff is that a vegetated hollow meets the next storm differently than a bare one — Slice 6 already couples aggregate `veg.cover` to roughness/infiltration; this slice closes the loop from **earned herb biomass** into those physical properties (E-005) without inventing a second hydrology.

**Loops.** Sim: `veg.biomass.herb` contributes to cover-equivalent roughness and infiltration so a colonized hollow retains more water / slows runoff versus an identical unsuitable patch. Game: keep a hollow wet until shoots appear, then run a storm and see the place answer differently.

**Register / candidates.** **E-005** (biology changes physical properties), **F-001** (feedback loops visible), **ES-006**, **T-001**, **T-005**, **T-006**, **N-001**, **C-007** (Locked — arrival gate already closed).

**Study.** SIMULATION_MODEL §11.1; composition in `docs/slices/13-composition.md`; Slice 6 `paired-storm` as comparison. ET partition stays on `veg.cover` alone this slice (storm path is the Tier-M criterion).

**Bans.** Painting cover directly from HSI. A second process that owns `veg.cover`. Changing hydrology equations rather than contributing through existing vegetation physical properties. Stochastic weather (C-003 Open).

**Gate.** After Slice 12 (**Done**): herb biomass and arrival probe exist.

- [x] Composition note: herb biomass → physical contribution equation; field ownership; no dual cover authority — `docs/slices/13-composition.md`
- [x] Wire `veg.biomass.herb` into roughness / infiltration via local `physicalCover` in the existing vegetation owner (ET deferred)
- [x] Tier-M: colonized suitable patch vs bare unsuitable twin under one storm — runoff / infiltration delta in the earned direction (`living-hollow.test.ts`)
- [x] Tier-M: determinism + bounds; mass residual unchanged class
- [x] Probe `living-hollow`: colonized downslope ≈ 0.152 vs bare ≈ 0.423; infil ≈ 25.83 vs 11.52; `coverHeld = 1`, `earned = 1`
- [x] Tier-P: soil-soak encoding delta after herb-driven infiltration clears perceptual floor `> 0.15`
- [x] `docs/slices/13.json` manifest (DoD row 9)
- [x] Notebook seed: “The hollow I kept wet held the next rain differently once shoots took.”
- [x] Tier-O **Pass** ([docs/playtests/batch-living-return.md](playtests/batch-living-return.md), owner 2026-07-30): *did the living hollow feel like it changed how the water moved — enough that you wanted another storm?*
- [x] **Next-but-one:** specify Slice 14 scenario objective scaffold to §4.3 depth before Slice 13 closes (DoD row 10) — §4.10

---

### 4.10 Slice 14 — Scenario objective scaffold *(Done — Tier-O Pass)*

**Why this exists.** Sandbox already runs the living-sand-castle loop (THESIS §4). **G-002** (Locked) says scenarios provide finite objectives under that same loop — not a second game. Without a scenario scaffold, G-005 / G-006 / G-007 stay unexercised and the toxic-site premise (C-010 / THESIS §7) has nowhere to land. This slice builds the **minimum objective container**, not a campaign or a win-condition resolution of Open **G-007**.

**Loops.** Sim: none new — scenarios are authored schedules + evaluation observers over existing WorldState (T-006). Game: accept a finite objective, run the same sculpt → forces → time loop, and see whether the preserve meets the authored criterion window.

**Register / candidates.** **G-002** (Locked — finite objectives), **G-001** (sandbox stays open — scenarios are additive), **G-005** / **G-006** / **G-007** (Open — coupling note; store all three completion shapes per SIM §12 without resolving), **G-008** (mixed-objective model), **C-010** (legacy substances — depends on scenario frame), T-006, N-001, N-004.

**Study.** SIMULATION_MODEL §12 scenario completion structure; MVP_SCOPE §5 (what MVP is not); THESIS §7 sandbox vs scenarios. Write `docs/slices/14-composition.md` before code: objective schema, evaluation cadence, how Open G-007 alternatives are stored without picking one.

**Bans.** Resolving Open G-007 by shipping only one completion shape. A cleanup tool that removes poison directly (C-010 / N-001). Scenario scripting that bypasses the sim (N-004). Closing sandbox or gating sculpting behind scenario progress (G-001, C-006). Inventing a second win meter unrelated to preserve state (N-002).

**Gate.** After Slice 13 (**Done** agent): biology→physics feedback exists so a scenario can ask the player to earn a living hollow that blunts a storm.

- [x] Composition note: objective schema; evaluation window; G-007 three-shape storage; no register invention — `docs/slices/14-composition.md`
- [x] Scenario container loads an authored objective + schedule over sandbox WorldState (observer evaluation only) — `ScenarioSession`
- [x] Tier-M: same seed + schedule → identical evaluation outcome hash; write isolation (evaluator does not mutate sim)
- [x] Tier-M: objective window uses hysteresis / rolling interval shape compatible with G-005 without locking its tuning
- [x] Probe `scenario-window`: paired meeting / failing preserve states under one authored criterion
- [x] `docs/slices/14.json` manifest (DoD row 9)
- [x] Notebook seed: “The brief asked me to keep the hollow wet long enough for life to hold the next storm.”
- [x] Tier-O **Pass** ([docs/playtests/batch-island-brief.md](playtests/batch-island-brief.md), owner 2026-07-30): *did the objective feel like a reason to run the same loop — or like a different game?*
- [x] **Next-but-one:** Slice **16** island / sea level specified at §4.10b (DoD row 10) — precedes Slice 15 so Tier-O fires on a readable world

---

### 4.10b Slice 16 — Sea level + island *(Done — Tier-O Pass)*

**Why this exists.** The map edge is still an artifact (SIM §10.1); perimeter pour points are a provisional workaround. An island makes the ocean the outlet, supplies C-012's mosaic as geometry, and gives C-004 a second global force dial. Slice 16 alone is the best available shot at THESIS §8's clip test. Full maritime depth is C-016…C-019 — this slice is only the base level.

**Loops.** Sim: terrain + global sea datum determine drainage; water leaves where land meets sea (`ledger.oceanExchange`). Game: shape an island, set how high the sea stands, run time, watch the shore answer.

**Register / candidates.** **C-015** Open (hypothesis); C-004, C-011, C-012; H-002, H-004, W-002, W-004; **W-001** Current — supersession is owner call. T-001, T-006.

**Study.** SIMULATION_MODEL §10 rewrite; EXTERNAL_REFERENCES narrowed coastal-SWE ban; generateMountain is already radial.

**Bans.** Waves, tides, salt, coastal erosion (C-016…C-018). SWE as authority. Negative elevations (keep sea above `elevationFloor`). Making `seaLevel` a config global that moves existing golden hashes — must be opt-in on WorldState.

**Gate.** After Slice 14 agent Tier-M. Before Slice 15 brief chrome.

- [x] Composition note `docs/slices/16-composition.md` (sea datum, ocean mask, ledger, Priority-Flood seed, no-targeting dial)
- [x] `seaLevel?: number` on WorldState; absent = legacy perimeter / closed behavior (baselines unchanged)
- [x] Ocean cells + `ledger.oceanExchange` in flux path; H-004 residual includes ocean term
- [x] Priority-Flood seeds from ocean cells when sea level set
- [x] `generateIsland` terrain generator; playable default uses island + sea level
- [x] Ocean plane / shoreline encoding; extent cage → horizon; sea-level select in controls (global, no cell args)
- [x] Tier-M: conservation + determinism; probe `island-drainage` (ocean exchange, shoreline length, habitat-zone proxy, step ms)
- [x] Tier-P: shoreline reads without inspector (proxy floor)
- [x] `docs/slices/16.json` manifest
- [x] Notebook seed: “I raised the sea and the hollow I dug became a cove.”
- [x] Tier-O **Pass** with Slice 15 ([docs/playtests/batch-island-brief.md](playtests/batch-island-brief.md), owner 2026-07-30)
- [x] **Next-but-one:** Slice 15 brief chrome (§4.11) and Slice 17 tidal envelope (§4.12) specified to §4.3 depth

---

### 4.11 Slice 15 — Scenario brief chrome *(Done — Tier-O Pass)*

**Why this exists.** Slice 14’s evaluator and `scenario-window` probe prove the objective container machine-side. Tier-O cannot answer “same loop or different game?” until the player can **accept a brief** and see window satisfaction without an inspector — preferably on the island world from Slice 16. This is presentation + load chrome over the existing observer — not a campaign and not G-007 resolution.

**Loops.** Sim: none new (loads Slice 14 `ScenarioDefinition` + calls `ScenarioSession.observe`). Game: see the authored brief, run time, notice whether the hollow is holding the criterion — still the sculpt → forces → time loop.

**Register / candidates.** **G-002**, G-001, G-005 (window legible), G-007 (Open — still store-only; no end-of-scenario victory screen that picks an alternative), T-006, U-003, D-006, N-002.

**Study.** Slice 14 composition; PredictionSession chrome pattern; rain-regime / sea-level controls as prior force dials.

**Bans.** Victory screen that resolves G-007. Health meter / second score (N-002). Scripted cutscenes that bypass sim (N-004). Closing sandbox (G-001).

**Gate.** After Slice 16 agent Tier-M green (`island-drainage` probe) so the brief sits on a readable island.

- [x] Load `livingHollowObjective` (or equivalent) as an optional scenario over sandbox
- [x] Brief visible without inspector; satisfied / not-yet encoding from `CompletionState` (no G-007 pick)
- [x] Tier-P proxy: brief + satisfaction affordance present when scenario active
- [x] Wire `observe` on event step when scenario loaded (write isolation retained)
- [x] `docs/slices/15.json` manifest; notebook seed from Slice 14 brief
- [x] Tier-O **Pass** ([docs/playtests/batch-island-brief.md](playtests/batch-island-brief.md), owner 2026-07-30)
- [x] **Next-but-one:** Slice 17 tidal envelope (§4.12) — Slice **F** may run first (force panel / climate mean) without blocking 17

---

### 4.11b Slice F — Force panel + climate-mean rain + orographic wind *(Done — agent)*

**Why this exists.** Island Pass left the rain dial as a working but unnatural storm-like control. Owner direction: rainfall is a **climate mean** the preserve lives under (what vegetation experiences), not an on/off storm switch; wind × relief decides *where* that mean lands. The Force panel is the post-sculpt verb surface (C-004) — a control strip, not a dashboard. Proof is watching the landscape wetten and diverge, not reading meters.

**Loops.** Sim: global climate-mean precip intensity every event; wind × terrain slope modulates placement via `P = P₀(1 + γ·u·∇z)` with land-mean normalization (H-004). Game: shape a blanker island, set rainfall mean / sea / wind, run time, **watch the place** answer (soil darkening / water) — no inspector required.

**Register / candidates.** **C-004**, **C-011**, **C-015**, **C-020** (lite — do not Lock), H-004, T-001, T-006, C-006 (sculpt canvas).

**Study.** [ISLAND_FORCES.md](ISLAND_FORCES.md); [FORCE_PANEL.md](FORCE_PANEL.md); NATURAL_PROCESS_MATH §4 orographic; EXTERNAL_REFERENCES study row.

**Bans.** Cloud painter / cell-targeted rain. Charts, precip HUD meters, orographic inspector layer. Stochastic free weather while C-003 Open. Resolving full C-020. Blocking Slice 17. SWE. Inventing Locked policy.

**Gate.** After 14 / 16 / 15 Tier-O Pass. Inserts before 17 in the queue tip; 17 remains next-but-one maritime physics.

- [x] `docs/ISLAND_FORCES.md` + `docs/FORCE_PANEL.md` (feel contract: look at the world)
- [x] Climate-mean rainfall dial (wetFraction=1; intensity = mean; labels arid→wet)
- [x] Broader / lower `generateIsland` sculpting canvas (no deep authored basins)
- [x] Wind dial + orographic modulate + `addRainField`; Force panel chrome (controls only)
- [x] Tier-M: probe `orographic-wind` — opposite winds diverge; precip tracks mean; residual closes
- [x] Tier-P: wet/dry side soil-darkening encoding without inspector (`presentation.proxy.test.ts`)
- [x] `docs/slices/F.json` manifest
- [x] Notebook seed: “I set a wetter climate and the windward slope stayed green.”
- [x] No Tier-O required this slice (panel + modulation exist); C-004 / C-020 naturalness may batch later
- [x] **Next-but-one:** Slice 17 tidal envelope (§4.12)

---

### 4.12 Slice 17 — Tidal envelope / intertidal *(Done — agent)*

**Why this exists.** C-016: tides as mean high / mean low water envelope, not instantaneous phase. Intertidal zone is the band between them — a real habitat the island form earns.

**Loops.** Sim: MHW / MLW globals derive an intertidal mask; no per-event tidal phase. Game: widen the tide range and see the shore zone grow.

**Register / candidates.** **C-016** Open; C-015; C-004; S-009; T-001.

**Bans.** Semidiurnal phase advanced every event step. A second hydrology.

**Gate.** After Slice 16.

- [x] Composition note; MHW/MLW options; intertidal derived field or mask
- [x] Tier-M: envelope widening → more intertidal cells; determinism
- [x] Probe `tidal-envelope`; `docs/slices/17.json`
- [x] Tier-O batched (metaphor conflict is owner) — dossier `docs/candidates/C-016-dossier.md`
- [x] **Next-but-one:** Slice 18 wave exposure (§4.13)

---

### 4.13 Slice 18 — Wave exposure + coastal erosion *(Done — agent)*

**Why this exists.** C-017: fetch × wind → exposure; contribute shoreline change through geomorphology owner only. Honors the island's implied promise without SWE.

**Loops.** Sim: derived exposure field contributes Δelev/Δdepth into geomorphology. Game: windward shore retreats differently than leeward under one wind regime.

**Register / candidates.** **C-017** Open; C-015; GEO-002; T-006; `climate.windVector` (SIM §3.8).

**Bans.** Shallow-water equations as authority (EXTERNAL_REFERENCES). Second sediment writer.

**Gate.** After Slice 16 (tides optional).

- [x] Composition note; exposure from fetch × wind; geomorphology contribution path
- [x] Tier-M: sheltered vs exposed paired divergence; soil mass closes
- [x] Probe `shore-exposure`; `docs/slices/18.json`
- [x] Tier-O batched (shore-legibility owner) — dossier `docs/candidates/C-017-dossier.md`
- [x] **Next-but-one:** Slice 19 beaches / longshore (§4.14 stub) — salinity (20) remains available after

---

### 4.14 Slice 19 — Beaches / longshore deposition *(after Slice 18)*

**Why this exists.** Exposure alone retreats the windward shore; longshore transport is what builds the lee beach and closes the coastal sediment story under **C-017**.

**Loops.** Sim: alongshore flux tendency from wind × shore tangent deposits downdrift via geomorphology inbox. Game: one wind regime scours one flank and feeds the other.

**Register / candidates.** **C-017** Open; GEO-002; T-006.

**Bans.** SWE authority. Second sediment writer. Cell-painted beaches.

**Gate.** After Slice 18.

- [x] Composition note; longshore tendency → geomorphology deposit path
- [x] Tier-M: windward loss ↔ leeward gain couples under one wind; mass closes
- [x] Probe `longshore-drift`; `docs/slices/19.json`
- [x] **Next-but-one:** Slice 20 salinity (§4.15 stub)

---

### 4.15 Slice 20 — Salinity *(Done — agent; C-018 owner half outstanding)*

**Why this exists.** Salt is the everyday **C-010** legacy load on an island — the first mobile soil-column substance that gates habitat near the shore and gives S-008 something to taste (**C-018**).

**Loops.** Sim: ocean-sourced `soil.salinity` dilutes with freshwater; HSI / arrival read it. Game: a freshened hollow earns differently than a salty twin under one seed schedule.

**Register / candidates.** **C-018** Open; C-010; C-007; H-004; T-003; N-001.

**Bans.** Player cleanup tool. Separate salt mass-balance ledger fighting H-004. Scoring biota (N-002).

**Gate.** After Slice 19 (may follow C-009 material table if that lands first; may proceed with a single salt field while C-009 stays Open).

- [x] Composition note; salinity field + ocean source / freshwater dilution
- [x] Tier-M: paired freshened-vs-salty hollow divergent arrival; save-legacy round-trip
- [x] Probe `salinity-arrival`; `docs/slices/20.json`
- [x] C-018 dossier (owner S-008 **Pass** — [batch-salt-overseas.md](playtests/batch-salt-overseas.md) Q-A; Lock still owner)
- [x] **Next-but-one:** Slice 21 island biogeography (§4.16)

---

### 4.16 Slice 21 — Island biogeography *(Done — agent; C-019 owner half outstanding)*

**Why this exists.** Slice 12's mainland-perimeter seed rain is wrong on an island — seeds arrive over water, sparsely, and richness should track area and isolation (**C-019**). Closes the maritime arrival story after salt gates who can establish (**C-018**).

**Loops.** Sim: overseas seed pressure replaces perimeter rain on island worlds; eligible richness monotonic in area ↑ / isolation ↓. Game: a smaller island earns fewer occupants under identical regimes; suitable cells can stay empty for long stretches.

**Register / candidates.** **C-019** Open; C-007 Locked; C-015; W-003; T-001; N-004.

**Study source.** EXTERNAL_REFERENCES MacArthur–Wilson + new-island succession; `docs/evidence/island-colonization.md` §4.

**Bans.** Species simulator / speciation. Stochastic free weather arrivals while **C-003** Open. Mainland perimeter rain as island default. Instant equilibrium community paint. Mangrove-as-only first life.

**Gate.** After Slice 20 (preferably after C-018 machine half — discharged).

- [x] Composition note; over-water dispersal kernel + area/isolation eligibility
- [x] Tier-M: paired small/large island under identical regimes; hash-stable (T-001); island worlds must not use perimeter mainland rain as sole source
- [x] Probe `island-arrival`; `docs/slices/21.json`
- [x] C-019 dossier (owner sparse-earned **Pass** — [batch-salt-overseas.md](playtests/batch-salt-overseas.md) Q-B; Lock still owner)
- [x] **Next-but-one:** AUD-003 recovery ambient / Field Notebook UI / scenario campaign — pick when gate opens (see Later stubs)

---

### Later stubs

| Slice | Focus | Register |
|---|---|---|
| A+ / AUD-003 | Recovery audible — second ambient bed once life/recovery has a visible field | AUD-003, C-014 |
| — | Field Notebook UI | U-006 |
| — | Scenario campaign / toxic-site premise | G-002, C-010 |

Slices **14** / **16** / **15** Tier-O **Pass** (§4.10–4.11). **Slice F** / **17** / **18** / **19** / **20** / **21** Done. C-018 / C-019 Tier-O **Pass** ([batch-salt-overseas.md](playtests/batch-salt-overseas.md)). Next: later stubs (AUD-003 / Field Notebook / scenario campaign). Do not expand remaining stubs until their gate opens. Presentation (§4.2) may run in parallel — it does not add competing sim systems.

---

## 5. PR / commit hygiene

- Cite register IDs (or C-00x candidates) in new sim modules and tests.  
- Update `GOLDEN_*` / probe baselines only when physics change is intentional; note why + Tier-M artifact in the commit body. A baseline diff with no stated reason is a blocking review comment, not a nit — it is the one place drift enters silently.  
- A candidate promoted under §4.0 step 8 lands in the same commit as its evidence: register status, register §16 queue entry struck, version-history line, `npm run conformance` re-run.  
- A blocked note (§4.0.1) is committed like any other artifact, with the next queue item named in the same body.  
- Run `npm run conformance` before claiming a slice done.  
- Prefer small PRs: sim edge vs game edge can split if WorldState coupling allows.  
- If a commit acts on an EXTERNAL_REFERENCES steal, refresh the Research↔Decision note in §3 Current gate or the slice checklist.

---

## 6. Document roles

| Document | Owns |
|---|---|
| [MVP_SCOPE.md](MVP_SCOPE.md) | Which loops are in MVP; joint map; fun gate |
| **This file** | How to execute each slice; autonomous protocol |
| [SIMULATION_MODEL.md](SIMULATION_MODEL.md) | Fields, ownership, bands |
| [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md) | Promotion criteria + ledger |
| [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md) | Who verifies each claim; ask gate |
| [EXTERNAL_REFERENCES.md](EXTERNAL_REFERENCES.md) | Study-not-ship refs; multi-state water survey |
| [NATURAL_PROCESS_MATH.md](NATURAL_PROCESS_MATH.md) | Math candidates; Tier sequence |
| [PLAYTEST_SLICE4.md](PLAYTEST_SLICE4.md) | Fun-gate protocol (historical MVP) |
| PLAYER_INTERACTION_SPEC.md | Detailed prediction/siting UX (not yet written) |
