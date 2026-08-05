# Playtest — Slice A1, herbivore trait drift (D-007 clip verdict)

**Time box:** 5 minutes. Stop at 5 even if unfinished.
**The one question:** Did the herd's coat visibly thickening as you dialed the world colder read as an earned adaptation, or as an arbitrary game effect?

> This is **D-007**'s clip gate (THESIS §8), not a general legibility ask — it is Locked and binding: no other slice on any track may register a new simulation `Process` until this verdict is recorded (BUILD_GUIDE §4.66, C-027-framing.md Owner half, step 3). A1 has no arrival tool yet (that is A2's and later slices' scope), so two **Debug:** buttons stand in for it — no DevTools, no console, just buttons in the **Full** controls panel. They only exist in `npm run dev`, never in a shipped build.

## Do this

1. Run `npm run dev` and open the page.
2. Click **Full** (top left) if not already selected.
3. Click **Debug: seed herbivore herd**. This is the one-time stand-in for A1's not-yet-built arrival tool — instant, no waiting.
4. In the **View:** dropdown, choose **Inspect: herbivore density**. The island should read a uniform warm tan tint instead of the near-black "nothing here" tone. This is today's honest signal — the placeholder animals themselves (visible under **View: terrain**) are sparse and easy to miss at this camera height, a deliberate consequence of the literal density readout at this preserve's real scale, not a bug.
5. In the **Heat** dropdown, confirm **Heat: warm** is selected.
6. Click **Debug: fast-forward ~1 month**. The tab may pause for 10-20 real seconds — that's expected, it's running real simulation steps, not stalling.
7. In the **Heat** dropdown, switch to **Heat: cold**.
8. Click **Debug: fast-forward ~1 month** again.
9. Compare the **Inspect: herbivore density** tint now against step 4 — did the coat/adaptation story it stands for feel like the world responding to the dial, or arbitrary?

## Already proven — do not check these

- Insulation moves 0.133 → 0.933 across a warm→cold Heat-dial swing (headless, replay-matched — identical seed/state reaches the identical result) — `herbivore-drift` probe, [docs/evidence/herbivore-drift.md](../evidence/herbivore-drift.md).
- A population on terrain steep enough that its ideal limb length exceeds the species envelope (raw demand 2.65 vs. envelope max 1.25) pins `limbLength` at 1.25 and declines to 6.78×10⁻⁹ ind/km² over 60 annual bands, vs. 1.538 ind/km² on flat terrain with the same founder population — trait mismatch keeps costing mortality even after the trait itself stops moving, so the population fails rather than cheating past its own limits — `src/sim/population.test.ts`, [A1-herbivore-composition.md](../slices/A1-herbivore-composition.md).
- Grazing measurably reduces `veg.biomass.herb` at nonzero density and is an exact no-op at zero density — same file.
- Determinism, bounds (favorable and unmeetable-pressure conditions), and every other existing probe/test stay green (`npm run gate`).
- A density drop between step 4 and step 9 (the directly-seeded, artificially uniform founder population settling toward what local capacity can actually support once an annual band commits) is real demography, not a rendering glitch — capacity is recomputed from habitat/forage every step, never a stored constant (ES-006).

## Verdict (circle one)

- **Pass** — The tint shift between step 4 and step 9, and the coat/limb story it stands for, read as the world responding to what you dialed — the way weather already does elsewhere in Habitat — not as a stat bar or a hidden dice roll.
- **Hold** — The change didn't read, or the **Debug:** buttons / placeholder shapes got in the way of judging the *mechanism* underneath them.

**If Hold, the agent will:** first check whether the Hold is about the placeholder geometry / debug-button workaround (expected — real Foxel assets and a player-facing arrival tool are both explicitly future work) or about the trait-drift mechanism itself (the actual D-007 question). Only the latter is retuned; a setup-only Hold is recorded as confirming those two gaps are real, not as a Hold on this entry's own mechanism, and the clip may be re-asked once a real arrival tool and Foxel assets land.

Notebook seed: "The herd here has gone shaggy since the cold set in."
