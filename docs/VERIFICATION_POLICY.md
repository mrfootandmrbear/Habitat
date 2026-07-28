# Habitat — Verification Policy

> **Status:** Working draft
> **Role:** Decides **who verifies what** — the agent (headless, quantitative) vs. the owner (attention, legibility, taste)
> **Authority:** Subordinate to the [Decision Register](DECISION_REGISTER.md). Binds [BUILD_GUIDE.md](BUILD_GUIDE.md) §2 Definition of Done. Enforced in-session by `.cursor/rules/verify-before-asking.mdc`.

---

## 1. The rule

> **If the answer is a number, or a comparison of numbers, the agent gets it.
> If the answer is a preference, a feeling, or a judgment about what a human notices, the owner gets it.**

Owner time is the scarcest resource on this project. Every playtest request spends it. A request that asks the owner to confirm something a test could have proven spends it on nothing, and — worse — trains the owner to skim playtests, which is exactly when the real fun-gate signal gets lost.

**Register basis.** T-006 states the simulation can execute headlessly and that rendering does not govern outcome. That is the license: any claim about *authoritative state* is the agent's to settle. T-001 makes those settlements reproducible. D-006 and P-003 make attention and observation the owner's domain — and *only* those.

---

## 2. Three tiers

### Tier M — Machine. The agent verifies. Never ask the owner.

Any claim about simulation state, rates, conservation, ordering, or reproducibility. The agent runs it, reports the number, and moves on. Asking the owner to confirm a Tier-M claim is a process defect, not diligence.

### Tier P — Proxy. The agent builds a measurement *before* asking.

Claims of the form "is the difference big enough to notice?" These feel subjective but have a measurable substrate: a signal either exists in the data and in the visual encoding, or it does not. The agent quantifies the substrate first. Only if the signal is present does the question go to the owner — and then the question is "did you notice it?", never "is it there?".

**A Tier-P claim may not become a playtest request until the proxy is green.** If the proxy is red, retune and re-measure. That work is the agent's, not a `Hold` verdict spent from the owner's afternoon.

### Tier O — Owner. Ask. These are the only legitimate playtest questions.

Preference, attention, meaning, and whether a stranger would read the world correctly. The register itself hands these over: A-005 stays `Current` "until an interaction prototype proves the distinction is legible" — legible to a person, which no test asserts. D-005 makes aesthetic force a goal. D-006 makes *wanting to keep watching* the unit of engagement.

---

## 3. Catalog

| Claim | Tier | How it is settled |
|---|---|---|
| Mass is conserved / no silent drain | **M** | Ledger test across a multi-day band (H-004) |
| `dt` and time rate do not change outcome | **M** | Refinement + S-009 invariance test |
| Same seed + schedule → same state | **M** | Golden hash (T-001) |
| Prediction/inspect do not mutate sim | **M** | Write-isolation test (P-006, T-006) |
| Fields stay in range, no NaN | **M** | Bounds check at band commit |
| Higher moisture → ≥ biomass | **M** | Monotonicity test |
| Vegetated slope blunts the hydrograph | **M** | Paired-storm probe: peak, time-to-peak, infiltration ledger, Σw at t |
| Berm changes routing | **M** | Flow-accumulation delta across the edit |
| Basin fills to spill elevation, doesn't leak | **M** | Priority-flood fixture vs. RichDEM oracle |
| GW compartment closes mass balance with surface + soil | **M** | Ledger residual including groundwater store (C-001 / Slice 8b) |
| Baseflow persists after dry days vs no-GW baseline | **M** | Probe `baseflow-persist`: channel wetness after N dry days with GW ≫ without |
| Research steal cites register or candidate ID | **M** | Docs/conformance — not a playtest (EXTERNAL_REFERENCES ↔ C-001…C-003) |
| Performance is acceptable | **M** | Step timing at target grid size |
| "Difference is visible without the inspector" | **P** | Encoded-signal check: run the mapping from field → color, assert the two states the owner is meant to distinguish differ by more than a stated perceptual floor, across the actual value range reached in play |
| "Growth is fast enough to see" | **P** | Time-to-threshold in sim-minutes at each time rate; compare against a stated attention budget |
| "The change is legible at camera distance" | **P** | Patch size of the changed region in cells → screen area at default camera |
| **Did your eye want to follow it?** | **O** | Playtest (D-006) |
| **Did you form an expectation, and did you care whether it was right?** | **O** | Playtest (P-006, D-006) |
| **Would a stranger call this a cause or an outcome?** | **O** | Playtest (A-005, N-001) |
| **Does it feel like a place worth tending?** | **O** | Playtest (D-005, ART-001) |
| **Is fast-forward "skipping work" or "choosing attention"?** | **O** | Playtest (T-002, S-009) |
| **Do you want to keep playing / what would raise it a point?** | **O** | Fun gate (MVP_SCOPE §6) |

When a new claim doesn't fit a row, apply §1 and add the row.

---

## 4. The ask gate

The agent may request a playtest only when **all four** hold. Otherwise it keeps working.

