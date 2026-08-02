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

Two automations share the merge trigger but claim **disjoint** tip items. Rebase onto latest `main` before editing. When touching the shared tip paragraph in BUILD_GUIDE, change **only this track’s clause**.

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

**Never in either track until owner Unblocks / Locks:** L5 (**C-023**), L8 (**C-024** / **C-025**), C-026 palette redesign, nutrients, animals, SWE, wet-sand, freeze, figurines.

---

## 4. Cursor Automation setup (owner paste)

Create **two** Automations in the Cursor dashboard (Cloud Agents → Automations). Start **disabled**; enable each track after its first manual seed PR has merged once (or enable after this pipeline doc lands and you merge the seed agents below).

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

---

## 5. Manual seed (first succession)

Before enabling Automations:

1. Land this doc on `main`.
2. Launch **T1** (§4.57) and **R1** (§4.47) as separate cloud agents (disjoint branches).
3. Merge each when CI green (rebase the second if tip-paragraph conflicts).
4. Enable the matching Automation so the *next* merge starts T2 / R2.

Owner still owns: merge clicks, Lock sittings (C-014 / C-021 / C-022 / …), Tier-O batches.

---

## 6. Collision policy

| Risk | Mitigation |
|---|---|
| Both tracks edit BUILD_GUIDE tip | Each agent edits only its track’s tip clause; rebase before push |
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
