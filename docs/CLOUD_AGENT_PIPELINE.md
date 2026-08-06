# Habitat — Gated multi-agent cloud pipeline

> **Status:** Active  
> **Role:** How cloud agents work **one BUILD_GUIDE slice at a time**, with merge as the succession gate.  
> **Authority:** Subordinate to [BUILD_GUIDE.md](BUILD_GUIDE.md) §4.0 / §4.0.1, [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md), [AGENTS.md](../AGENTS.md).  
> **Product surface:** Cursor Automations (merge / CI triggers) + Cloud Agents API. There is no native “agent finished” trigger — **merge into `main` is the handoff.**

---

## 1. Model

```
Agent N  →  one slice PR  →  CI: npm run gate  →  human merge (branch protection)
                ↓
         Pull request merged (automation)
                ↓
Agent N+1 reads BUILD_GUIDE "Next (executable tip)"  →  claim track item  →  repeat
```

**Durable queue state lives in the repo**, not in agent memory:

| Artifact | Role |
|---|---|
| `docs/BUILD_GUIDE.md` — **Next (executable tip)** / **Current gate** | What is executable now |
| `docs/slices/<slice>.json` + `*-composition.md` | Slice contract + evidence |
| `docs/blocked/<date>-<slice>.md` | Parked work; names next item |
| `README.md` / `docs/MVP_SCOPE.md` | Status mirror when tip moves |

Every closing commit must leave tip + next-but-one accurate (DoD row 10; `.cursor/rules/update-build-plan-on-commit.mdc`).

---

## 2. Gates (succession ladder)

| # | Gate | Who | Pass |
|---|---|---|---|
| 1 | **Slice scope** | Prompt | Exactly one open §4.x checklist item on *this* track |
| 2 | **Tier-M / Tier-P** | Agent | Tests, probes, proxies; baselines only with stated reason |
| 3 | **Session green bar** | Agent + CI | `npm run gate` |
| 4 | **Definition of done** | Agent | BUILD_GUIDE §2 rows 1–10 |
| 5 | **Merge** | Owner (or protected-branch rules) | PR merges to `main` → next automation may fire |
| 6 | **Owner / Lock** | Owner | Tier-O batch, Lock sittings — agents write dossiers / blocked notes and take the next *unblocked* tip item |

Valid non-idle exits that still allow the chain to continue after merge:

- Slice Done (tip advanced)
- `/blocked-note` naming next queue item
- Owner-judged candidate dossier; slice parked
- “Tip already Done or blocked for this track — no code” (short PR or comment only if tip docs need a fix)

---

## 3. Parallel tracks

Four automations share the merge trigger but claim **disjoint** tip items. Rebase onto latest `main` before editing. When touching the shared tip paragraph in BUILD_GUIDE, change **only this track’s clause**.

### Track T — Terrain tools (C-028 structural) — **parked**

| Order | Slice | Notes |
|---|---|---|
| T1 | **§4.57** geometric mold stamps | **Done** |
| T2 | **§4.59** duplicator stamp | **Done** — C-028 structural "keep" kit is now fully shipped |
| Tn | None — no further machine slice | Remaining C-028 work is owner taste (do molds/duplicator feel like shaping sand?; flags/banners chrome slot) — owner Lock backlog, not agent-executable. Do **not** invent a new Track T slice; if re-enabled later it will be named in BUILD_GUIDE's tip paragraph. |

### Track R — Review correctness (vegetation/habitat)

| Order | Slice | Notes |
|---|---|---|
| R1 | **§4.47** guild cover & light-competition | **Done** |
| R2 | **§4.48** habitat/dispersal determinism hygiene | Tip today — sole executable queue (Track T parked) |
| Rn | Next unblocked review-queue item | Skip owner-blocked Living remainder |

### Track V — Plant rendering (presentation)

| Order | Slice | Notes |
|---|---|---|
| V1 | **§4.60** per-guild silhouette geometry | **Done** |
| V2 | **§4.61** per-cell clustering | **Done** |
| V3 | **§4.62** composite runner-up guild | **Done** |
| Vn | **§4.63** distance silhouette LOD | Deferred — first post-§4.62 dual-fill timing 32.23ms at `config.gridSize`; not agent-executable until a real-landscape profile shows a real cost |

### Track A — Animal life (C-027 population fields) — **opened 2026-08-05**

**F-001** (advanced ecosystem-engineer behaviors) undeferred by owner decision ([DECISION_REGISTER §15](DECISION_REGISTER.md)); **C-027** promoted Open → **Locked** the same session ([DECISION_REGISTER §16.5](DECISION_REGISTER.md), [C-027-framing.md](candidates/C-027-framing.md)). Scope stays split: mesopredator/apex-predator roles (food-web coupling — specifiability gap named in C-027-framing.md §4.6.1) and ecosystem-engineer roles (write-back role-selection gap, §5) remain off this track. Do not implement either here.

