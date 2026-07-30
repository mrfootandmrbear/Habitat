# C-020 — Atmospheric precip delivery

**Status:** Open (owner-judged; Slice F lite only — full clouds/phase later)  
**Criterion (verbatim from DECISION_CONFORMANCE).** Precipitation phase and placement are attributable to atmospheric state (wind, moisture, heat → cloud → rain/snow/sleet), not to a place the player targeted; mass balance closes (H-004); same seed + same atmospheric forcing → identical hash; the control surface (if any) remains a regime / climate dial with no cell arguments. Existing rain-regime dial may remain as a fallback until this criterion is met.

## Machine half (partial — Slice F lite)

| Claim | Result | Artifact |
|---|---|---|
| Climate-mean rain + orographic wind place precip | wet/dry sides encode in soil | `orographic-wind` probe; Slice F |
| No cell targeting | Force panel regimes only | `FORCE_PANEL.md`, `controls.ts` |
| Full cloud / snow / sleet phase | **Not built** | — |

## Owner taste (outstanding for full criterion)

**2026-07-30 island brief.** Rain dial works but does not feel natural → filed this candidate.

**2026-07-30 batch-salt-overseas aside.** After C-018 / C-019 Pass, owner set moderate then arid and reported rainfall still feels like a **spigot / faucet**, not weather that affects the land. Reinforces full C-020; do not pretend Slice F closed it.

## Owner-only question (when a full atmospheric slice exists)

When rain fell, did it feel like weather the atmosphere made — or like you opened a faucet?
