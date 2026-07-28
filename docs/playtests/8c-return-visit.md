# Playtest — Slice 8c, the return visit

**Time box:** 15 minutes. Stop at 15 even if unfinished.
**The one question:** Did you want to run it again with different weather?

> This is the batched Tier-O session (VERIFICATION_POLICY §4). It replaces the previously batched presentation-legibility and erosion-legibility asks — both are subsumed here, because the thesis question is whether the *return visit* lands, not whether any single encoding is visible.

## Do this

1. Run `npm run dev` and open the page.
2. In the **Tool** dropdown, choose **Tool: raise berm**.
3. Build something you would be annoyed to lose. Take a full minute. Put a berm across the slope where you think water wants to go.
4. In the **Tool** dropdown, choose **Tool: dig channel**. Cut one channel leading away from your berm.
5. In the **Tool** dropdown, choose **Tool: look**.
6. Click **Rain: off** so it reads **Rain: on**.
7. Click **16x**.
8. Watch. Do not touch anything for two minutes.
9. Click **Pause**.
10. Look at what you built in step 3.

## Already proven — do not check these

Filled in from probe output before this session runs; do not verify any of it by eye.

- Mass is conserved across the run — ledger test, residual within H-004 bounds.
- Same seed and schedule reproduce this run exactly — golden hash (T-001).
- Erosion on player-made terrain is real sim output, not a scripted event — `geomorphology.test.ts`; high-contributing-area cells erode more than low-A cells under bare cover.
- The eroded-vs-untouched difference exceeds the perceptual floor at default camera — Tier-P encoded-signal proxy, `<number>` vs floor `<number>`.
- Basins fill to spill elevation and do not leak — nested-basin fixture, `src/sim/fixtures/pitDem.ts`.

## Verdict (circle one)

- **Pass** — At step 10 you wanted to rebuild it, or wanted to see the same landscape under heavier rain. The pull was toward *another run*, not toward the inspector.
- **Hold** — At step 10 you felt nothing in particular, or you found yourself opening the **Inspect:** dropdown to work out whether anything had happened at all.

**If Hold, the agent will:** raise the encoded contrast on erosion and deposition until the Tier-P delta clears the floor by a wider margin, and add a before/after the return visit can be read against — a *then* as well as a *now*. It will not add a new simulation system in response to a Hold.

Notebook seed: "The berm I built is a low ridge now, and the channel moved."

---

**Not to be asked here.** Whether it is fun overall. Whether the water is correct. Anything with a number in it. One question, one sitting.
