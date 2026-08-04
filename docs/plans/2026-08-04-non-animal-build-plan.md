# Non-animal build plan — 2026-08-04

> **Purpose:** finish the non-animal work, then start the animal engine.
> **Order set by owner (2026-08-04):** gauntlet skill → this plan → animals.
> **Authority:** BUILD_GUIDE §4 remains the execution doc; this is a sequencing
> plan over what it already lists, not a new queue.

Animals stay off the tip until Stream A–C are clear. That is BUILD_GUIDE's
standing rule (*"keep nutrients / animals / SWE off the tip"*), not a new one.

---

## Stream A — Resolve the unlanded branches (blocking, decision first)

Nine non-animal branches are unmerged. They are not nine pieces of work: there
is **substantial duplication**, because parallel cloud agents were given
overlapping queues.

**§4.48 habitat/dispersal determinism hygiene is implemented three times:**

| branch | commit | scope |
|---|---|---|
| `claude/build-queue-remaining-8goe2n` | `7ee2ab5` | 77 files, §4.48 only |
| `claude/evolution-simulation-phases-woku8v` | `3bf4fc0` | 71 files, plus L5 + food-web |
| `claude/updating-plants-fvxt0g` | `51c1cd8` | §4.48 + C-029 silhouettes |

These are **not the same patch**: diffing two of them shows 12 source files and
~420 lines differing, including `time-invariance.test.ts` and
`shrubArrival.test.ts`. Landing more than one will conflict badly.

**Decision needed:** pick one §4.48 and drop the others.
**Recommendation:** `evolution-simulation-phases-woku8v` — it carries §4.48
*and* `44a331b` "Ship §4.40 L5 guild competition (**C-023 Locked**)". If that
Lock is sound it unblocks **L5**, which BUILD_GUIDE currently lists as blocked.
That makes it worth two queue items instead of one. Verify the C-023 Lock
before trusting it (see Stream D — Locks are owner-judged).

Remaining non-animal branches, each independent:

- `claude/plant-rendering-report-fnchpu` — plant rendering review, queues Track V (§4.60–§4.63)
- `claude/plant-swaying-direction-2118yl` — §4.60 sway direction fix
- `claude/precipitation-cloud-rendering-hc9hc0` — §4.60 weather presentation (C-020 G6–G9)
- `claude/weather-terrain-backlog-k0il0u` — weather-flash render bug, glacial trough mold, prediction-tool cut
- `cursor/mold-stamps-87ff`, `cursor/guild-cover-light-competition-87ff` — likely superseded siblings of merged PRs #9/#10; confirm then delete
- `cursor/setup-dev-environment-6392` — PR #1 closed unmerged, 108 behind, stale; delete

**Exit condition:** one §4.48 landed, every other branch either merged or
deleted, `git branch -r --no-merged origin/main` down to animal work only.

---

## Stream B — Machine queue (BUILD_GUIDE tip)

Runs after Stream A, in order. These are the only executable machine slices.

1. **§4.48** habitat/dispersal determinism hygiene — Track R tip. Arrives via
   Stream A rather than being written fresh.
2. **L5** guild competition — currently blocked on **C-023**. Unblocked *if*
   the Lock on the evolution branch holds. If it does not, L5 stays blocked and
   this stream ends here.
3. **L8** — blocked on **C-024** / **C-025** (band calendar / deep time), both
   Open and owner-judged. Not startable without Stream D.

Track T (terrain tools) has **no further machine slice** — the C-028 structural
kit shipped through §4.59. What remains there is taste, in Stream D.

---

## Stream C — Visual, against bar v2

Governed by [VISUAL_UPGRADE_NOTE.md](../VISUAL_UPGRADE_NOTE.md) bar v2
(Godus clarity, RCT3 shape). Ranked worst-first; independent of Streams A/B, so
it can run whenever the machine queue is blocked.

1. ~~**Water colour / depth banding**~~ — **Done** 2026-08-04. b/r 1.11 → 1.71.
2. **Palette saturation** (points 4–5). Terrain reads muted grey-brown against a
   bar asking for saturated warm greens and ochres.
3. **De-facet terrain** (point 1). Smooth the cone's polygon faceting and the
   stair-stepped shoreline. Explicitly *not* terracing.
4. **Terrain skirt** — the residual square ocean seam is the terrain mesh's own
   edge showing through translucent water. Geometry fix, not shader; see the
   reverted attempt recorded in `OceanMesh.ts`.
5. **Vegetation type variety** (points 9–10). One repeated cone today; needs
   distinct silhouettes and clustered, non-lattice placement. Overlaps the
   plant-rendering branches in Stream A — land those first.
6. **Sky** (points 5, 12). Renders achromatic, b/r 1.015, no gradient. Real but
   *last*: the camera looks down and sky is barely in frame.

**Prerequisite for critics:** reference images in `docs/reference/`. The folder
and its README exist; the images do not. Until they land, critics score against
prose rather than a side-by-side.

---

## Stream D — Owner-only, blocking (cannot be delegated)

