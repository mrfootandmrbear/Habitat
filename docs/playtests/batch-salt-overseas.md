# Playtest — batch salt + overseas (C-018 / C-019)

**Time box:** 14 minutes. Stop at 14 even if unfinished.  
**Question A (C-018):** When the pale shore stayed sparse while inland greened under the same rain, did that feel like the ground still tasting of the sea — or like today's weather?  
**Question B (C-019):** When shoots took first along the shore and the island interior stayed emptier under the same weather, did that feel like life having farther to come — or like the place was broken?

> This **fires** the deferred salt / overseas Tier-O batch from [batch-maritime-shore.md](batch-maritime-shore.md). Machine halves for C-018 / C-019 are discharged; default-view salt crust and shore-fringe occupants clear Tier-P floors. One sitting, **View: terrain** only — no twins, no Inspect.

## Do this

1. Run `npm run dev` and open the page.
2. Confirm the inspector dropdown shows **View: terrain** (do not open any **Inspect:** layer during this sitting).
3. In the **Sea** dropdown, choose **Sea: mid**.
4. In the **Tide** dropdown, choose **Tide: mean**.
5. In the **Rainfall** dropdown, choose **Rainfall: moderate**.
6. Click **16x**.
7. Watch the island for **ninety seconds** without touching tools — attend to **pale crust near the shore** versus greener ground inland (answer Question A afterward).
8. Keep watching for **sixty more seconds** — attend to **green shoots near the shore fringe** versus the emptier interior (answer Question B afterward).
9. Click **Pause**.
10. Stop. Answer Question A, then Question B.

## Already proven — do not check these

- Freshened hollow earns full HSI / biomass; salty twin is salt-limited — `salinity-arrival`: freshened hsi = 1, biomass = 2.5; salty limiting = 3, hsi ≈ 0.15, biomass ≈ 0.375; biomassDelta ≈ 2.125; `replayMatch = 1`; `residualMatch = 1`.
- Ocean shoreline sources salt; freshwater dilutes; save-legacy round-trip — `salinity.test.ts`.
- Salinity crust tint clears Tier-P floor without inspector — `salinityEncodingDelta` ≈ 0.524 (> 0.08); `presentation.proxy.test.ts`.
- Large island earns more biomass / S_elig than small under identical regimes — `island-arrival`: land 316 vs 52; biomass ≈ 1.883 vs 1.071; sElig ≈ 0.349 vs 0.151; `notPerimeter = 1`; `oceanSeedZero = 1`; `replayMatch = 1`.
- Near isolation > far biomass — `island-arrival` isolationDelta ≈ 1.615.
- Overseas shore fringe occupant encoding clears Tier-P floor vs interior on one island — shore–interior Δ ≈ 0.087 (> 0.08); `presentation.proxy.test.ts`.

## Verdict (circle one per question)

**A — C-018 salt taste**
- **Pass** — the pale sparse shore felt like the ground still tasting of the sea
- **Hold** — it felt like today's weather, or the pale band never caught your eye

**B — C-019 sparse overseas**
- **Pass** — shore-first shoots felt like life having farther to come
- **Hold** — it felt broken or empty by bug, or the fringe never caught your eye

**Owner 2026-07-30: Pass on A and B.** After **Rainfall: moderate** for ninety seconds under **Sea: mid** / **Tide: mean** / **View: terrain**, both questions cleared. Owner also flipped to **Rainfall: arid** afterward to watch dry-down — noted separately that the rainfall control still reads as a **spigot** (on/off faucet) rather than weather the land lives under; that taste sits on **C-020** / **C-004** (Open), not on these Passes.

**If Hold on A, the agent will:** retune salt crust contrast / green washout so salty vs freshened ground clears a stronger default-view proxy, re-measure, and only then ask again — not add a cleanup tool or new substance.

**If Hold on B, the agent will:** retune OccupantMesh early-shoot visibility / shore–interior encoding so the fringe clears a stronger proxy, re-measure, and only then ask again — not invent a spawn or twin-island UI.

Notebook seed: "The shore stayed pale and sparse where the sea still tasted the ground; shoots took first at the fringe."

---

**Not to be asked here.** Whether the numbers are right. HUD values. Twin reload A/B. Inspect layers. Tide/wind shore reshape (already Pass). C-014 silence. Fun-gate score. Anything with a number in it. Spigot-vs-weather for rain (C-020 / C-004 — already Open).
