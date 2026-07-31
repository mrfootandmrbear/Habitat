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

## Verdict (circle one per question)

**A — C-004 stewardship**
- **Pass** — the regime change felt like something the world did
- **Hold** — it felt like something you placed (spigot / god-mode)

**B — C-020 weather**
- **Pass** — spells from the sky felt like weather the atmosphere made, including cold → snow
- **Hold** — still a faucet, or cold did not read as snow

**C — C-014 silence**
- **Pass** — the quiet felt like the place going still
- **Hold** — it felt like the sound broke

**D — U-006 notebook**
- **Pass** — the notebook answered a question you already had
- **Hold** — it felt like the game explaining itself first

**If Hold on A, the agent will:** narrow the Force panel / regime framing so stewardship stays regimes-not-smiting — not add place-targeted weather.

**If Hold on B, the agent will:** retune cloud / phase presentation (and arid event cadence if still spigot-like), re-measure proxies, ask again — not paint rain onto cells.

**If Hold on C, the agent will:** retune the water→gain curve toward quiet-but-alive vs abrupt cut, re-test isolation — not invent a second audio authority.

**If Hold on D, the agent will:** tighten when Notebook surfaces / hedge language so it stays pull-not-push — not expand into authored tutorial prose.

Notebook seed: "The spell fell from the sky; the hollow went quiet when the water left."

---

**Not to be asked here.** Numbers. HUD. Inspect layers. Ready Lock ballot rows (C-009 / C-016…C-019 / W-001). Nature tip / sand-binder. Fun-gate score.
