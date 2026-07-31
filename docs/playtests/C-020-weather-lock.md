# Playtest — C-020 weather Lock re-ask

**Time box:** 4 minutes. Stop at 4 even if unfinished.  
**The one question:** When a spell built in the sky and fell, did it feel like weather the atmosphere made — including cold spells reading as snow?

## Do this

1. Open the island sandbox (`npm run dev` if needed).
2. Set **Rainfall: wet**, **Wind: west**, **Heat: warm**, **Time: 16×**.
3. Watch one wet spell: sky builds, rain holds as a front (not a blink), then clears — do not open the inspector.
4. Set **Heat: cold**, keep **Rainfall: wet**, run **16×** through another spell.
5. Watch whether the cold spell leaves the ground briefly pale / snowed-looking, then answers the question above.

## Already proven — do not check these

- Atmosphere Process: cloud charge → orographic discharge; T-001 + H-004 + phase divergence — `cloud-delivery` probe (13 metrics ok); `atmosphere.test.ts`.
- G1 wet-day / cloud-charge arm holds the cue without precip this tick — `stormCue.test.ts`.
- G5 arid cue strength 0.28 < light 0.52 (gap > 0.15) — `stormCue.test.ts`.
- G2 wrap edge fade is 0 at boundary — `wrapEdgeFade` / `stormCue.test.ts`.
- G4 windward opacity-weighted centroid shifts toward arrival side (Δ > 2) — `stormCue.test.ts`.
- G3 snow ground cover builds > 0.25 and holds after clear — `RainCueMesh` / `stormCue.test.ts` (no SWE store).

## Verdict (circle one)

- **Pass / Lock** — it felt like weather the atmosphere made; cold spells read as snow on the ground. ☑ **Owner 2026-07-31 — Lock**
- **Hold** — still glitchy or snow still only streaks / no ground feel.

**If Hold, the agent will:** name the remaining glitch; retune cue / cover (SWE store only if the snow ground hold still fails); re-measure proxies; ask again — not paint rain onto cells.

Notebook seed: "The sky thickened before the shower; the cold spell left the hollow pale."

---

## Owner result (2026-07-31)

**Pass / Lock.** Register **v2.0.13** — **C-020 Locked**.