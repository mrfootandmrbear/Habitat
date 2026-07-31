# Owner Lock batch — ready register acts

**Date:** 2026-07-30  
**Role:** Ballot for candidates whose machine half + owner taste half are already discharged. Not a playtest. Reply **Lock** or **Hold** per row (or **Lock all ready**).

Authority: [DECISION_CONFORMANCE.md](../DECISION_CONFORMANCE.md) §3.0 — Promotion authority Owner. Agent flips register status only after your word.

---

## A — Ready to Lock (taste Pass already recorded)

| Id | One-line claim | Taste evidence | Reply |
|---|---|---|---|
| **C-009** | Sand / clay / rock read as different materials to build with | Pass 2026-07-30 — [C-009-dossier](C-009-dossier.md) | ☑ **Locked** 2026-07-30 |
| **C-016** | Tide envelope reads as the sea claiming the shore, not a second clock | Pass — [batch-maritime-shore](../playtests/batch-maritime-shore.md) | ☑ **Locked** 2026-07-30 |
| **C-017** | Windward wear / lee growth reads as the sea’s work | Pass — same sitting as C-016 | ☑ **Locked** 2026-07-30 |
| **C-018** | Pale sparse shore reads as ground still tasting of the sea | Pass — [batch-salt-overseas](../playtests/batch-salt-overseas.md) Q-A | ☑ **Locked** 2026-07-30 |
| **C-019** | Shore-first shoots read as life having farther to come | Pass — same sitting Q-B | ☑ **Locked** 2026-07-30 |

**Owner reply:** Lock all ready (2026-07-30). Register v2.0.9.

---

## B — Island reference (one register act, two linked entries)

| Id | Question | Reply |
|---|---|---|
| **C-015** + **W-001** | Should the island + sea datum supersede Windward Basin as the canonical preserve reference? | ☑ **Supersede W-001 / Lock C-015** 2026-07-30 |

Place reading already Pass ([batch-island-brief](../playtests/batch-island-brief.md)). Owner chose supersession; register v2.0.10.

---

## C — Stewardship sitting results

| Id | Outstanding owner-only question | Result |
|---|---|---|
| **C-004** | After you set the rainfall regime and ran time, did what happened feel like something the world did — or like something you placed? | ☑ **Pass → Locked** — alive / world-did-it; want-faster-than-16× = product feedback |
| **C-005** | Did you want to fork the world and run it again under different forces — or did Compare feel like a debug panel? | ☐ Open — machine Done ([C-005-dossier](C-005-dossier.md)); Lock pending |
| **C-013** | After you ran time and the undo button went away, did that feel fair — or like the game punished you for looking? | ☐ Open — machine Done ([C-013-dossier](C-013-dossier.md)); Lock pending |
| **C-020** | When a spell built in the sky and fell, did it feel like weather the atmosphere made — including cold spells reading as snow? | ☐ **Hold Lock** — weather-feel Pass-with-glitches; **G1–G5 named** 2026-07-31 ([C-020-dossier](C-020-dossier.md)); leave Open until fixed + re-Pass |
| **C-014** | When the water left, did the quiet feel like the place going still — or like the sound broke? | ☐ **Open** — cannot hear (env); stillness-by-appearance Pass; audible silence unverified |
| **U-006** | After something on the map changed, did opening the notebook feel like answering a question you already had — or like the game explaining itself first? | ☐ Unanswered — sitting remains |

Sitting file: [batch-stewardship-alive](../playtests/batch-stewardship-alive.md).

---

## Agent actions after your reply

1. **Lock** rows → flip Open→Locked (U-006 Current→Locked), strike §16 queue where listed, version-history line, `npm run conformance`, evidence in commit body. ✅ **A done** (v2.0.9). ✅ **B + C-004** (v2.0.10).
2. **Supersede W-001** → W-001 Superseded; C-015 Locked; SIMULATION_MODEL / BUILD_GUIDE tip refresh. ✅ done.
3. **Hold** → dossier note + next encoding retune; Nature tip stays paused until you say otherwise. **C-020** Hold Lock — glitches **named** G1–G5 (2026-07-31); fix then re-ask. **C-014** / **U-006** still Open.
