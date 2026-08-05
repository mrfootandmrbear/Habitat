# Playtest — Slice A1, herbivore trait drift (D-007 clip verdict)

**Time box:** 10 minutes. Stop at 10 even if unfinished.
**The one question:** Did the herd's coat visibly thickening as you dialed the world colder read as an earned adaptation, or as an arbitrary game effect?

> This is **D-007**'s clip gate (THESIS §8), not a general legibility ask — it is Locked and binding: no other slice on any track may register a new simulation `Process` until this verdict is recorded (BUILD_GUIDE §4.66, C-027-framing.md Owner half, step 3). A1 has no arrival tool yet (that is A2's and later slices' scope), so this walkthrough needs two dev-console lines to seed a founder population and fast-forward time — flagged honestly below rather than skipped or faked. Real-time playback at the fastest available rate (7 days/s) was measured too slow on this machine to cross even one 10-day seasonal band inside a reasonable playtest window, which is why fast-forward replaces it here rather than "click 7×/s and wait."

## Do this

1. Run `npm run dev` and open the page.
2. Open the browser's DevTools console (an ordinary browser feature, not a Habitat control — on most browsers, right-click the page → **Inspect** → the **Console** tab).
3. Paste and run this (seeds a founder herbivore population and good forage everywhere — the one-time stand-in for A1's not-yet-built arrival tool; `window.__habitatDebugWorld` only exists in `npm run dev`, never in a shipped build):
   ```js
   window.__habitatDebugWorld.herbivoreStageAdult.fill(20);
   window.__habitatDebugWorld.herbivoreDensity.fill(20);
   window.__habitatDebugWorld.herbBiomass.fill(2);
   window.__habitatDebugWorld.habitatSuitability.fill(1);
   ```
4. In the **View:** dropdown, choose **Inspect: herbivore density**. The island should read a uniform warm tan tint instead of the near-black "nothing here" tone.
5. In the **Heat** dropdown, choose **Heat: warm** (should already be selected).
6. Paste and run this (fast-forwards ~31 sim-days — real time, not sped-up playback; takes 10-20 real seconds, during which the tab may look unresponsive, which is expected, not a freeze):
   ```js
   for (let i = 0; i < 3000; i++) window.__habitatDebugWorld.stepEvent();
   ```
7. Switch **View:** back to **View: terrain**. The island now carries a visible standing herd (small placeholder shapes, sparse and easy to miss at this camera height — a deliberate consequence of the literal density readout at this preserve's real scale, not a bug; the **Inspect: herbivore density** tint in step 4 is the reliable signal, not spotting individual animals).
8. In the **Heat** dropdown, choose **Heat: cold**.
9. Run the same fast-forward line from step 6 again.
10. Switch **View:** to **Inspect: herbivore density** once more and compare its tint against what you saw in step 4.

## Already proven — do not check these

- Insulation moves 0.133 → 0.933 across a warm→cold Heat-dial swing (30 seasonal bands, headless), replay-matched (identical seed/state → identical result) — `herbivore-drift` probe, [docs/evidence/herbivore-drift.md](../evidence/herbivore-drift.md). The shorter live walkthrough above (step 6/9, ~3 seasonal bands each) measures 0.143 → 0.912 the same direction, same mechanism, smaller dose.
- A population on terrain steep enough that its ideal limb length exceeds the species envelope (raw demand 2.65 vs. envelope max 1.25) pins `limbLength` at 1.25 and declines to 6.78×10⁻⁹ ind/km² over 60 annual bands, vs. 1.538 ind/km² on flat terrain with the same founder population — trait mismatch keeps costing mortality even after the trait itself stops moving, so the population fails rather than cheating past its own limits — `src/sim/population.test.ts`, [A1-herbivore-composition.md](../slices/A1-herbivore-composition.md).
- Grazing measurably reduces `veg.biomass.herb` at nonzero density (2.000 → 1.786 kg DM/m² at density 8.925 ind/km²) and is an exact no-op at zero density — same file.
- Determinism, bounds (favorable and unmeetable-pressure conditions), and every other existing probe/test stay green (`npm run gate`).
- The density drop you may notice between step 4 and step 10 (a directly-seeded, artificially uniform founder population settling toward what local capacity can actually support once an annual band commits) is real demography, not a rendering glitch — capacity is recomputed from habitat/forage every step, never a stored constant (ES-006).

## Verdict (circle one)

- **Pass** — The tint shift between step 4 and step 10, and the coat/limb story it stands for, read as the world responding to what you dialed — the way weather already does elsewhere in Habitat — not as a stat bar or a hidden dice roll.
- **Hold** — The change didn't read, or the console-driven setup and placeholder shapes got in the way of judging the *mechanism* underneath them.

**If Hold, the agent will:** first check whether the Hold is about the placeholder geometry / console-seeding workaround (expected — real Foxel assets and a player-facing arrival tool are both explicitly future work) or about the trait-drift mechanism itself (the actual D-007 question). Only the latter is retuned; a setup-only Hold is recorded as confirming those two gaps are real, not as a Hold on this entry's own mechanism, and the clip may be re-asked once a real arrival tool and Foxel assets land.

Notebook seed: "The herd here has gone shaggy since the cold set in."
