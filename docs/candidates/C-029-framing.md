# C-029 — Adaptive radiation as regional ecomorph divergence (framing)

**Status:** Framing only (Open — do not implement as Locked)
**Date:** 2026-08-05
**Gate:** Behind Locked **C-027** and **A1**+**A2** ([BUILD_GUIDE §4.66](../BUILD_GUIDE.md)/[§4.67](../BUILD_GUIDE.md)) shipping. Nothing to diverge with one role and no dispersal-reach concept yet. This is architecture for later Track A work, not a request to start it.

Authority: register **C-027** (Locked), **W-003**, **N-003**, **N-004**, **N-005**, **D-001**, **T-001**, **C-003** (Open), **C-011**, **C-019** (Locked, island biogeography); [C-027-framing.md](C-027-framing.md) §3 (trait-mean fields, this document's substrate).

---

## Why this document exists

An owner design brief pointed at [adaptive radiation](https://en.wikipedia.org/wiki/Adaptive_radiation) as a real biological phenomenon worth grounding animal design in: Darwin's finch beaks, Caribbean *Anolis* ecomorphs, African Great Lakes cichlid trophic morphs, Hawaiian silverswords and honeycreepers. The mechanism, stated plainly — ecological opportunity (released competition or predation, or colonization of a patchy/isolated habitat) relaxes stabilizing selection and lets a population diverge along different resource axes, producing forms with recent common ancestry, a real phenotype–environment correlation, and measurable performance advantage in their own patch.

That is a real, well-documented pattern, and it is tempting to read it as "let the game evolve new species." It cannot mean that here. **W-003** (fixed curated species pool, Locked) and **N-003** (no species collection game, Locked) are unconditional: Habitat does not invent taxa. What this document asks instead is the part of the mechanism that *is* available under those constraints — regional divergence in **expression**, not identity — and names exactly how little new machinery it costs given what **C-027** already ships.

## 1. What transfers, and what doesn't

- **Transfers: phenotype–environment correlation across isolated patches.** This is the actual, checkable content of adaptive radiation — a population's form tracks its local resource environment, and separated populations of the same lineage read as visibly different because their environments are different. **C-027** §3.3 already produces this at the single-cell level (a trait-mean field with a spatial gradient). This document is the claim that *sustained, patch-scale* divergence — not just a smooth gradient, but two clusters reading as distinct regional forms — is the same mechanism at a coarser grain, not a new one.
- **Does not transfer: speciation.** Real adaptive radiation ends in new species with reproductive isolation. Habitat's fixed-pool architecture (**W-003**) makes that architecturally impossible without a redesign this document does not propose. The frame (which species a role resolves to) stays exactly as fixed as **C-027** already requires; only the expression (trait-mean, and now which regional cluster's threshold ladder applies) is free-running — the identical frame/expression split **C-027** draws for a single population, extended to multiple co-existing regional expressions of the one population.
- **Does not transfer: a triggered "event."** The Galápagos finches did not radiate on a schedule or a button press. **D-001** (nature is the protagonist) and **C-003** (Open — no stochastic forcing) both point the same direction: divergence must be a continuous, deterministic function of sustained state (isolation + released pressure), read off the world the same way every other Habitat mechanism is, never an authored moment.

## 2. Proposed model

### 2.1 What's already there

Three pieces this document depends on and does not re-derive:

- **A spatial trait-mean field** (**C-027** §3.2/§3.3) — already per-cell, already tracks local pressure.
- **Patch isolation math** (**C-019**, Locked) — MacArthur–Wilson area/distance shape, already computes how cut-off a piece of habitat is from the rest.
- **A dispersal-reach concept** — **A2** (seed disperser, [BUILD_GUIDE §4.67](../BUILD_GUIDE.md)) is the first role to carry a home-range/dispersal-kernel notion; regional divergence needs some notion of "how far does this population's own mixing actually reach" to distinguish genuine isolation from a population that just hasn't been sampled everywhere yet.

### 2.2 What's actually new: a second, space-keyed swap axis

**C-027** §3.4 already has a discrete-swap mechanism (threshold trait → rung of a pre-baked ladder, hysteretic latch). Today that ladder is chosen by one condition: where the pressure field sits relative to a fixed threshold, the same everywhere on the island. The only new piece this document proposes is letting the ladder selection also read **which regional cluster** a cell belongs to — a derived field, not simulated state of its own, computed from the same isolation/connectivity math **C-019** already runs: cluster cells whose effective dispersal distance to each other (via the role's own reach, §2.1) is short, and whose distance to other clusters is long relative to that reach.

```
regionalCluster(cell) = connectedComponent(cell, dispersalReach(role), isolation(C-019))
```

Two populations in different clusters may then carry different **local** `pressureOptimum` targets and, if their clusters have been isolated long enough, different points on the discrete ladder — reading as named regional morphs (a "highland form" and a "lowland form" of the same herbivore role) rather than one smeared average. This is not a new update law: it is §3.3's existing law, evaluated per-cluster instead of per-island, and §3.4's existing swap mechanism, keyed on an additional field.

### 2.3 The trigger condition — matching the science, not decorating with it

Divergence should only become *visible* (i.e., clusters allowed to diverge past a legibility threshold) under genuine ecological opportunity, the actual precondition the literature names — not merely "the population happens to be split across two patches":

- **Isolation**: `regionalCluster`'s own connectivity measure must be low enough, for long enough (an accumulated-isolation-time state, not an instantaneous check — a population reconnected last season should not have "already speciated").
- **Released pressure**: at least one cluster shows measurably reduced competitive or predation pressure relative to the population's typical range (reads **ES-007**'s existing capacity/predation terms once a food web exists for the role in question — for roles without predators yet, competitive release from **C-027** §4.2's capacity term is the available proxy).

Both conditions are already-computed or already-specified quantities; this document adds no new sensor, only a compound gate on ones that exist.

## Hard bans

- **No new taxonomic species.** Every diverged cluster still resolves through **W-003**'s fixed pool; a "highland ecomorph" is a display name for a trait-mean cluster of the same role, never a second entry in the species table (**N-003**).
- **No stochastic radiation event** while **C-003** is Open — divergence is the continuous consequence of sustained isolation and released pressure (§2.3), never a triggered spawn, roll, or timer.
- **No player-initiated radiation.** No button, no siting verb causes this — it emerges from the state the player's sculpting and force choices produced, or it does not happen (**D-001**).
- **Inherits every C-027 hard ban** — no individual identity, no fixed-K, no adaptation without survival cost, no unbounded drift, no bare threshold, no Foxel-as-runtime-dependency.
- **Does not reopen C-027 §3.3's single-population law.** This document adds a spatial key to an existing selection, not a second update law.

## Relationship to queued / blocked work

| Entry | Relationship |
|---|---|
| **C-027** (Locked) | Substrate this document extends — spatial trait-mean field, discrete-swap mechanism, hysteretic latch. Not reopened, only given a second selection key. |
| **A1 / A2** (Track A, [BUILD_GUIDE §4.66](../BUILD_GUIDE.md)/[§4.67](../BUILD_GUIDE.md)) | Gate. A1 proves the single-population field; A2 introduces the dispersal-reach concept §2.1 needs to define isolation for a real role. |
| **C-019** (island biogeography, Locked) | Source of the isolation math §2.2 reuses rather than reinventing. |
| **ES-007** (food webs, Locked, partially built via **C-027** §4) | Supplies the "released pressure" half of §2.3's trigger once a food web exists for the role; until then, competitive release from **C-027** §4.2's capacity term is the available proxy. |

## Owner half (later)

Not a playtest ask now — framing only. When the tip reaches this work:

1. Confirm the two-condition trigger (§2.3 — isolation + released pressure) is the right bar, or that one condition alone should suffice.
2. Confirm regional ecomorphs should get player-visible names ("highland form") or should stay a purely visual read with no UI label — a naming layer risks reading as a collection mechanic (**N-003**) if handled carelessly.
3. Once A1+A2 ship and a real island with genuine habitat patchiness exists: walk the worked scenario (a herbivore population split across an isolated highland and lowland region, diverging visibly over deep time) and judge whether it reads as an earned "this place made two different animals" story or as an arbitrary game effect — the same **C-011**/D-007-spirited test **C-027**'s own owner half already applies.

## Tip placement

Framing only — **do not implement**. Not tip. Waits on Locked **C-027** (done, this session) and **A1**+**A2** shipping via Track A.
