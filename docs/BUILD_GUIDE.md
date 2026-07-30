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
| 8c | Observers + rain regime + form memory | Return visit then→now | `rainRegime`, `regime-divergence` | Agent Done / Tier-O ready |
| 9 | Liebig HSI / limiting factor | Inspect what holds a patch back | `hsiComposition`, `limiting-shift` | Tier-M; Tier-O deferred |
| 10 | Fire / fuel (Olson + BFS) | Authored ignition; wet resists | `fireProcess`, `burn-recover` | Tier-M; Tier-O deferred |
| A | Audio scaffold (observer) | Water ambient + silence-as-signal | `AudioBus`, C-014 dossier | Agent Done; C-014 Open |

**Current gate:** Slice **10** fire/fuel **Done** (agent) → **Slice 11** light/succession next (§4.6 specified). **Slice A** audio scaffold **Done** (machine half; C-014 owner half outstanding). Slice 8c Tier-O still batched (C-004 / C-013 dossiers join it).

**The ladder, read as force dials.** [THESIS.md](THESIS.md) §4 reframes what the remaining slices are *for*: each one adds a force the player can turn, and the value is combinatorial rather than additive. 8b adds *does it stay wet between storms*; 8c adds *how hard it rains* and makes consequence visible; 9 adds *what can live here* as the arrival gate; 10 adds *fire*; 11 adds *light and succession*. Missing dials, unfiled: wind, season, climate regime. Closing a sim edge is the mechanism; adding a dial is the reason.

**Research ↔ decisions.** Steals from EXTERNAL_REFERENCES map to Locked/Current IDs or candidates C-001…C-003. Do not implement Open candidates as if Locked.

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
- [ ] **Tier-O — this is the batched session** ([docs/playtests/8c-return-visit.md](playtests/8c-return-visit.md)): *did you want to run it again with different weather?* — retuned after owner flood report; re-run pending; C-004 dossier filed for the stewardship reading 

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
- [x] Tier-M: post-fire recovery trajectory differs by pre-fire moisture (probe `burn-recover` — wet recover ≈ 0.85 vs dry ≈ 0.07; accountingError ≈ 6e-6; determinismMatch = 1)
- [x] `docs/slices/10.json` manifest (DoD row 9)
- [x] Notebook seed: “The burn ran to the wet ground and stopped.”
- [x] Tier-O candidate (batch): *did the burn read as something you did, or as something that happened to you?* (A-005 / N-001) — deferred
- [x] **Next-but-one:** Slice 11 specified to §4.3 depth (§4.6) before this slice closes (DoD row 10)

---

### 4.6 Slice 11 — Light / succession *(specified; gate after Slice 10)*

**Why this exists.** [THESIS.md](THESIS.md) §2.1 / §5: the castle comes alive when life takes the form you built — and different aspects, burns, and moisture histories must produce different futures from the *same* rules, never from authored stages. Slice 9 already named water/depth/GW as limiting; Slice 10 clears cover. This slice adds the light dial so succession is a consequence of insolation × canopy, not a timer.

**Loops.** Sim: insolation / canopy light (Beer–Lambert) → light competition / succession trajectory without authored stages (ES-001). Game: north vs south / burned vs unburned / wet vs dry read as different futures from the same rules — not painted stages.

**Thesis role.** Force dial on the ladder (BUILD_GUIDE §3): after fire, *light and succession*. Under **C-007**, trajectories remain conditions for arrival, not introduction scripts — stage labels may describe state but cannot drive it (ES-001).

**Register / candidates.** **ES-001** (Locked — succession emergent; stage labels describe, do not drive). **ART-001** (Current — scientific impressionism; NATURAL_PROCESS_MATH §1.9 ties insolation readability here). Touchpoints: **ES-006** (capacity emerges — light may join Liebig inputs once registered, never a fixed `K`); **E-009** (readiness inferred — light must stay an inspectable field, not an unlock); **C-007** (Open — arrival verb; do not implement introduction machinery here). Field registration cites **T-005**.

**Study.** NATURAL_PROCESS_MATH §3.2 (Tilman R* + Beer–Lambert light competition) and §1.9 (insolation from slope/aspect + horizon shading); seasonal band on the timescale ladder (§7 — light competition ~10 days). Composition choice written before code as `docs/slices/11-composition.md` (same pattern as Slice 9's `9-composition.md`).

**Bans.** Authored succession stages as authority (ES-001 rejected alternatives). Light as a free-floating "health" scalar (N-002; NATURAL_PROCESS_MATH §6). A second vegetation engine parallel to existing `vegetationProcess` — extend cover/light coupling in-process, do not fork a rival owner of `veg.cover` (T-006 / GEO-002 earn-its-cost).

**Gate.** After Slice 10 (fire/fuel **Done**). Burn→cover restart is available for burned-vs-unburned trajectory contrast.

- [ ] Register insolation / LAI / understory light fields (or derive from elev + `veg.cover`) with owner + band (T-005)
- [ ] Beer–Lambert (or reduced form) cited before code — composition note `docs/slices/11-composition.md` (NATURAL_PROCESS_MATH §3.2, §1.9)
- [ ] Couple to existing `veg.cover` via `vegetationProcess` (extend, do not replace); burned cells restart succession differently once Slice 10 clears cover
- [ ] Tier-M: monotonicity / bounds — more canopy → less understory light; fields stay in range, no NaN
- [ ] Tier-M: paired divergence — north–south and/or burned–unburned trajectories diverge under identical forcing (same seed, same rules)
- [ ] Probe `succession-diverge`: paired aspect or burn contrast with baseline tolerances
- [ ] `docs/slices/11.json` manifest (DoD row 9) — create at implementation (conformance rejects planned-only probes/fields)
- [ ] Notebook seed: e.g. “The south slope stayed open; the north filled in.”
- [ ] Tier-O candidate (batch, do not ask alone): *do the slopes feel like different futures, or like the same place with different tint?*

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

### Later stubs

| Slice | Focus | Register |
|---|---|---|
| A+ / AUD-003 | Recovery audible — second ambient bed once life/recovery has a visible field | AUD-003, C-014 |
| 12 | Roles / introductions → informs RC-003 | E-*, ES-006 |
| 13 | Biology → physics integration test | E-005, F-001 |
| — | Field Notebook UI | U-006 |
| — | Scenarios | G-002, G-007 |

Slice **11** moved to §4.6 (specified). Slice **A** expanded to §4.7 (machine half Done). Do not expand remaining stubs until their gate opens. Presentation (§4.2) may run in parallel — it does not add competing sim systems.

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
