# Playtest — Slice 12 arrival / first occupant

**Time box:** 8 minutes. Stop at 8 even if unfinished.  
**The one question:** When it appeared, did it feel earned by the place you made — or like a spawn?

## Do this

1. Run `npm run dev` and open the app.
2. Set **Weather: rain on**, **Time: 16×**, **Tool: dig channel**.
3. Dig a shallow hollow near the preserve edge (not the absolute center).
4. Leave rain on for about 30 seconds of wall time, then set **Weather: dry**.
5. Keep **Time: 16×** and watch the hollow for another 30–45 seconds of wall time — look for green shoots rising from the ground without opening any Inspect layer.
6. Stop. Answer the one question.

## Already proven — do not check these

- Suitable wet patch accumulates herb biomass; dry unsuitable patch stays at zero — `arrival-earned` probe, suitable biomass = 2.5, unsuitable = 0, `earned = 1`.
- Improving the limiting HSI input raises establishment probability; improving a non-limiting input does not — `src/sim/arrival.test.ts`.
- Same seed + forcing → identical arrival hash; fields bounded — `arrival-earned` `hashMatch = 1`, `bounded = 1`.
- Occupant encoding clears the perceptual floor against pre-arrival — `occupantEncodingDelta(0, 0.45) > 0.15`.
- No introduction tool; continuous establishment (C-003 Open) — `docs/slices/12-composition.md`.

## Verdict

- **Pass** — appearance of life should mimic real life; therefore it appears through earned conditions (owner, 2026-07-29). C-007 promoted to Locked.

Notebook seed: "The first shoots appeared in the hollow I kept wet."
