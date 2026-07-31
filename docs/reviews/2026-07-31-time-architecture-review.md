# Time-architecture review — what a "sim-year" currently means

> **Date:** 2026-07-31
> **Role:** Advisory measurement of the timescale ladder against [SIMULATION_MODEL.md](../SIMULATION_MODEL.md) §6 and **S-009** / **T-002**
> **Authority:** Does not supersede the [Decision Register](../DECISION_REGISTER.md). Plan lives in [BUILD_GUIDE.md](../BUILD_GUIDE.md) §4.41–§4.43.
> **Trigger:** Developer question — should the time control use real-world increments (real time → centuries) instead of multiples of an uncertain unit?
> **Companion:** [2026-07-31-living-world-review.md](2026-07-31-living-world-review.md) (life). This one is the clock.

---

## 0. Verdict

The question contains its own answer: the unit **is** uncertain, and measurably so. Three findings:

1. **"1×" is already 54,000× real time.** True real time is not merely unavailable — it is unreachable by a factor of 54,000, because the slowest setting is one 15-sim-minute step per 1/60 wall-second.
2. **The bands run at four different speeds relative to the clock.** Daily and seasonal track the calendar; **annual runs 10× fast** and **decadal runs 360× fast**. One displayed sim-year delivers one year of hydrology, ten years of seed-bank dynamics, and **360 years of geomorphology**.
3. **Centuries are not reachable by throughput.** A century costs ~40 minutes of CPU today, ~6.7 minutes with the activity gate [SIMULATION_MODEL §6.2](../SIMULATION_MODEL.md) already specifies but which is **not implemented**. Only a coarser integration floor gets to seconds — and that trades directly against **S-009**'s rate-invariance.

The reframe worth keeping: **you are already running centuries. The clock just doesn't say so.**

---

## 1. What the current controls actually mean

| | |
|---|---|
| 1 event step | 15 sim-minutes = 900 sim-seconds |
| "1×" | 1/60 wall-s per event step → **54,000× real time** |
| "4×" | **216,000×** real time |
| "16×" (effective 5.00× — see living-world review §3) | **270,000×** real time |
| True real time (1 sim-s per wall-s) | **not reachable** — floor is 54,000× |

The multiplier is a ratio against a hidden base nobody can state, which is exactly the complaint. **T-002** is Locked and says *"Exact multipliers are tuning parameters rather than constitutional decisions"* — so replacing them with real-world rates (`1 s/s`, `1 h/s`, `1 day/s`, `1 year/s`, `1 decade/s`) needs **no new candidate**. It is permitted tuning plus presentation.

---

## 2. The bands disagree about how long a year is

[SIMULATION_MODEL §6.1](../SIMULATION_MODEL.md) specifies the ladder. `config.ts` implements a compressed one and says so ("prototype compression"), but the compression factors are **not uniform**:

| Band | Spec period | Config period | Calls per sim-year (spec → config) | Drift |
|---|---|---|---|---|
| daily | 1 day | 1 day | 360 → 360 | — |
| seasonal | 10 days | 10 days | 36 → 36 | — |
| annual | 360 days | **36 days** | 1 → 10 | **10× fast** |
| decadal | 3600 days | **10 days** | 0.1 → 36 | **360× fast** |

Rates are per band call and were never rescaled, so the compression is a straight speed-up of ecological time relative to the displayed clock. Per one displayed sim-year the world actually receives:

- 1 year of hydrology, soil water, ET, vegetation growth
- **10 years** of dispersal and seed-bank dynamics
- **360 years** of soil production, channel incision, hillslope diffusion, and fuel accumulation

**This is not a defect in the constants** — they were evidently tuned empirically until the world felt right, and the probes pass. It is a defect in the *label*. "Sim-day" is not a unit anyone can reason in, and the moment the time control speaks in real-world units, the incoherence becomes visible to the player: *run one year* would advance erosion by three and a half centuries.

It also biases the thesis premise. Nature takes what you built 360× faster than life colonizes it, relative to reality — which is a thumb on the scale of the living-sand-castle balance that nobody chose deliberately.

---

## 3. Cost of deep time, measured

Per-call band cost, 96 × 96 island:

