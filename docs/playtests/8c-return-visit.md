# Playtest — Slice 8c, the return visit

> **Superseded for the current batch fire.** Use [batch-living-return.md](batch-living-return.md) (8c + Slice 13). Keep this file as history of the original 8c ask.

**Time box:** 15 minutes. Stop at 15 even if unfinished.
**The one question:** Did you want to run it again with different weather?

> This is the batched Tier-O session (VERIFICATION_POLICY §4). It replaces the previously batched presentation-legibility and erosion-legibility asks — both are subsumed here, because the thesis question is whether the *return visit* lands, not whether any single encoding is visible. C-004's stewardship reading is filed in `docs/candidates/C-004-dossier.md` and is not a second question in this sitting.

## Do this

1. Run `npm run dev` and open the page.
2. In the **Tool** dropdown, choose **Tool: raise berm**.
3. Build something you would be annoyed to lose. Take a full minute. Put a berm across the slope where you think water wants to go.
4. In the **Tool** dropdown, choose **Tool: dig channel**. Cut one channel leading away from your berm.
5. Click **Remember form**.
6. In the **Tool** dropdown, choose **Tool: look**.
7. In the **Rain** dropdown, choose **Rain: heavy**.
8. Click **16x**.
9. Watch for **forty-five seconds** — storms pulse; do not touch tools. Then open **Rain** and choose **Rain: dry**.
10. Watch the water leave for another **forty-five seconds**.
11. Click **Pause**.
12. Look at what you built in step 3 (warm/cool tint marks change from the form you remembered).

## Already proven — do not check these

- Mass is conserved across wet→dry with GW — H-004 residual within bounds (`soil-water.test.ts`).
- Same seed + **Rain: light** reproduces exactly; **Rain: heavy** diverges — `regime-divergence` (`light.replayMatch = 1`, `hashDiverged = 1`).
- Perimeter pour-point outlets drain spill (SIM §10.2) — mountain runs are not a closed bathtub; closed-basin tests opt out explicitly.
- Erosion on player-made terrain is real sim output — `geomorphology.test.ts`.
- After **Remember form** + geomorphology, elev-change encoding max strength > 0.15 (perceptual floor) — `presentation.proxy.test.ts`.
- Basins fill to spill elevation — `basin-fill` probe.
- Save / Load and edit-only Undo work; Undo clears when time runs — `sessionPersist.test.ts`.

## Verdict (circle one)

- **Pass** — At step 12 you wanted to rebuild it, or wanted to see the same landscape under different weather. The pull was toward *another run*, not toward the inspector.
- **Hold** — At step 12 you felt nothing in particular, or you found yourself opening the **Inspect:** dropdown to work out whether anything had happened at all.

**If Hold, the agent will:** raise the encoded contrast on elevation change until the Tier-P delta clears the floor by a wider margin, and tighten the before/after cue. It will not add a new simulation system in response to a Hold.

Notebook seed: "The berm I built is a low ridge now, and the channel moved."

---

**Not to be asked here.** Whether it is fun overall. Whether the water is correct. Anything with a number in it. One question, one sitting.