| Order | Slice | Notes |
|---|---|---|
| A1 | **§4.66** Herbivore population/trait fields | **Machine half shipped 2026-08-05** — registered the first `populations` Process. **D-007 clip verdict outstanding**: [docs/playtests/A1-herbivore.md](playtests/A1-herbivore.md); record it before claiming any *other* new-Process slice on any track. Carries a grazing write-back into `veg.biomass.herb` (C-027-framing.md §4.6.3) — a herbivore that never eats is decorative wildlife (**N-005**). Render is a documented placeholder (no Foxel dependency; only `limbLength` has an accepted animal-design card) |
| A2 | **§4.67** Seed disperser fields | Tip today — extends A1's Process, no new clip gate (explicitly not blocked by A1's outstanding D-007 verdict, C-027-framing.md); first fauna dispersal-reach concept, a dependency of **C-029** |
| An | **§4.68** Adaptive radiation stub | Not agent-executable — gated on owner Lock of **C-029** ([framing](candidates/C-029-framing.md)), which itself needs A1+A2 shipped first |
| — | Pollinators, then owner choice among remaining non-competitive roles | Never mesopredator / apex-predator / ecosystem-engineer under this track |

**Foxel silhouette/variant design is not a fifth track.** It is a cheap, parallel, advisory lane (not merge-gated, no CI obligation) that feeds Track A's render-side checklist items — see §3.5 below.

**Never in any track until owner Unblocks / Locks:** L8 (**C-024** / **C-025**), C-026 palette redesign, nutrients, SWE, wet-sand, freeze, figurines, animal competition/predation (mesopredator/apex-predator roles), ecosystem-engineer write-back, adaptive radiation ahead of a C-029 Lock.

### 3.5 Animal-design lane (Foxel, low-cost, parallel — not a track)

Where Foxel silhouette/variant-ladder design work happens, per owner direction to hand this off to a low-cost agent routine. Full protocol: [docs/animal-design/PROTOCOL.md](../animal-design/PROTOCOL.md) — modeled directly on the existing [nature-study protocol](nature-study/PROTOCOL.md)'s proven shape (3–5 parallel low-token Task agents per wave, a pasted ban-block, one small structured "morph card" per agent, a parent that merges without re-synthesizing). Cards are design artifacts, not shipped assets: an accepted card names rungs and a real-world referent; a separate, higher-cost step authors the actual `.fxl` file and runs `fxl2gltf.py`. A Track A slice (A1, A2, …) consumes accepted cards as an input — see each slice's render-side checklist — it does not itself run this lane.

---

## 4. Cursor Automation setup (owner paste)

Create **four** Automations in the Cursor dashboard (Cloud Agents → Automations). Start **disabled**; enable each track after its first manual seed PR has merged once (or enable after this pipeline doc lands and you merge the seed agents below).

### Shared settings

- **Repository / environment:** Habitat (this repo’s cloud environment)
- **Triggers (recommended):**
  1. **Pull request merged** → into `main`
  2. Optional: **Workflow run completed** — only proceed if the conclusion is success *and* the merged tip still lists this track’s next slice (avoid double-fire; prefer merge-only if unsure)
- **autoCreatePR:** on
- **Branch prefix:** follow cloud agent defaults; Habitat cloud runs use `cursor/<name>-…`
- **Memories:** optional; never treat memories as tip authority over BUILD_GUIDE

CI already runs `npm run gate`. Automations do **not** replace CI.

### Prompt — Track T (terrain tools) — currently parked

Track T has **no open machine slice** as of §4.59 (duplicator stamp, Done) — the C-028 structural "keep" kit is fully shipped. Leave this Automation **disabled** until BUILD_GUIDE's tip paragraph names a new Track T item (e.g. an owner Lock unblocks C-028 taste into a new structural verb). If enabled and fired with nothing to claim, the agent must write a one-line "Track T has no open slice" status and stop — never invent work by reaching into Track R or the blocked Living remainder.

Copy into the automation prompt body (once re-enabled with a real tip item):

