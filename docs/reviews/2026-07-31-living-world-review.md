# Living-world review — why the biota does not read as alive

> **Date:** 2026-07-31
> **Role:** Advisory measurement of the biological half of the sim against [THESIS.md](../THESIS.md) §2.1 / §5
> **Authority:** Does not supersede the [Decision Register](../DECISION_REGISTER.md). Plan lives in [BUILD_GUIDE.md](../BUILD_GUIDE.md) §4.36–§4.40.
> **Trigger:** Owner asked how to make the world feel alive after eleven nature slices shipped clean and the world still reads as a diorama.
> **Companion:** [2026-07-30-sim-gap-review.md](2026-07-30-sim-gap-review.md), which inventoried *physics*. This one measures *life*.

---

## 0. Verdict

The gap review was right that the physics mostly exists. It did not look at the **shape of the biological model**, and the shape is the problem.

Three defects, all inside existing Processes, all measured below:

1. **Nothing that establishes ever produces seed.** Propagule pressure is a static function of distance-to-shore. There is no spreading front, no post-fire recolonization, and 15.6% of the default island can never vegetate.
2. **Death is a clamp, not a rate.** Biomass snaps to `biomassMax × HSI` in one band, so vegetation is a *render of current HSI* rather than a state with history. This is why **S-007** / **S-008** have no biological substrate.
3. **The 16× button runs at 5×** and silently discards the difference, throttling the deep-time payoff the whole loop routes through.

None of the three needs a new `Process`, a new guild, animals, or nutrients. **D-007's clip gate does not apply to any of them.** Fixing them is worth more than the last six guild slices combined.

---

## 1. Nothing that establishes ever produces seed

`WorldState.runDispersalStep` writes seed pressure as a pure function of shore distance:

```
writeCell(i, overseasSeedPressure(dist[i], strength, λ))
```

`veg.biomass.*` is read *only* for HSI facilitation (shrub reads herb cover, crust reads shade). It is never a propagule source. Every seed in the world arrives from off-map, forever, on an exponential kernel with λ = 4 cells (40 m).

Default island (`generateIsland`, seed 42, sea `mid`): **3562 land cells, max shore distance 32 cells**, `S_elig` = 0.512.

| Establishment probability at **perfect** HSI | Land cells | Share |
|---|---|---|
| ≥ 10% — colonizes within a session | 1855 | 52.1% |
| 1–10% — decades of sim time | 1153 | 32.4% |
| < 1% — effectively never | 554 | 15.6% |

Time to full herb biomass at HSI = 1.0 (seasonal band = 10 sim-days):

| Distance inland | Bands | Sim-years | Wall-clock at max speed |
|---|---|---|---|
| 0 cells | 9 | 0.3 | 30 s |
| 8 cells (80 m) | 36 | 1.0 | 2 min |
| 16 cells (160 m) | 240 | 6.7 | 13 min |
| 24 cells (240 m) | 1746 | 48.5 | 93 min |
| 40 cells | 95106 | 2642 | 84 h |

**Why this matters to the thesis.** A meadow that establishes never expands. Burn the interior and the only seed source is still the shoreline, so it does not return on any playable timescale — there is no refugium, because refugia require local sources. A player who builds a perfect wet hollow 25 cells inland gets nothing, while the suitability layer reads 1.0 and offers no reason. That is precisely the failure **C-011** exists to prevent: being wrong resolves into *that's just how this game works*, not into *oh — nothing could get there*.

**This is a shortfall against Locked C-007, not a departure from it.** C-007's own implications say: *"Dispersal pressure is a real path — occupancy is never copied from HSI alone."* Today dispersal is a static field, not a path.

---

## 2. Death is a clamp, not a rate

`nextHerbBiomass` returns `min(capacity, biomass + growth)` with `capacity = biomassMax × HSI`. An HSI collapse from 1.0 → 0.2:

```
band 0: biomass 2.500   ← HSI drops
band 1: biomass 0.500   ← already at the new capacity
band 2: biomass 0.500
```

Loss is instantaneous; only recovery has a rate. The asymmetry is backwards from real ecology, where loss is fast but finite and recovery is slow.

**Consequences.** No drought the meadow rides out and then loses. No standing dead. No lag between salt arriving and the marsh going. All ecological memory in the world lives in `soil.depth`, `soil.salinity`, and `soil.porosity` — **none in the biota**. This is a larger hole under **S-007** (hysteresis is fundamental) and **S-008** (hysteresis must be legible) than the missing contaminant field **C-010** was filed for, and it is far cheaper to close.

---

## 3. The 16× button runs at 5×

`config.maxStepsPerFrame = 5` caps throughput below what 16× demands, and `SimClock.tick` **discards** the excess rather than deferring it — the accumulator is drained by `excess` after the counter increments, so the time is lost, not owed.

Measured on the default island:

| | Result |
|---|---|
| Event step cost | **0.774 ms** → 1292 steps/s single-thread |
| Affordable at 60fps (16.7 ms budget) | **22 steps/frame** |
| `config.maxStepsPerFrame` | **5** |

| Button | Steps run in 10 wall-s | Effective rate | Discarded |
|---|---|---|---|
| 1× | 600 / 600 | 1.00× | 0 |
| 4× | 2400 / 2400 | 4.00× | 0 |
| 16× | **3000 / 9600** | **5.00×** | **6600** |

At effective 5×, the world runs 3.13 sim-days per wall-second — **one sim-year ≈ 115 wall-seconds**. The cap was sized for a much heavier step and never revisited. The owner feedback recorded in **C-004** ("wanting time rates beyond 16× is product feedback") is partly this defect, not a feature request.

---

## 4. What this is *not*

The instinct is animals. Against it: **F-001** is Deferred, **ES-007** has no substrate, and a food web layered on vegetation that cannot spread or die properly would inherit both defects. Nutrients are correctly parked at Nature P2. Neither belongs on the tip, and neither is why the world reads as still.

The one genuinely *new* policy question the review surfaced is **guild competition**: six guilds stack additively into `physicalCover` and no guild ever displaces another. Shrub gets facilitation from herb, crust gets shaded, but nothing loses. Filed as **C-023** — Open, implement nothing under it until judged.

---

## 5. Suggested work order

```
L1 time throughput (defect; smallest; makes L2/L3 observable)
     │
     ├── L2 local seed rain   ← the single biggest change to what the world is
     ├── L3 mortality as a rate
     ├── L4 biotic motion (presentation; moves the D-007 clip)
     └── L5 guild competition — gated on owner judgment of C-023
```

L1 first because L2 and L3 play out over sim-decades and verifying them by eye at effective 5× is the expensive path. L1–L4 register no new `Process` and need no new candidate; each cites Locked entries it is implementing rather than inventing.

Plan sync: [BUILD_GUIDE.md](../BUILD_GUIDE.md) §4.36–§4.40 and Later stubs; [AGENTS.md](../../AGENTS.md) queue tip.
