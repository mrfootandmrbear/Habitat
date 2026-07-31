# Playtest — batch stewardship / weather / silence / notebook

**Time box:** 18 minutes. Stop at 18 even if unfinished.  
**Question A (C-004):** After you set the rainfall regime and ran time, did what happened feel like something the world did — or like something you placed?  
**Question B (C-020):** When a spell built in the sky and fell, did it feel like weather the atmosphere made — including cold spells reading as snow?  
**Question C (C-014):** When the water left, did the quiet feel like the place going still — or like the sound broke?  
**Question D (U-006):** After something on the map changed, did opening the notebook feel like answering a question you already had — or like the game explaining itself first?

> Fires the deferred owner halves for **C-004** / **C-020** / **C-014** / **U-006**. Ready-to-Lock Pass cluster is a separate ballot: [owner-lock-batch.md](../candidates/owner-lock-batch.md) — do not re-judge C-009 / C-016…C-019 here.

## Do this

1. Run `npm run dev` and open the page (sound on; headphones optional).
2. Confirm **View: terrain** (do not open any **Inspect:** layer).
3. Choose **Sea: mid**, **Tide: mean**, **Wind: calm**, **Rainfall: moderate**, **Heat: mild**.
4. Click **16x**. Watch for **sixty seconds** — attend to clouds building and precip falling (answer Question B later; cold pass is step 8).
5. Click **Pause**.
6. Choose **Rainfall: arid**. Click **16x**. Watch for **forty-five seconds** as the land dries and standing water shrinks (answer Question A later).
7. Click **Pause**. Attend to whether the ambient water sound went quiet with the water (answer Question C).
8. Choose **Heat: cold**, **Rainfall: moderate**. Click **16x**. Watch for **forty-five seconds** — attend to whether cold spells read as snow rather than the same rain (finishes Question B).
9. Click **Pause**.
10. Click **Notebook** (open). Ask **what changed**, then **what contributed**. Read the answers once (answer Question D).
11. Stop. Answer A, then B, then C, then D.

## Already proven — do not check these

- Same seed + same rain regime → identical hash; different regime diverges — `regime-divergence`: `light.replayMatch = 1`, `delta.hashDiverged = 1`, precip Δ ≈ 190.3; rain API has no cell args (`rainRegime.test.ts`).
- Atmosphere Process: cloud charge → orographic discharge; phase from heat; T-001 + H-004 — `cloud-delivery` probe; `atmosphere.test.ts`.
- Water depth → ambient.water; dry grid → true silence (`level === 0`); write/RNG isolation — `audio.test.ts`. Cover → ambient.life independent bed — Slice A+.
- Notebook corpus every emit has `traces[]`; `corpusAllTraced() === true`; write/RNG isolation — `notebook.test.ts`.

## Verdict (owner 2026-07-30)

**A — C-004 stewardship — Pass → Locked**
Owner: "felt like island was alive, i wanted to speed it up faster than 16x even." World-did-it reading met. Want-faster-than-16× recorded as **product feedback**, not a Hold.

**B — C-020 weather — Pass-with-glitches / Hold Lock**
Owner: "the weather read as weather but there's some glitches to work out." Do **not** Lock C-020 until glitches are named and fixed. Leave Open.

**C — C-014 silence — Mixed / leave Open**
Owner: "cannot hear, by appearance yes it was still." Stillness-by-appearance **Pass**; audible silence **unverified** (no hear). Criterion requires hearing for AUD-002 silence-as-ecological — leave Open / blocked on audio environment.

**D — U-006 notebook — unanswered**
Owner did not answer. Sitting / Open remains.

**If Hold on B (active):** glitches **G1–G5 fixed** ([C-020-dossier.md](../candidates/C-020-dossier.md)) — re-ask Lock; SWE only if snow cover still fails taste.

**If C needs a re-sit:** require an environment where the owner can hear; do not Lock on appearance alone.

**If Hold on D later:** tighten when Notebook surfaces / hedge language so it stays pull-not-push — not expand into authored tutorial prose.

Notebook seed: "The spell fell from the sky; the hollow went quiet when the water left."

---

**Not to be asked here.** Numbers. HUD. Inspect layers. Ready Lock ballot rows (C-009 / C-016…C-019 / W-001). Nature tip / sand-binder. Fun-gate score.
