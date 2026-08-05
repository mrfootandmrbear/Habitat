# Animal-design protocol — low-token Foxel morph cards

> **Status:** Working protocol
> **Role:** Orchestrate parallel low-cost subagent study of animal **archetype silhouette / trait-rung design** for Track A — not a species catalog, not a shipped-asset pipeline
> **Authority:** Advisory. Cards are design proposals; binding architecture is [C-027-framing.md](../candidates/C-027-framing.md) (**Locked**) and, once reviewed, [C-029-framing.md](../candidates/C-029-framing.md) (Open). Accepted cards feed a Track A slice's render-side checklist directly (e.g. [BUILD_GUIDE §4.66](../BUILD_GUIDE.md)); nothing here builds `src/` code or runs the Foxel toolchain.

**Companion files.** [CARD_SCHEMA.md](CARD_SCHEMA.md) · cards in [`cards/`](cards/). Sibling protocol: [docs/nature-study/PROTOCOL.md](../nature-study/PROTOCOL.md) — this document is that mechanism, retargeted from plant guild/factor cards to animal trait/rung cards. Read that file first if this one is unclear; the two are deliberately the same shape.

---

## Why this exists

Every Track A slice needs, per trait, a real-world referent (**C-011**) and — for the render half — either a bone-scale mapping (continuous trait) or a rung ladder (discrete trait) before it can author actual Foxel assets ([C-027-framing.md](../candidates/C-027-framing.md) §3.4/§3.5). Designing that is a small, bounded, low-stakes task repeated once per (archetype × trait) pair — exactly the shape [nature-study](../nature-study/PROTOCOL.md) already proved works as a cheap parallel lane rather than expensive inline work by the Track A cloud agent itself. Owner direction: hand this off to a low-cost agent routine, not the same agent building the sim architecture.

**Animal-design items** here means:

- **Morph cards** — one per (archetype role × trait × pressure axis), naming a real-world referent, a rung count, and which render mechanism applies (bone-scale vs. Foxel rung-swap)

Not: shipped `.fxl`/`.glb` assets (a card is a design artifact; turning an accepted card into a real asset is a separate, higher-cost step that reads `foxel/LANG.md` and actually runs the toolchain), new taxonomic species (**W-003**/**N-003**), or sim-field/Process work (that's Track A's own scope, [CLOUD_AGENT_PIPELINE.md](../CLOUD_AGENT_PIPELINE.md) §3).

**Prior art in-repo.** [C-027-framing.md](../candidates/C-027-framing.md) §3.5 (herbivore worked example — the three cards this lane's first wave should produce: `limbLength`, `insulation`, `webbing`). Foxel toolchain research: [VISUAL_UPGRADE_NOTE.md](../VISUAL_UPGRADE_NOTE.md) (2026-08-04) — offline Python, `.fxl` → `render.py` (PNG/APNG preview) → `fxl2gltf.py` (`.glb`), no blend shapes/morph targets, parametric generators for variant families.

---

## Habitat ban block (paste into every Task prompt)

Copy this block verbatim (≤15 lines of constraints):

```
Habitat bans for this study:
- W-003 / N-003: no new taxonomic species — every card names a trait/rung of an
  already-resolved role's species, never a new animal
- T-001 / T-006: no individual creature identity, backstory, or name — this is a
  population trait field, not a character
- Foxel has no blend shapes/morph targets: continuous traits are skeleton
  bone-scale at runtime; discrete traits are a rung swap between pre-baked
  variants. Do not propose runtime vertex-morphing between two Foxel exports.
- C-011 / N-004: every trait needs a real-world referent a person already
  reasons about — no invented "because the game says so" transformation
- C-003 Open: no stochastic/random trait assignment
- T-007: Foxel is a build-time-only asset pipeline; do not propose it as a
  runtime dependency or vendor its Python engine into src/
- Do not invent Locked policy; cite Locked C-027-framing.md or Open
  C-029-framing.md only
- Output ONE card per CARD_SCHEMA; max ~200 words; no essay; no .fxl file
```

**Herbivore worked example excerpt** (paste when useful — the first wave's three targets, already named in C-027-framing.md §3.5):

| Trait | Pressure | Kind |
|---|---|---|
| `limbLength` | Terrain slope/ruggedness | Continuous — bone-scale |
| `insulation` | `factorTemperature` (seasonal, reversible — plasticity) | Continuous — bone-scale |
| `webbing` | `f_inundation` (annual, hysteretic — adaptation) | Discrete — rung swap, two-value latch |

---

## Token caps

| Limit | Rule |
|---|---|
| One lane, one card | e.g. "herbivore limbLength × terrain ruggedness" — never a whole archetype in one card |
| Input | Ban block + ≤40 lines Habitat context (the relevant C-027-framing.md excerpt) + 1–3 real-world referent titles — **no full papers, no repo crawls, no Foxel toolchain reads** |
| Output | Exactly one card filling [CARD_SCHEMA.md](CARD_SCHEMA.md); ~150–250 tokens; reject free-form essays or actual `.fxl` content |
| Parallelism | 3–5 Tasks per wave; parent merges cards — does not re-synthesize literature |
| Honesty | Grade evidence: `abstract` · `recalled` · `Habitat-already` — never claim a Foxel render was actually produced |

Cold-session success: Wave N+1 launches from this file + CARD_SCHEMA.md + one exemplar card — without re-reading C-027-framing.md or the Foxel toolchain docs in full.

---

## The one lane: morph cards

One archetype role × one trait × one pressure axis. Card must name:

- Real-world referent species/analogue (mandatory — **C-011**)
- Rung count + one-line description per rung (discrete traits), or the bone/axis being scaled and its plausible range (continuous traits)
- Which mechanism applies — bone-scale or Foxel rung-swap — never "morph target," which Foxel cannot produce
- **Player bet** — one sentence, no numbers (**C-011**)

First-wave targets (C-027-framing.md §3.5, already named, ready to card): herbivore × `limbLength`, herbivore × `insulation`, herbivore × `webbing`. Second wave, once A2 lands a referent search for seed disperser traits ([BUILD_GUIDE §4.67](../BUILD_GUIDE.md)): seed disperser trait cards, if a real-world referent is found — an honest zero-trait card is an acceptable output if none is.

**Design-artifact-only rule.** A card proposes rungs and a referent; it does not contain `.fxl` source, does not run `render.py` or `fxl2gltf.py`, and does not require the Foxel toolchain to be installed in the agent's environment. Turning an accepted card into a real asset is a separate step, done once per accepted card, not once per wave.
