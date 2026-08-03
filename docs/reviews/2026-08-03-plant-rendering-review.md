# Plant rendering review — six guilds, one cone

> **Date:** 2026-08-03
> **Role:** Advisory review of first-occupant plant presentation, triggered by an owner screenshot read against increasingly legible terrain/water/atmosphere: "plants all read as thin pyramids."
> **Authority:** Does not supersede the [Decision Register](../DECISION_REGISTER.md). Findings and a menu of options only — **not queued into [BUILD_GUIDE.md](../BUILD_GUIDE.md)**, pending the owner's read of §6.
> **Trigger:** Owner screenshot (2026-08-02, in-game "Full" HUD, week-scale rate, 6y242d elapsed, seed 42) and an explicit fork the owner named: keep investing in plant rendering, or move on to animals next.
> **Scope:** `src/render/OccupantMesh.ts`, `src/ui/occupantEncoding.ts`, `src/ui/occupantSway.ts`. Register entries ART-001/ART-002/ART-003, T-001, T-006, T-007, C-011, D-007. Candidate C-027 (animal trait-expression framing) and register entry F-001 for §6.

---

## 0. Verdict

The screenshot's read is correct and has a single, precise cause: **every plant on the island — herb, strand, binder, marsh, shrub, and crust — is the same four-sided `ConeGeometry`, scaled and tinted, with exactly one instance drawn per grid cell** (`OccupantMesh.ts:50`, `:113–171`). Six ecologically distinct growth forms (a splash mat, a sand-binder mat, a cryptogam crust, marsh turf, herb shoots, woody shrub) share one silhouette; only color and height/width scale differ. That is what a "thin pyramid" is. The fix is entirely presentation-side (T-006-safe: no new sim state, no new `Process`, no D-007 clip-gate obligation) and does not touch `occupantEncoding.ts`'s color ramps, which were just re-verified under §4.52.

Separately: the owner's fork between plants and animals is narrower than it looks. Animal rendering (C-027) is explicitly gated behind **F-001** being undeferred and **L2–L5** landing for the plant substrate, with **L5** itself still blocked on the Open **C-023**. Section 6 argues plant rendering is the only one of the two forks actually buildable this week.

---

## 1. What's on screen today

Reading `OccupantMesh.ts` top to bottom:

