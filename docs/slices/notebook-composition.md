# Field Notebook UI — U-006 MVP contract

**Status:** Done (machine) — Lock still reviewer (U-006 criterion)  
**Register:** U-006 Current; U-004 Locked; T-006 Locked. No new `Process` (D-007).

## Why this exists

U-006 needs a bounded causal explanation layer that answers after the player has noticed something (U-004), without charts, next-move advice, or confident invented causes. This slice ships the MVP **contract** and a minimal observer chrome seeded from existing notebook strings.

## Supported questions (MVP)

| Id | Player-facing label | What it returns |
|---|---|---|
| `what-changed` | What is evident now? | Chronology-style sentences for event kinds whose contributing fields are visible in the current snapshot |
| `what-contributed` | What might have contributed? | Same sentences, prefixed with uncertainty language and naming the traced fields |

No other questions in MVP. No “what should I do next?” Guaranteed advice is banned.

## Event vocabulary (MVP)

| Kind | Chronology sense | Traceable when |
|---|---|---|
| `flooded` | Water stands on the land | Mean / max `water.surfaceDepth` above ε |
| `seeping` | Ground keeps drinking after the surface dries | Surface near-dry and `soil.moisture` or `groundwater.storage` high |
| `burned` | Fire left a scar | Fraction of cells with `fire.scar` > 0 |
| `colonized` | Life took a foothold | Mean `veg.biomass.herb` above ε with moisture present |
| `recovered` | Cover returned | Mean `veg.cover` above ε |
| `limited` | A factor is holding life back | Modal `habitat.limitingFactor` on land cells (moisture / depth / groundwater / salinity) |

Deferred (named so they are not invented quietly): `fragmented` — needs a connectivity / patch metric not yet exposed as a notebook condition.

## Scale selection

| Scale | Meaning in MVP |
|---|---|
| `preserve` | Whole-grid means / fractions (default for answers) |
| `patch` | Reserved — not selected by chrome yet; entries may declare it when a future ROI exists |
| `cell` | Deferred — cutaway / pick is inspection (T-005), not notebook chronology |

Every emitted answer states its scale explicitly so later maturity can narrow without changing the question set.

## Uncertainty language

Allowed hedges (must appear on `what-contributed`):

- “Likely — …”
- “Where we can see …”
- “The simulation shows …; that does not prove a single cause.”

Forbidden:

- “Because X caused Y.”
- Template prose with no `traces[]` entry.
- Field names invented outside the registry.

## Corpus rule (U-006 criterion)

Every sentence the notebook can emit is in `src/notebook/corpus.ts` with:

1. `event` from the vocabulary above  
2. `scale`  
3. `traces[]` — registry field ids + human evidence note  
4. `visibleWhen(snapshot)` — predicate over a **frozen** field snapshot  

A reviewer sampling the emitted corpus must be able to locate each sentence’s state. Seeds that cannot yet be gated by a field stay out of the emit path (composition may quote them as history only).

## Observer contract

- `notebookObserver.reads`: listed field ids; `writes: []`
- Snapshots only — no live buffer alias (T-006)
- No `Math.random` / sim RNG (T-001)
- Chrome is optional and starts closed (U-004)

## Notebook seed (this slice)

The ground still held water where the hollow stayed wet.
