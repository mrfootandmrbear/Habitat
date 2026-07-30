# Playtest — batch maritime shore (Slices 17–19 / C-016 / C-017)

**Time box:** 12 minutes. Stop at 12 even if unfinished.  
**The one question:** When you widened the tide and let the west wind work the shore, did that feel like the sea claiming and reshaping the island — or like chrome painted on the edge?

> This **fires** the overdue maritime Tier-O batch (VERIFICATION_POLICY §4 — third question long since joined). Primary sentence covers **C-016** (tide envelope as place the sea claims) and **C-017** (windward wear / lee growth as the sea’s work). **C-018** salt-taste and **C-019** sparse overseas do **not** share this sentence honestly and wait for a later sitting (they need default-view encoding paths the owner can follow without twins or Inspect).

## Do this

1. Run `npm run dev` and open the page.
2. Confirm the inspector dropdown shows **View: terrain** (do not open any **Inspect:** layer during this sitting).
3. In the **Sea** dropdown, choose **Sea: mid**.
4. In the **Tide** dropdown, choose **Tide: spring**.
5. Look at the shore band for **fifteen seconds** without touching tools — notice where the foreshore tint sits against dry ground.
6. In the **Wind** dropdown, choose **Wind: from west**.
7. In the **Rainfall** dropdown, choose **Rainfall: moderate**.
8. Click **16x**.
9. Watch the island for **ninety seconds** without touching tools — attend to the **west** shore (windward) versus the **east** shore (lee).
10. Click **Pause**.
11. Look once at the shoreline shape (west vs east). Stop. Answer the one question.

## Already proven — do not check these

- Widening the tide envelope grows intertidal cells — `tidal-envelope` probe: neap 294 → mean 630 → spring 1206; `foreshoreGrew = 1`; ocean cells unchanged at 1658.
- Same tide envelope → identical hash — `tidal-envelope` `mean.replayMatch = 1`.
- Intertidal foreshore tint clears Tier-P floor — encoding Δ ≈ 0.129 (> 0.08); `presentation.proxy.test.ts`.
- West wind cuts the west shore more than the east — `shore-exposure` `westWindwardBias` ≈ 0.463; opposite wind diverges (`hashDiverged = 1`); bedrock closed.
- West wind grows lee deposit vs calm — `longshore-drift` `westLeeGain` ≈ 0.333; windward loss ≈ 0.131; `bedrockClosed = 1`; no SWE.
- Windward vs leeward elev divergence under one wind is measurable without inspector — `presentation.proxy.test.ts` (Slices 18–19).
- Island ocean exchange conserves — `island-drainage` relative residual < 1e-4.

## Verdict (circle one)

- **Pass** — the widened tide and wind-worked shore felt like the sea claiming and reshaping the island
- **Hold** — it felt like chrome on the edge, or the shore change never caught your eye

**Owner 2026-07-30: Hold → Pass after retune.** First look: forces worked but wind origin / tide band were hard to read; water strobed at event rate. After wind arrow above the peak, MHW ring, foreshore tint, and display-depth smoothing: **Pass**.

**If Hold, the agent will:** retune foreshore tint contrast and/or coastal geomorphology rates so windward wear and lee gain clear a stronger default-view proxy, re-measure, and only then ask again — not add a new sim system.

Notebook seed: "The spring tide claimed a wider band; the west wind wore one shore and fed the other."

---

**Not to be asked here.** Whether the numbers are right. HUD values. Salinity tasting like legacy (**C-018**). Whether a smaller island felt emptier (**C-019**). C-014 silence. Fun-gate score. Anything with a number in it. One question, one sitting.
