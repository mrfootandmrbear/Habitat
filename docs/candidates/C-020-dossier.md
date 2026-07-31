# C-020 — Atmospheric precip delivery

**Status:** Open (Hold Lock — weather-feel Pass-with-glitches)  
**Criterion (verbatim from DECISION_CONFORMANCE).** Precipitation phase and placement are attributable to atmospheric state (wind, moisture, heat → cloud → rain/snow/sleet), not to a place the player targeted; mass balance closes (H-004); same seed + same atmospheric forcing → identical hash; the control surface (if any) remains a regime / climate dial with no cell arguments. Existing rain-regime dial may remain as a fallback until this criterion is met.

## Machine half

| Claim | Result | Artifact |
|---|---|---|
| Climate-mean + orographic wind | wet/dry sides in soil | `orographic-wind`; Slice F |
| No cell targeting | Force panel only | `FORCE_PANEL.md` |
| Weather archetypes (retune) | arid=desert rare storm; mod=rain events; wet=monsoon block | `rainRegime.ts` cycleDays/wetDays/stormFraction |
| Event presentation | overcast veil + streaks; muted shallow blue sheet | `RainCueMesh`, `WaterMesh` stormActive |
| Atmosphere Process | cloud charge → orographic discharge | `atmosphereProcess`, `climate.cloudWater` |
| Phase from heat | warm→rain / mild→sleet / cold→snow | Heat dial; `climate.precipPhase` |
| Cloud presentation | soft bodies track cloud water | `CloudMesh` |
| Probe | T-001 + H-004 + phase divergence | `cloud-delivery` |
| Persistent SWE store | **Not built** — melt-on-contact this pass | optional next |

## Owner taste

**2026-07-30 island brief.** Rain dial works but not natural → filed.

**2026-07-30 salt-overseas.** Spigot / faucet aside.

**2026-07-30 Slice R first mid-path.** Owner: “pulsing faucet” — daily wetFraction blink rejected. Direction: extended chunks; arid=desert frequency, moderate=rain, wet=monsoon; rain should read as an **event**, not a big blue mass.

**2026-07-30 fill bug.** Even arid/light at 16× filled the view. Cause: climate means still used Slice F cartoon rates (arid ≈ 3500 mm/yr). Retuned to ~200 / 550 / 1000 / 2200 mm/yr; ocean plane opacity lowered so Sea: mid is a surrounding plane, not an aquarium tank. Hit **Reset water** after reload.

**2026-07-30 D-007 clip Pass.** Owner: reads as weather the world made. Full visible clouds / precip phase still wanted later.

**2026-07-30 §4.21.** Machine half landed (Process + clouds + Heat dial). Owner Lock still open — taste question remains whether precip now feels like weather the atmosphere made.

**2026-07-30 stewardship sitting** ([batch-stewardship-alive.md](../playtests/batch-stewardship-alive.md) Q-B): **"the weather read as weather but there's some glitches to work out."** Treat as **Pass-with-glitches / Hold Lock** — do **not** Lock until glitches are named and fixed in a follow-up encoding pass. Leave **Open**.

## Named glitches (2026-07-31 — agent, from code + prior notes)

Owner did not enumerate glitches in the sitting. These are the presentation / delivery defects that match "reads as weather but glitchy," ordered by clip-test impact. Fix these before re-asking Lock — do not invent SWE / new Process unless a named row requires it.

| # | Glitch | Where | Why it reads wrong |
|---|---|---|---|
| G1 | **Storm cue strobes at 16×** | `main.ts` arms `rainCue.setStorm` from per-frame precip-ledger delta; dry days between wet chunks clear the cue every wall frame that runs steps | Residual "pulsing faucet" — spells blink on/off instead of holding a front across the wet block |
| G2 | **Cloud wrap pop** | `CloudMesh.update` teleports bodies across world edges with no fade | Sky blobs jump; breaks "atmosphere is continuous" |
| G3 | **Snow is streak-tint only** | Melt-on-contact; no lasting ground cover (dossier already notes optional SWE) | Cold spells change precip streaks but the ground never reads as snowed-on — phase feel incomplete without a presentation hold (SWE store still optional; a short-lived cover cue may suffice) |
| G4 | **Clouds ignore where rain lands** | Decorative orbiting spheres; opacity tracks scalar `cloudWater` only | Delivery and sky are decoupled — orographic wet side can rain while clouds drift uniformly |
| G5 | **Arid vs light cue strength collapsed** | `main.ts` maps `heavy→1`, `moderate→0.75`, else `0.55` | Desert rare-storm and light rain share the same veil/streak strength — archetype cadence is in the sim, not in the cue |

**Retune order:** G1 → G5 → G2 → G4 → G3 (G3 last; prefer a presentation hold before a SWE store unless cover cue fails Tier-P).

## Owner-only question (Lock) — Hold

When a spell built in the sky and fell, did it feel like weather the atmosphere made — including cold spells reading as snow?

**Next agent step:** fix named glitches G1–G5 (presentation / phase / cadence), re-measure `cloud-delivery` + encoding proxies — then re-ask Lock. Not paint rain onto cells.
