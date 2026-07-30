# C-020 — Atmospheric precip delivery

**Status:** Open (owner-judged; Slice F lite + Slice R weather-archetype mid-path — full clouds/phase later)  
**Criterion (verbatim from DECISION_CONFORMANCE).** Precipitation phase and placement are attributable to atmospheric state (wind, moisture, heat → cloud → rain/snow/sleet), not to a place the player targeted; mass balance closes (H-004); same seed + same atmospheric forcing → identical hash; the control surface (if any) remains a regime / climate dial with no cell arguments. Existing rain-regime dial may remain as a fallback until this criterion is met.

## Machine half (partial)

| Claim | Result | Artifact |
|---|---|---|
| Climate-mean + orographic wind | wet/dry sides in soil | `orographic-wind`; Slice F |
| No cell targeting | Force panel only | `FORCE_PANEL.md` |
| Weather archetypes (retune) | arid=desert rare storm; mod=rain events; wet=monsoon block | `rainRegime.ts` cycleDays/wetDays/stormFraction |
| Event presentation | overcast veil + streaks; muted shallow blue sheet | `RainCueMesh`, `WaterMesh` stormActive |
| Full cloud / snow / sleet | **Not built** — D-007 | — |

## Owner taste

**2026-07-30 island brief.** Rain dial works but not natural → filed.

**2026-07-30 salt-overseas.** Spigot / faucet aside.

**2026-07-30 Slice R first mid-path.** Owner: “pulsing faucet” — daily wetFraction blink rejected. Direction: extended chunks; arid=desert frequency, moderate=rain, wet=monsoon; rain should read as an **event**, not a big blue mass.

**2026-07-30 fill bug.** Even arid/light at 16× filled the view. Cause: climate means still used Slice F cartoon rates (arid ≈ 3500 mm/yr). Retuned to ~200 / 550 / 1000 / 2200 mm/yr; ocean plane opacity lowered so Sea: mid is a surrounding plane, not an aquarium tank. Hit **Reset water** after reload.

## Owner-only question (clip remainder)

When a spell hit, did it feel like weather — or still like a faucet?

**2026-07-30 D-007 clip Pass.** Owner: reads as weather the world made. Full visible clouds / precip phase still wanted later — does not Lock C-020; Slice F / R mid-path stay the shipping path until a clouds slice registers.