These gate Stream B and all remaining Track T work. Nothing an agent can do.

- **C-014** — audio environment. Beds are live and now *hearable*; the sitting
  is outstanding.
- **C-021** / **C-022** — Slice G machine half is wired; taste sitting outstanding.
- **C-028** — structural kit fully shipped. Question is taste: do molds and the
  duplicator feel like shaping sand or like placing architecture?
- **C-023** — guild competition. Claimed Locked on the evolution branch; needs
  owner confirmation, and **L5 depends on it**.
- **C-024** / **C-025** — band calendar / deep time. **L8 depends on these.**
- **T-001** — determinism. Owner has stated a position (THESIS §2.4); amending
  a Locked entry is a register decision. **Nothing should build against relaxed
  determinism until this is settled.**

Backlog detail: [candidates/owner-lock-batch.md](../candidates/owner-lock-batch.md).

---

## Then, and only then — the animal engine

Not part of this plan; listed so the ordering is explicit.

Architecture already exists as **C-027**
([framing](../candidates/C-027-framing.md), 2026-07-31): animal trait
expression as **population trait-mean fields**, procedural morph plus threshold
swap, gated behind **F-001** undeferring and L2–L5 landing for the plant
substrate. THESIS §2.4 records the owner's direction — classes that evolve on
the engine, niches filled across land/sea/air, foraging coupling the domains.

Two unlanded animal branches wait on this:
`claude/animal-life-planning-slices-ury6vd` (undefers F-001, opens Track A with
A1 herbivore / A2 seed disperser) and
`claude/animal-addition-reconciliation-19zg1l` (separates adaptation from
acclimation).

### The foxel toolchain — answered (owner, 2026-08-04)

Source: [github.com/elliottdehn/foxel](https://github.com/elliottdehn/foxel).

**What it is.** Foxel (FXL) is *"a plain-text language for colored voxel models
— modeling, rigging, and animation in one ASCII file — designed so AI agents
can build and iterate on 3D assets with a human in the loop."* Pure Python,
numpy only. CLI: `render.py` (PNG/APNG previews), `fxl2gltf.py` (exports
`.glb` — mesh + skeleton + baked animations; IK is sampled and baked because
glTF has no IK). Ships a Claude agent skill via plugin marketplace.

**How it fits Habitat.** It is an **offline asset pipeline**, not a runtime
dependency and not a simulation engine — so AGENTS.md's *"do not vendor
third-party sim engines"* does not bite. Python stays a build-time tool; the
app keeps loading `.glb`. That also keeps **T-006** clean: Foxel produces
*render assets only*, and no simulation state ever lives in them.

**The finding that shapes the design.** Foxel has **no morph targets or blend
shapes**. Variation comes from *parametric Python generators* that emit
families of related models — vary the parameters, regenerate, get a new `.glb`.
Worse for blending: marching-cubes output has **no consistent topology across
parameter values**, so you cannot cheaply build glTF morph targets between two
generated variants either.

Consequences, and they are good news for C-027:

- **Continuous runtime morphing is off the table.** Nothing blends one animal
  smoothly into another at runtime.
- **Discrete variant swap is easy and cheap**, which is *exactly* what C-027
  already specifies — *"procedural morph + threshold swap"* driven by
  population trait-mean fields. Foxel supplies a pre-generated ladder of
  variants per role; the trait-mean field picks which rung renders.
- **Determinism is unaffected** (T-001): assets are static build output. No
  runtime generation, no RNG in the render path.

**Open questions before an animal slice depends on it:**

1. **How many rungs per trait axis?** THESIS §2.4's finches want two islands'
   herbivores to *look* different. Discrete swap delivers that only if the
   ladder is fine enough to read as variety rather than as a handful of
   presets. This is a taste call, not a technical one.
2. **New asset pipeline.** Habitat renders everything procedurally today —
   there are no `.glb` assets in the repo at all. Adding them brings build
   size, load timing, and an iPad-Safari budget question (the quality tiers
   exist precisely because of that constraint).
3. ~~**Plugin install is an owner action.**~~ **Installed 2026-08-04** at
   `~/.claude/skills/foxel/SKILL.md` (owner-directed, fetched from the repo's
   `skills/foxel/SKILL.md`). `numpy 2.5.1` installed into the active
   miniconda base env — the skill's one stated prerequisite, which was
   missing. Python 3.13.13.

**Setup shape when the animal phase starts.** The skill clones the toolchain
*into the project* (`git clone https://github.com/elliottdehn/foxel`) and
gitignores `foxel/` as tooling rather than source. So the repo gains a
gitignored Python checkout plus whatever `.glb` output we choose to commit —
worth deciding deliberately which build artifacts are versioned, given
Habitat has none today.

**Also available: a 2D pixel-art mode.** The same language does frame-by-frame
sprite animation (`2d` as the first line, `--scale N` for nearest-neighbour
output, PNG/APNG). Not needed for fauna, but potentially relevant to UI
iconography and to C-026 (CVD-safe palette) work — noted so it is not
rediscovered later.