- **One geometry, shared by all six guilds:** `new THREE.ConeGeometry(0.12, 0.55, 4)` (`:50`) — radius 0.12, height 0.55, 4 radial segments. Four segments is deliberately low-poly, but it also means the geometry *is*, literally, a triangular pyramid.
- **One `InstancedMesh`,** capacity `width × height` = 9,216 at the current 96×96 grid, `flatShading: true`, single white `MeshStandardMaterial` tinted per-instance via `instanceColor` (`:52–67`).
- **Exactly one instance per occupied cell.** `updateFrom` computes `shootVisibility` for all six guild biomass fields, then picks the single highest-visibility guild as `guild`/`tintBiomass` (`:113–171`) — an arg-max, not a composite. A shrub cell with real herb biomass underneath it draws *only* the shrub cone; the herb is invisible.
- **Per-instance variation is affine only:** position (cell center + terrain height), `scaleXZ`/`scaleY` (continuous, from visibility and a guild `heightBoost` — shrub 1.35×, crust 0.45×, others 1×), yaw (hashed from `x*17+z*31`, `:178`), and an L4 wind-lean tilt. Every one of those is a transform of the identical cone — no instance ever has a different *shape* from any other.
- **Color is the only categorical signal** between guilds (`occupantEncoding.ts`'s six BARE→hue lerps). Three of those six functions' own doc-comments already call the guild a **"mat"** — `STRAND` ("splash mats"), `BINDER` ("sand-binder mats"), and by extension `CRUST` (cryptogam crust) — while the geometry rendering them is a spike.

Net effect: from any camera distance the island reads as a dense field of identical thin spikes in six colors, because it is one.

---

## 2. Root cause, stated precisely

Two independent problems compound into the "thin pyramids" read:

**(a) Geometry problem.** One four-sided cone is asked to represent both a low flattened mat (strand/binder/crust) and an upright grass-like form (herb/marsh) and a woody canopy (shrub). Nothing in the geometry construction reads `guild` — only `heightBoost` does, and only as a uniform scalar. A mat guild scaled thin and short is still a small cone, not a mat.

**(b) Selection problem.** `updateFrom`'s arg-max over six guilds discards five of them per cell. Mixed stands — which the HSI/dispersal model can and does produce — never composite visually. This under-represents exactly the layered structure a real habitat has (canopy over understory over ground cover).

Neither is a defect in the simulation; `WorldState` already carries all six biomass fields with the resolution needed to fix both. This is squarely a T-006 presentation gap, not a sim gap — which is also why it can ship without touching anything the vegetation-habitat or living-world reviews flagged.

---

## 3. Proposed changes — cheapest first

### 1. Per-guild geometry silhouette *(small, high ratio of visual return to risk)*

Replace the one shared cone with six small procedural geometries — still plain `THREE.BufferGeometry` composites (cones, spheres, thin prisms/planes), still flat-shaded, still inside the T-007 Three.js-only stack, no imported/vendored assets — one `InstancedMesh` per guild instead of one shared mesh (six draw calls instead of one; negligible at this instance count):

| Guild | Current | Proposed silhouette |
|---|---|---|
| herb | spike | a small crossed-blade cluster (2–3 thin planes/prisms fused into one geometry) — the standard low-poly grass trick |
| strand | spike | flattened wide, short dome/disc — matches the "splash mat" the code already calls it |
| binder | spike | flattened wide, short dome/disc — "sand-binder mat" |
| crust | spike (0.45× height) | near-flat mat, wider than tall — a crust is a surface, not a plant |
| marsh | spike | a taller, narrower reed/blade cluster than herb, matches marsh turf's real growth form |
| shrub | spike (1.35× height) | two-lobe canopy (stacked sphere or double cone) so it silhouettes as a canopy, not a spearpoint |

This is a single-file change to the geometry construction in `OccupantMesh`'s constructor; every existing scale/color/sway/yaw hook is untouched. It is the highest-leverage item on this list.

### 2. Per-cell multi-instance clustering *(moderate win, moderate cost)*

Draw 2–4 jittered sub-instances per occupied cell instead of exactly one, each at reduced scale and offset within the cell footprint by a hash of cell index — the same deterministic-salt pattern already used for yaw (`x*17+z*31`), so no new RNG and no new sim dependency. A cell reads as a small stand instead of a lone spike, which is the single biggest lever for the "alive" read the owner is chasing, since groundcover density reads as clusters, not isolated points.

Cost: instance count per guild-mesh rises from ≤9,216 toward ≤~35,000 at a 4× cap — trivial for `InstancedMesh`, but worth the existing Tier-M discipline ("Performance is acceptable" — step/frame timing at target grid size, VERIFICATION_POLICY §3) before/after, same as any other slice.

### 3. Composite the runner-up guild, not just the winner *(addresses §2b directly)*

Instead of drawing only the arg-max guild, draw the dominant guild at full weight plus the second-highest guild (if its `shootVisibility` clears a floor) at reduced scale — a shrub cell with a real herb understory shows both. This is the one item that isn't purely a render change: `OccupantMesh` needs to read a second field per cell instead of just the max. It still only reads biomass fields it already reads — no new `WorldState` field, no new `Process`, still T-006-safe.

### 4. Distance-based silhouette LOD *(nice-to-have, only after 1–3 ship)*

At the default camera framing (`Scene.ts` starts around `(32, 28, 36)` against a 48-unit world extent — the whole island is usually in frame at once) individual blade/mat detail from item 1 won't resolve past a few units anyway. Collapsing far cells to a cheaper impostor is worth measuring once 1–3 are in, not before — premature LOD here would be optimizing a cost that hasn't been profiled yet.

---

## 4. What this deliberately does not do

- **No new sim state, no new `Process`, no new `WorldState` field.** Every item above reads fields `OccupantMesh` already reads. No D-007 clip-gate obligation follows from any of it.
- **No vendored asset packs or imported tree/plant models.** Geometry stays procedural `THREE.BufferGeometry`, consistent with T-007's Three.js-only stack. This is explicitly not a push toward photorealism — ART-001 ("scientific impressionism") asks for stylized, legible, authored emphasis, not asset fidelity. The goal is six distinct low-poly silhouettes, not six detailed models.
- **No per-frame stochastic jitter.** Any clustering/composite offset must be a stable hash of cell index, matching the existing yaw pattern — not a fresh random draw each frame, which would make the same seed render differently run to run and undermine screenshots/playtests as a shared reference.
- **No color/encoding change.** `occupantEncoding.ts`'s six hues and the sqrt-biomass ramp stay exactly as tuned; this is a shape problem, not a Tier-P color-delta problem.

---

## 5. Suggested order

```
1. Per-guild geometry silhouette   — bounded, single-file, no logic change
        │
2. Per-cell multi-instance clustering — Tier-M perf check at 96×96 before/after
        │
3. Composite runner-up guild       — one additional field read per cell
        │
4. Distance LOD                    — only if profiling after 1–3 shows it's needed
```

Item 1 alone is shippable in one session and already answers most of the screenshot's complaint. Items 2–3 compound it; item 4 is speculative until the first three are measured.

---

## 6. Weighing this now: plant rendering vs. animals

The owner framed this as a genuine fork — spend the next slice on plants, or move on to animals. It's worth checking that fork against what the register already says, because the answer changes the trade-off:

- **F-001 is Deferred**, and AGENTS.md is explicit: *"Keep nutrients / animals / SWE / wet-sand / freeze off the tip."* The 2026-07-31 living-world review is on record that "the instinct is animals" was the wrong next move at the time.
- **C-027** — the framing document that already exists for animal rendering, and that would extend this exact `OccupantMesh`/`InstancedMesh` pattern to a seventh-through-thirteenth set of guilds — states its own gate in its header: *"F-001 remains Deferred; L2 (local seed rain), L3 (mortality as a rate), L4 (biotic motion), and L5 (guild competition, itself blocked on C-023) land for the plant substrate first. This is architecture for when animal work is unblocked, not a request to start it."*
- **L5 is still blocked on C-023**, an Open, owner-judged candidate that hasn't been Locked. So even setting F-001 aside, animal rendering's own prerequisite chain isn't clear yet.

Put plainly: **"go work on animals instead" is not a same-cost alternative available this week.** Taking it would first require the owner to undefer F-001 — a governance decision bigger than a rendering choice — and for L5/C-023 to resolve. Whether or not plant rendering ships next, animals does not become buildable in the next slice either way.

Meanwhile the plant-rendering gap in §§1–2 is real and in scope on its own terms, independent of the animal question:

- **ART-002** ("beauty encourages stewardship") and **ART-003** ("ecological change is visible") both under-deliver quietly when six ecologically distinct growth forms render as one repeated spike — that is exactly the "starting to look alive, but..." gap the screenshot names.
- It is presentation-only (T-006), scoped to one file's geometry construction plus one optional additional field read, needs no new `Process` (no D-007 obligation), and does not reopen any Open candidate.
- Item 1 by itself is a bounded, low-risk, single-session change — nothing on the animal side is currently in that shape; C-027 is explicitly "framing only," not an implementation slice.

**Recommendation:** ship §3 item 1 now (and likely item 2 right behind it). It's the fork that's actually buildable today without a prior owner governance decision, and it directly answers the observation that prompted this review. Revisit animals only when undeferring F-001 is put to the owner as its own decision — not folded into this one by default because plant rendering happened to look unglamorous first.

---

## 7. One open taste call

Not a playtest ask under VERIFICATION_POLICY §4 (no new `Process`, no D-007 gate) — but §3 has a real depth-of-investment axis worth naming rather than guessing at in code: item 1 alone (distinct silhouettes, still one per cell) versus going all the way to item 3 (composited multi-guild stands) is a preference about how much "stand" density the island should read at, which is a Tier-O call (VERIFICATION_POLICY §2, "does it feel like a place worth tending?" — ART-001), not a Tier-M/P one. Flagging it here so whoever picks this up doesn't have to guess how far to go before checking back in.