```
You are a Habitat cloud succession agent on Track T (terrain tools).

Cold start:
1. Read AGENTS.md, docs/BUILD_GUIDE.md §4.0 + §4.0.1, docs/CLOUD_AGENT_PIPELINE.md, docs/VERIFICATION_POLICY.md.
2. Read "Next (executable tip)" and the Track T table in CLOUD_AGENT_PIPELINE.md.
3. git pull / rebase onto latest main. Claim exactly ONE open Track T slice. If the Track T table shows no open slice (parked, owner taste, or otherwise), or the named tip item is already Done or blocked, write a one-line status and STOP — do not invent work.

Rules:
- One slice per run. Do not start the next slice in the same run.
- Follow BUILD_GUIDE checklist for that §4.x entry. New Process? If yes, D-007 clip gate first.
- Green bar before done: npm run gate (skill /run-gate).
- Update docs/BUILD_GUIDE.md, docs/MVP_SCOPE.md, README.md Current slice, slice manifest + composition in the same commit set (update-build-plan-on-commit).
- Unexplained GOLDEN_* or probe baseline moves are defects.
- On block: /blocked-note, name next queue item, stop.
- Never implement L5/L8/nutrients/animals/SWE/wet-sand/freeze. Never invent Locked policy from Open candidates.
- Open a draft PR. Summarize gate results in the PR body. Do not ask the owner to confirm numbers.

Handoff: leave "Next (executable tip)" accurate so the next merge-triggered agent can claim Track T’s following item.
```

### Prompt — Track R (review correctness)

```
You are a Habitat cloud succession agent on Track R (review correctness — vegetation/habitat).

Cold start:
1. Read AGENTS.md, docs/BUILD_GUIDE.md §4.0 + §4.0.1, docs/CLOUD_AGENT_PIPELINE.md, docs/VERIFICATION_POLICY.md.
2. Read "Next (executable tip)" and the Track R table in CLOUD_AGENT_PIPELINE.md.
3. git pull / rebase onto latest main. Claim exactly ONE open Track R slice (today: §4.48; §4.47 Done). If that tip item is already Done, blocked, or not tip, write a one-line status and STOP — do not invent work.

Rules:
- One slice per run. Do not start the next slice in the same run.
- §4.47 does NOT implement C-023 — only cover combination + absorbed-light / LAI correctness per the checklist.
- Follow BUILD_GUIDE checklist. Green bar: npm run gate.
- Baseline moves require a stated reason in the commit body.
- Update BUILD_GUIDE / MVP_SCOPE / README / slice manifest + composition (build-plan-on-commit). When editing the shared tip paragraph, change only the Track R clause.
- On block: /blocked-note, name next queue item, stop.
- Never implement L5/L8/nutrients/animals/SWE. Never invent Locked policy from Open candidates.
- Open a draft PR. Summarize gate results. Do not ask the owner to confirm numbers.

Handoff: leave "Next (executable tip)" accurate for the next Track R agent.
```

### Prompt — Track V (plant rendering)

```
You are a Habitat cloud succession agent on Track V (plant rendering — presentation).

Cold start:
1. Read AGENTS.md, docs/BUILD_GUIDE.md §4.0 + §4.0.1, docs/CLOUD_AGENT_PIPELINE.md, docs/VERIFICATION_POLICY.md, docs/reviews/2026-08-03-plant-rendering-review.md.
2. Read "Next (executable tip)" and the Track V table in CLOUD_AGENT_PIPELINE.md.
3. git pull / rebase onto latest main. Claim exactly ONE open Track V slice. **§4.60–§4.62 are Done**; **§4.63 is deferred** — do not claim it before a real-landscape profile shows a real cost (worst-case dual-fill smoke is 32.23ms, not a license to start). If the named tip item is already Done or not yet unblocked, write a one-line status and STOP — do not invent work.

Rules:
- One slice per run. Do not start the next slice in the same run.
- Presentation-only: read src/render/OccupantMesh.ts, src/ui/occupantEncoding.ts, src/ui/occupantSway.ts before touching geometry. No new WorldState field, no new Process, no new sim read beyond what the review names for that slice.
- No vendored/imported plant assets — procedural THREE.BufferGeometry only (T-007). No per-frame stochastic jitter — any offset/selection must be a stable hash of cell index, matching the existing yaw salt (x*17+z*31) in OccupantMesh.ts.
- Do not touch occupantEncoding.ts's six hues or occupantSway.ts's sway math unless the slice's own checklist says so — this track is shape, not color or motion.
- Follow BUILD_GUIDE checklist for that §4.6x entry exactly. Green bar: npm run gate.
- Update BUILD_GUIDE / MVP_SCOPE / README / slice manifest + composition (build-plan-on-commit). When editing the shared tip paragraph, change only the Track V clause.
- On block: /blocked-note, name next queue item, stop.
- Never implement L5/L8/nutrients/animals/SWE/wet-sand/freeze, and never implement §4.63 before §4.60–§4.62 are shipped and profiled.
- Open a draft PR. Summarize gate results. Do not ask the owner to confirm numbers.

Handoff: leave "Next (executable tip)" accurate for the next Track V agent.
```

### Prompt — Track A (animal life)

