# Playtest — batch island brief (Slices 14 / 15 / 16 + C-014 / C-004)

**Time box:** 12 minutes. Stop at 12 even if unfinished.
**The one question:** On the island, did accepting a brief feel like a reason to run the same sculpt–forces–time loop — or like a different game?

## Do this
1. Run `npm run dev` and open the app.
2. Confirm you see an island in water (Sea: mid). Do not open any Inspect layer.
3. Click **Accept brief**. Read the brief panel (top-right).
4. Set **Rain: moderate**. Click **4x**. Watch for about 45 seconds.
5. Optionally raise **Sea: high**, then dig a hollow near the shore with **Tool: dig channel**, then run time again briefly.
6. Stop. Answer the one question above. Optionally note whether quiet after dry rain felt like the place going still (C-014) and whether rainfall felt like something the world did (C-004).

## Already proven — do not check these
- Island ocean exchange conserves mass — `island-drainage` probe, relative residual < 1e-4; ocean exchange > 0
- Same seed + sea level → identical hash — `island-drainage` replayMatch = 1
- Higher sea floods more cells — `island-drainage` oceanCellDelta > 0; habitatZones ≥ 3
- Scenario window evaluator is write-isolated — `scenario-window` writeIsolated = 1; meet vs fail diverge
- Shoreline / ocean plane encoding clears Tier-P floor — `presentation.proxy.test.ts` ocean–land color distance > 0.15
- Brief chrome present when active — `briefChromePresent` true when Accept brief
- GOLDEN_DEPTH_HASH unchanged without seaLevel — `hydrology.determinism.test.ts`

## Verdict (circle one)
- **Pass** — the brief felt like a reason to run the same loop on a place that reads as an island
- **Hold** — the brief felt like a different game, or the island did not read as a place

**If Hold, the agent will:** retune brief chrome copy / shoreline contrast / default sea level, re-measure proxies, and only then ask again — not add a new sim system.

Notebook seed: "The brief asked me to keep the hollow wet long enough for life to hold the next storm."