| Band | Cost per call |
|---|---|
| event step (15 sim-min) | **0.68 ms** |
| daily (soil + GW + habitat + vegetation) | **4.53 ms** |
| seasonal (establishment) | **7.53 ms** |
| annual (dispersal) | **3.34 ms** |
| decadal (geomorphology + fuel) | **2.55 ms** |

Note the shape: the daily band costs **6.6× an event step**, and the seasonal band is the most expensive single call in the system. Gating the event band therefore saves less than intuition suggests.

Cost of one sim-year by integration floor:

| Floor | s / sim-year | sim-years / wall-s | A century takes |
|---|---|---|---|
| today (event band always on) | 23.95 | 0.04 | **39.9 min** |
| activity-gated (§6.2, 30 storm-days/yr) | 3.99 | 0.25 | 6.7 min |
| daily floor | 2.03 | 0.49 | 3.4 min |
| seasonal floor | 0.40 | 2.52 | 39.6 s |
| decadal floor | 0.09 | 10.89 | **9.2 s** |

**Centuries per second is not a tuning problem.** Reaching it needs the ladder to *start lower* at high rates — and, separately, needs the calendar fixed, because the compressed decadal schedule fires 36 times a sim-year at 2.55 ms. On the spec calendar that same band fires 0.1 times a sim-year, which is where the remaining two orders of magnitude live. **The honest calendar and deep-time reachability are the same fix, not competing ones.**

---

## 4. The constitutional tension

**S-009** (Current) says durations are *"invariant under the player's chosen time rate."* **T-002** (Locked) says *"Authoritative outcomes do not change with the chosen rate."*

Both are satisfied today only because the rate control does exactly one thing: run the finest band faster. The moment the requested rate selects the integration floor, the same world run at `1 day/s` and at `1 decade/s` produces different numbers — because a decadal-floor century is **ten band calls**, not a century of integration. That is not a bug to engineer around; it is the deal deep time offers.

`band-refinement.test.ts` is the existing harness for exactly this, and it asserts **5–8% convergence**, not bit-identity. So the choice is explicit:

- Keep bit-identical rate invariance → centuries stay at minutes of CPU, forever.
- Allow floor selection → rate becomes part of the run's declared state (saved, replayed, part of the branch/compare contract), and invariance is restated as a **measured tolerance** rather than a hash match.

The second breaks **T-001** replay-from-seed as currently understood, and weakens **P-006** prediction fairness and **C-005** comparison, unless the rate schedule travels with the run. No Locked entry covers this. Filed as **C-025**.

The calendar question is separable and also policy — reconciling it means choosing *which* way: slow the fast bands down (the player waits 360× longer to see erosion, colliding with **C-008** immediacy) or rescale their per-call rates (coarser integration, same wait). Filed as **C-024**.

---

## 5. What can ship without a candidate

| Work | Why unblocked |
|---|---|
| **L6** — real-world rate units on the control | **T-002** Locked: multipliers are explicitly tuning, not constitutional. Presentation + rate values only. |
| **L7** — activity-gated event band | [SIMULATION_MODEL §6.2](../SIMULATION_MODEL.md) already specifies it as the design and argues it is determinism-safe (gate is a pure function of authoritative state). Ships only if a probe shows **hash-identity** gated vs ungated; if it cannot, the residue belongs to **C-025**, not to this slice. |
| **L1** — throughput defect | Already queued; [§6.4](../SIMULATION_MODEL.md) documents the silent-drop as a known defect. |

Blocked pending owner judgment: **L8** deep-time ladder (**C-024** + **C-025**).

---

## 6. Suggested work order

```
L1 throughput defect        (queued — no baseline may move)
L6 real-world rate units    ← answers the developer question directly; may share a PR with L1
L7 activity-gated event band (hash-identity or it does not ship)
     │
L8 deep-time ladder — BLOCKED on C-024 (calendar) + C-025 (floor selection)
```

L6 is worth doing early independently of deep time: it makes the elapsed-time readout honest, which is how **L2** and **L3** — both about ecological timescales — get observed at all.

**Sequencing risk to hold.** L2 and L3 introduce per-band rate constants. If **C-024** later changes band periods, those constants need retuning. Neither slice should wait on an owner-judged Open candidate (§4.0.1), so the risk is accepted and recorded here rather than resolved.

Plan sync: [BUILD_GUIDE.md](../BUILD_GUIDE.md) §4.41–§4.43 and Later stubs; [AGENTS.md](../../AGENTS.md) queue tip.