```
You are a Habitat cloud succession agent on Track A (animal life — C-027 population fields).

Cold start:
1. Read AGENTS.md, docs/BUILD_GUIDE.md §4.0 + §4.0.1, docs/CLOUD_AGENT_PIPELINE.md, docs/VERIFICATION_POLICY.md, docs/candidates/C-027-framing.md (Locked).
2. Read "Next (executable tip)" and the Track A table in CLOUD_AGENT_PIPELINE.md.
3. git pull / rebase onto latest main. Claim exactly ONE open Track A slice (today: §4.67 Seed disperser — §4.66 Herbivore's machine half shipped 2026-08-05, D-007 clip verdict outstanding). If that tip item is already Done, blocked, or not tip, write a one-line status and STOP — do not invent work.

Rules:
- One slice per run. Do not start the next slice in the same run.
- §4.66 registers the first `populations` Process — D-007 clip gate applies: record the clip verdict in the BUILD_GUIDE entry before this or any later slice on any track claims to register another new Process.
- Every trait/pressure mapping needs a real-world referent (C-011, N-004) — do not invent one; if none exists, ship the field without that trait rather than guessing. Base render assets come from an accepted card in docs/animal-design/cards/ (see docs/animal-design/PROTOCOL.md) — if no card exists yet for a trait, that trait's render half waits, the sim-field half does not.
- No individual entity/identity store (T-001, T-006) — field-simulated, individually-rendered only. No stochastic trait drift while C-003 is Open. No fixed carrying-capacity constant or hand-tuned traitRate (ES-006) — rate derives from `pop.<role>.stage[k]` turnover. Trait mismatch must enter the role's mortality/capacity term (no free adaptation) and clamp to a per-species envelope (decline, don't exceed it). Discrete swaps latch on two values, never a bare threshold. No player-authored creature bodies — species stays resolved through W-003's fixed pool.
- Foxel (`.fxl` → `fxl2gltf.py` → `.glb`) runs offline, at build time only, gitignored — never a runtime dependency (T-006/T-007). Continuous traits ride glTF skeleton bone-scale at runtime; discrete traits pick a rung from a pre-baked `.glb` ladder.
- Never implement mesopredator/apex-predator roles (C-027-framing.md §4.6.1 — unspecifiable until a second, prey-linked role exists), ecosystem-engineer write-back (§5 — role-selection undesigned), animal competition/predation dynamics, or adaptive radiation (**C-029** — Open, not Locked) under this track.
- Follow BUILD_GUIDE checklist for that §4.6x entry. Green bar before done: npm run gate (skill /run-gate).
- Update docs/BUILD_GUIDE.md, docs/MVP_SCOPE.md, README.md Current slice, slice manifest + composition in the same commit set (update-build-plan-on-commit). When editing the shared tip paragraph, change only the Track A clause.
- C-027 is Locked — build directly against it; no self-promotion dance. If a slice's own scope decision needs an owner call (e.g. §4.67's trait-referent search coming up empty), say so in the PR body rather than guessing.
- On block: /blocked-note, name next queue item, stop.
- Never invent Locked policy from Open candidates.
- Open a draft PR. Summarize gate results in the PR body. Do not ask the owner to confirm numbers.

Handoff: leave "Next (executable tip)" accurate so the next merge-triggered agent can claim Track A's following item (today: §4.68 adaptive radiation stub — not agent-executable until owner Locks C-029, so most likely a pollinator/other non-competitive-role slice instead once A2 ships).
```

---

## 5. Manual seed (first succession)

Before enabling Automations:

1. Land this doc on `main`.
2. Launch **T1** (§4.57), **R1** (§4.47), **V1** (§4.60), and **A1** (§4.66) as separate cloud agents (disjoint branches). (T1/R1/V1 already merged historically; **A1** is the new seed as of this doc.)
3. Merge each when CI green (rebase the others if tip-paragraph conflicts).
4. Enable the matching Automation so the *next* merge starts T2 / R2 / V2 / A2.

Owner still owns: merge clicks, Lock sittings (C-014 / C-021 / C-022 / …), Tier-O batches.

---

## 6. Collision policy

| Risk | Mitigation |
|---|---|
| Multiple tracks edit BUILD_GUIDE tip | Each agent edits only its track’s tip clause; rebase before push |
| Shared sim files (WorldState, etc.) | Serialize via merge; never force-push `main` |
| Double automation fire | Prefer single trigger (PR merged); prompt checks tip still names the slice |
| Agent tries whole ladder | Prompt hard-stops at one slice |

---

## 7. Document roles

| Document | Owns |
|---|---|
| **This file** | Succession model, track tables, automation prompts |
| [BUILD_GUIDE.md](BUILD_GUIDE.md) | Per-slice checklists; tip; §4.0 protocol |
| [AGENTS.md](../AGENTS.md) | Cold-start + tip summary for every agent |
| [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md) | Who verifies; ask gate |
