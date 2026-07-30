# Playtest — batched return + living hollow (8c + Slice 13)

**Time box:** 18 minutes. Stop at 18 even if unfinished.  
**The one question:** Did the living hollow feel like it changed how the water moved — enough that you wanted another storm?

> This **fires** the overdue Tier-O batch (VERIFICATION_POLICY §4). It replaces [8c-return-visit.md](8c-return-visit.md) for this sitting and covers Slice 13’s living-hollow question. C-014 silence and older deferred asks (9–11 / dry-down) wait for a later sitting — they do not share this sentence honestly.

## Do this

1. Run `npm run dev` and open the page.
2. Confirm the inspector dropdown shows **View: terrain** (do not open any **Inspect:** layer during this sitting).
3. In the **Tool** dropdown, choose **Tool: dig channel**.
4. Dig a shallow hollow near the **preserve edge** (not the absolute center) — a place you would notice if water pooled and something grew.
5. In the **Rain** dropdown, choose **Rain: moderate**.
6. Click **16x**.
7. Watch for **sixty seconds** without touching tools — let the hollow wet.
8. In the **Rain** dropdown, choose **Rain: dry**.
9. Keep **16x** and watch the hollow for **seventy-five seconds** — look for green shoots rising from the ground (no Inspect).
10. Click **Remember form**.
11. In the **Rain** dropdown, choose **Rain: heavy**.
12. Click **16x** if it is not already selected.
13. Watch for **forty-five seconds** — storms pulse; do not touch tools. Watch how water moves through the hollow you kept.
14. In the **Rain** dropdown, choose **Rain: dry**.
15. Watch the water leave for **thirty seconds**.
16. Click **Pause**.
17. Look once at the hollow (and any warm/cool tint from the form you remembered). Stop. Answer the one question.

## Already proven — do not check these

- Colonized hollow slows runoff and infiltrates more than a bare twin with cover held at zero — `living-hollow` probe: colonized downslope ≈ 0.152 vs bare ≈ 0.423; infil ≈ 25.83 vs 11.52; `coverHeld = 1`, `earned = 1`.
- Herb biomass stacks into roughness/infiltration without dual-writing `veg.cover` — `living-hollow.test.ts`, `docs/slices/13-composition.md`.
- Soil-soak encoding after herb-driven infiltration clears perceptual floor — `presentation.proxy.test.ts` delta > 0.15.
- Suitable wet patch accumulates herb biomass; unsuitable stays zero — `arrival-earned` (suitable biomass = 2.5, unsuitable = 0, `earned = 1`); C-007 Locked.
- Occupant encoding clears perceptual floor — `occupantEncodingDelta > 0.15`.
- Same seed + **Rain: light** reproduces; **Rain: heavy** diverges — `regime-divergence` (`light.replayMatch = 1`, `hashDiverged = 1`).
- After **Remember form** + geomorphology, elev-change encoding max strength > 0.15 — `presentation.proxy.test.ts`.
- Mass conserved across wet→dry with GW — H-004 residual within bounds (`soil-water.test.ts`).

## Verdict

- **Pass** — owner 2026-07-30: living hollow met the storm differently once shoots took; wanted another storm / another run. Pull toward another run, not Inspect.

Notebook seed: "The hollow I kept wet held the next rain differently once shoots took."

---

**Not to be asked here.** Whether the numbers are right. Whether C-014 silence felt earned. Fun-gate score. Anything with a number in it. One question, one sitting.