1. `npm test`, `npm run build`, and `npm run conformance:check` are green on the current tree.
2. Every Tier-M claim for the slice is covered by a committed test or probe, and the agent can state the numbers.
3. Every Tier-P claim for the slice has a green proxy.
4. The agent can write the owner-only question **in one sentence** and that sentence contains no number.

If step 4 is hard, the question was Tier M or P and the answer is more work, not a playtest.

**Corollary — batching.** Slices that produce no new owner-only question (infrastructure, refactors, performance, hygiene items) do not get a playtest request at all. They accumulate. Ask once, at the next slice that actually changes what the world looks like or what the player can do.

---

## 5. Playtest request format

When the gate is passed, the request is a file at `docs/playtests/<slice>.md` and it obeys this shape:

```markdown
# Playtest — <slice>

**Time box:** N minutes. Stop at N even if unfinished.
**The one question:** <single sentence, no numbers>

## Do this
1. <exact command>
2. <exact click, exact control name>
3. <exact thing to watch>
...

## Already proven — do not check these
- <Tier-M claim> — <test file>, <number>
- <Tier-P claim> — <proxy>, <number vs. floor>

## Verdict (circle one)
- **Pass** — <what Pass means, in terms of what you felt or noticed>
- **Hold** — <what Hold means>

Notebook seed: "<sentence>"
```

Rules for that file:

- **One question.** Not five. If a slice raises two owner-only questions, that is two sessions, or one session and one deferral.
- **A hard time box**, stated up front, small (5–20 min unless it is a fun gate).
- **Numbered, unambiguous steps.** No "optional", no "or", no "try some variations", no choices the owner has to invent. Every control named exactly as it appears on screen.
- **No instrument reading.** Never "note `Σw`", never "compare the values", never "reload and A/B it". If a comparison matters, the agent has already made it and the number is in *Already proven*.
- **The verdict is about the owner, not the world.** "Did you notice / care / want to" — not "is it working".
- **`Hold` must name what the agent will change**, so a Hold ends the session instead of starting a discussion.

---

## 6. Never ask the owner to

- Read a number off the HUD or the console.
- Reload the page to compare two configurations.
- Confirm that a passing test passes.
- Confirm conservation, determinism, ordering, or bounds.
- Decide a tuning constant by feel before a proxy shows the signal exists.
- "Play around and see what you think" with no question attached.
- Verify anything the agent could have verified but didn't get around to.

---

## 7. Amendment to BUILD_GUIDE §2

Definition-of-Done row 8 ("Owner play — someone played the observable for several minutes") is replaced by:

> **8. Owner play — required only when the slice produces a Tier-O question** under [VERIFICATION_POLICY.md](VERIFICATION_POLICY.md). Infrastructure, hygiene, and performance slices satisfy this row by stating "no owner-only question; deferred to <next observable slice>". Slices that do produce one must pass the §4 ask gate before requesting it.

Row 2 ("Observable") stays a Tier-P claim: the agent proves the signal is encoded; the owner answers whether they noticed it.

---

## 8. Where the numbers live (agent task — not yet built)

Tier M and Tier P need a home for scenario-scale measurement that is coarser than a unit test and reportable to the owner.

**Spec.**

- `npm run probe -- <scenario>` runs a named headless scenario against real `WorldState` (T-006), no renderer, fixed seed and schedule.
- Scenarios are declared in `src/sim/probes/` and each emits a flat record of named scalars — peak Σw, time-to-peak, infiltration ledger total, ET total, mass residual, time-to-threshold, step ms.
- Output writes `docs/evidence/<scenario>.md`: a table of this run vs. the committed baseline, with deltas.
- Baselines are committed. A changed baseline is a deliberate act with a reason in the commit body, exactly like `GOLDEN_*` hashes (T-001).
- First scenarios: `paired-storm` (bare vs. vegetated), `berm-reroute` (accumulation delta across a siting edit), `basin-fill` (spill elevation and residual), and (Slice 8b) `baseflow-persist` (wet channel after dry days with vs without GW).
- The *Already proven* block of any playtest request is pasted from the probe output, not hand-written.

The encoded-signal proxy (§3) needs a sibling: a pure function extracted from `TerrainMesh` mapping field value → color, so a test can assert perceptual delta without a GPU. That extraction is a prerequisite for treating "Observable" as Tier P rather than Tier O.

---

## 9. Document role

| Document | Owns |
|---|---|
| [DECISION_REGISTER.md](DECISION_REGISTER.md) | What is true about the product |
| [MVP_SCOPE.md](MVP_SCOPE.md) | Which loops the first playable proves; the fun gate |
| [BUILD_GUIDE.md](BUILD_GUIDE.md) | How to execute a slice |
| **This file** | Who verifies each claim, and what must be true before the owner is asked |
| [DECISION_CONFORMANCE.md](DECISION_CONFORMANCE.md) | Whether a register entry is earned by the build |

When this document conflicts with the register, correct this document or supersede the register explicitly.
