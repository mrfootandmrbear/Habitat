# C-020 — Atmospheric precip delivery

**Status:** Locked (2026-07-31)  
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
| Cloud presentation | soft bodies track cloud water; windward bias | `CloudMesh` |
| Probe | T-001 + H-004 + phase divergence | `cloud-delivery` |
| G1–G5 presentation | wet-day hold, strength ladder, wrap fade, windward bias, snow ground hold | `stormCue.test.ts` |
| Persistent SWE store | **Not built** — presentation snow hold suffices for Lock | optional later |

## Owner taste

**2026-07-30 island brief.** Rain dial works but not natural → filed.

**2026-07-30 salt-overseas.** Spigot / faucet aside.

**2026-07-30 Slice R first mid-path.** Owner: “pulsing faucet” — daily wetFraction blink rejected. Direction: extended chunks; arid=desert frequency, moderate=rain, wet=monsoon; rain should read as an **event**, not a big blue mass.

**2026-07-30 fill bug.** Even arid/light at 16× filled the view. Cause: climate means still used Slice F cartoon rates (arid ≈ 3500 mm/yr). Retuned to ~200 / 550 / 1000 / 2200 mm/yr; ocean plane opacity lowered so Sea: mid is a surrounding plane, not an aquarium tank. Hit **Reset water** after reload.

**2026-07-30 D-007 clip Pass.** Owner: reads as weather the world made. Full visible clouds / precip phase still wanted later.

**2026-07-30 §4.21.** Machine half landed (Process + clouds + Heat dial). Owner Lock still open — taste question remains whether precip now feels like weather the atmosphere made.

**2026-07-30 stewardship sitting** ([batch-stewardship-alive.md](../playtests/batch-stewardship-alive.md) Q-B): **"the weather read as weather but there's some glitches to work out."** Treat as **Pass-with-glitches / Hold Lock** — do **not** Lock until glitches are named and fixed in a follow-up encoding pass. Leave **Open**.

**2026-07-31 Lock re-ask** ([C-020-weather-lock.md](../playtests/C-020-weather-lock.md)): Owner **Pass / Lock** — weather the atmosphere made; cold spells reading as snow. **Locked** register v2.0.13.

## Named glitches (2026-07-31 — agent, from code + prior notes)

| # | Glitch | Status |
|---|---|---|
| G1 | Storm cue strobes at 16× | **Fixed** — wet-day / cloud-charge arm + 1.6s wall release hold |
| G2 | Cloud wrap pop | **Fixed** — `wrapEdgeFade` |
| G3 | Snow is streak-tint only | **Fixed** — presentation ground-cover hold (no SWE) |
| G4 | Clouds ignore where rain lands | **Fixed** — windward home attract + opacity bias |
| G5 | Arid vs light cue strength collapsed | **Fixed** — `stormCueStrength` ladder |

**Tier-P:** `src/ui/stormCue.test.ts`.

## Owner-only question (Lock) — discharged

When a spell built in the sky and fell, did it feel like weather the atmosphere made — including cold spells reading as snow?

**Answer:** Yes — Lock (2026-07-31).
