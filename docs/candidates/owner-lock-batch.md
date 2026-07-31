# Owner Lock batch — ready register acts

**Date:** 2026-07-30  
**Role:** Ballot for candidates whose machine half + owner taste half are already discharged. Not a playtest. Reply **Lock** or **Hold** per row (or **Lock all ready**).

Authority: [DECISION_CONFORMANCE.md](../DECISION_CONFORMANCE.md) §3.0 — Promotion authority Owner. Agent flips register status only after your word.

---

## A — Ready to Lock (taste Pass already recorded)

| Id | One-line claim | Taste evidence | Reply |
|---|---|---|---|
| **C-009** | Sand / clay / rock read as different materials to build with | Pass 2026-07-30 — [C-009-dossier](C-009-dossier.md) | ☐ Lock / ☐ Hold |
| **C-016** | Tide envelope reads as the sea claiming the shore, not a second clock | Pass — [batch-maritime-shore](../playtests/batch-maritime-shore.md) | ☐ Lock / ☐ Hold |
| **C-017** | Windward wear / lee growth reads as the sea’s work | Pass — same sitting as C-016 | ☐ Lock / ☐ Hold |
| **C-018** | Pale sparse shore reads as ground still tasting of the sea | Pass — [batch-salt-overseas](../playtests/batch-salt-overseas.md) Q-A | ☐ Lock / ☐ Hold |
| **C-019** | Shore-first shoots read as life having farther to come | Pass — same sitting Q-B | ☐ Lock / ☐ Hold |

**If Hold on any:** name which id and what felt wrong in one sentence (no numbers). Agent retunes that encoding path — does not invent new policy.

---

## B — Island reference (one register act, two linked entries)

| Id | Question | Reply |
|---|---|---|
| **C-015** + **W-001** | Should the island + sea datum supersede Windward Basin as the canonical preserve reference? | ☐ Supersede W-001 / Lock C-015 · ☐ Keep W-001 Current / leave C-015 Open |

Place reading already Pass ([batch-island-brief](../playtests/batch-island-brief.md)). This row is only the reference-preserve call.

---

## C — Still needs a sitting (not on this ballot)

| Id | Outstanding owner-only question | Sitting |
|---|---|---|
| **C-004** | After you set the rainfall regime and ran time, did what happened feel like something the world did — or like something you placed? | [batch-stewardship-alive](../playtests/batch-stewardship-alive.md) |
| **C-020** | When a spell built in the sky and fell, did it feel like weather the atmosphere made — including cold spells reading as snow? | same |
| **C-014** | When the water left, did the quiet feel like the place going still — or like the sound broke? | same |
| **U-006** | After something on the map changed, did opening the notebook feel like answering a question you already had — or like the game explaining itself first? | same (reviewer corpus sample) |

---

## Agent actions after your reply

1. **Lock** rows → flip Open→Locked (U-006 Current→Locked), strike §16 queue where listed, version-history line, `npm run conformance`, evidence in commit body.
2. **Supersede W-001** → W-001 Superseded; C-015 Locked; SIMULATION_MODEL / BUILD_GUIDE tip refresh.
3. **Hold** → dossier note + next encoding retune; Nature tip stays paused until you say otherwise.
