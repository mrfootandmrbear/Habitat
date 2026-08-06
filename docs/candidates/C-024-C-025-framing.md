# C-024 / C-025 — Discrete time-skip menu (framing)

**Status:** Locked / implemented (2026-08-06) — see [L8-composition.md](../slices/L8-composition.md)
**Date:** 2026-07-31 (framing); 2026-08-06 (Lock + L8 ship)
**Gate:** ~~L8 blocked~~ → **L8 Done** ([BUILD_GUIDE §4.43](../BUILD_GUIDE.md)).

Authority: register **C-024**, **C-025**; [DECISION_CONFORMANCE §3](../DECISION_CONFORMANCE.md) criteria (quoted in full there); [time-architecture-review.md](../reviews/2026-07-31-time-architecture-review.md).

---

## Why this document exists

C-025's criterion already says the right thing in the abstract — *"the rate schedule is part of the run's declared state"* — but left open what a "schedule" is and whether it's the same control as the L6 rate dial. A developer conversation (2026-07-31) landed on a concrete answer for both, plus a worked scenario worth keeping as the target case. This is not a Lock. It does not weaken either criterion.

---

## The mechanism: skip is a discrete action, not a continuous floor

Earlier framing (this doc's own first draft) treated floor selection as something a continuous rate dial does underneath the player — push the multiplier high enough and the ladder quietly starts skipping bands. That's wrong for a reason worth recording: it leaves the player stuck at coarse fidelity until they remember to dial back down, which directly fights the thing the whole loop is for — inhabiting the place, dropping in on the animals whenever something's happening ([THESIS §4–5](../THESIS.md)).

**Leading direction instead:** a fixed menu of skip durations —

```
1 day · 1 month · 6 months · 1 year · 5 years · 10 years · 25 years · 50 years · 100 years · 1000 years
```

Invoking one is a single bounded action: the sim advances by exactly that much, at whatever integration floor that duration warrants, then hands control back at the **existing L6 continuous rate** ([§4.41](../BUILD_GUIDE.md), Done). The player is never "in" a coarse mode — they asked for a jump, they got a jump, they're back to inhabiting.

**This is a separate control surface from L6, not a mode of it.** L6's rate ladder (`1 s/s` … `1 week/s`) is untouched — same bands, same fidelity, just faster, exactly as shipped. C-025's criterion refers to *the skip action*, not the L6 dial. Worth stating explicitly because the criterion's own wording ("the player's requested time rate") could otherwise be read either way.

---

## What "declared state" concretely is

C-025 asks for the rate schedule to travel with the run so replay (**T-001**), save (**T-003**), branch-compare (**C-005**), and prediction fairness (**P-006**) stay well-defined. A continuous rate history is an awkward thing to log and compare. A skip menu makes the schedule a **sparse ordered list**: `[(t₀, skip: 10y, floor: annual), (t₁, skip: 1000y, floor: decadal), ...]` — the same shape as any other logged player action, and trivially small next to a full event-step trace.

---

## Proposed floor binding (owner taste, not a number)

Drawn directly from the review's measured cost table ([§3](../reviews/2026-07-31-time-architecture-review.md)):

| Skip duration | Candidate floor | Basis |
|---|---|---|
| 1 day, 1 month | event / daily | short enough that full fidelity is cheap and the player likely wants to watch it anyway |
| 6 months, 1 year | daily / seasonal | crosses at most a couple of seasonal boundaries |
| 5, 10, 25 years | annual | dispersal/seed-bank timescale — the band C-024 already flags as running 10× fast |
| 50, 100, 1000 years | decadal | only floor that makes centuries affordable (9.2 s/century vs. 39.9 min) |

This table is a starting hypothesis, not a proposal to Lock — where the boundaries actually sit is exactly the owner-taste question C-025's criterion assigns to the owner ("whether a coarser world at high rate is still recognisably the same world").

---

## Worked scenario (target case, not a promise)

**Shape an island, set the forces, skip ahead. What moved in — if anything?**

Owner note (2026-08-06): the skip should feel like a **surprise** when animals (and plant life) have arrived or adapted to the ecosystem you made — only when the place supports them. That is the sand-castle payoff: build the form, jump time, discover what colonized it. Empty is an honest fail when conditions do not suit (**C-007**).

A colder variant still exercises the same instrument: run warm until something establishes, switch Heat cold, skip 1000 years — retreat and replacement should read as earned by the dials, not as a wipe.

This scenario exercises the skip menu, L2, L3, L4, Track A populations/traits (**C-027**), and the temperature limiting-factor together — the natural acceptance case for deep time, the way the 20-second clip plays for D-007.

What's real today: the Heat dial (`climate.airTemperature`, shipped under **C-020**) already drives precipitation phase and a genuine Liebig limiting-factor term — [`factorTemperature`](../../src/sim/habitat/temperatureComposition.ts) hard-zeroes suitability below a guild's kill threshold regardless of moisture/light. Cold is not cosmetic; it's a real constraint today. Herbivore trait fields (**A1**) can drift under pressure when the annual/`populations` band runs.

What the scenario still exposes as unfinished:
- Long skips (50–1000y) bind the **decadal** floor and skip finer life bands during the jump — so the surprise-population reveal does not yet fire on those presets ([L8-composition](../slices/L8-composition.md) owner note).
- L2 / L3 / HSI curve work that the original framing listed as unfinished has since shipped; residual risk is floor binding, not missing mortality/seed rain.

One honest, out-of-scope observation: sea level, tide, and wind are independent dials from Heat under the current force model ([ISLAND_FORCES.md](../ISLAND_FORCES.md)) — a 1000-year cold snap does not cascade into a sea-level drop the way real glaciation would, unless the player separately drags that dial too. Recorded here as a noticed gap, **not** proposed as a new candidate.

---

## Relationship to C-024 sequencing

The skip menu does **not** strictly require C-024 resolved first — each preset can bind to a floor empirically, the way the table above already does. But C-025's criterion requires *"the HUD names the active floor"*, and that honesty commitment recurs one level up: if a "1000 years" skip runs on a decadal floor whose per-call rate is still the uncorrected 360×-fast schedule C-024 is about, the menu's own duration label would be lying about what just happened — the identical failure L6 surfaced for the continuous dial, one layer higher. The composition doc for whichever slice implements this must state, per floor, which of C-024's two reconciliations (slow the band vs. rescale its rate) is in effect — even if the answer is "unresolved, tolerance widened accordingly."

---

## Hard bans

- **Floor selection outside declared/replayable state.** Silently letting skip actions bypass save/branch state is the failure DECISION_CONFORMANCE names as worst-case for C-025 — it breaks T-001/P-006/C-005 without any test going red.
- **Reimplementing L7's gate.** L7 (activity-gated event band) ships independently on hash-identity ([§4.42](../BUILD_GUIDE.md)). The skip menu's floors are additive to that, not a second mechanism doing the same job.
- **Inventing per-floor convergence behavior** beyond what `band-refinement.test.ts`'s existing 5–8% tolerance family validates, without first extending that harness to cover the new floor-pairs.

---

## Owner half (later)

C-024 / C-025 Lock sittings discharged 2026-08-06 (compressed calendar + skip menu). Remaining taste:

1. **Surprise population** — after shaping and skipping, did anything arrive or adapt that felt earned by the place (owner note 2026-08-06)? Batches with Track A visibility.
2. **Floor table** — do the duration↔floor bindings still feel right once life advances on long skips?

---

## Tip placement

**Implemented** as [BUILD_GUIDE §4.43](../BUILD_GUIDE.md) / [L8-composition.md](../slices/L8-composition.md). Residual owner taste (surprise population on long skips) batches with Track A visibility; long-skip life-band follow-on is named in the composition deferred list.
