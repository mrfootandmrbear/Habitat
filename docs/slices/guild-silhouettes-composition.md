# Slice — Distinct per-guild occupant silhouettes composition (C-029)

**Cited:** C-029 Locked; T-006; ART-001 (scientific impressionism); §4.48 (habitat/dispersal determinism hygiene — supplies the per-guild HSI this slice consumes).

## What was actually wrong

`OccupantMesh` (L4) instanced one shared `ConeGeometry(0.12, 0.55, 4)` for all six vegetation guilds. Color and a per-guild height multiplier (shrub 1.35×, crust 0.45×) were the only signal that six different life-forms were present — a herb shoot and a shrub were the same shape at different sizes. L4's own composition doc also flagged a related, separate defect as deferred: occupant *vitality* (how much a shoot leans, per L4's wind-sway law) read `habitat.suitability` — herb's own daily HSI — for every guild, because no per-guild HSI field existed yet to read instead.

## The fix

**Six new procedural silhouettes** (`src/render/guildGeometry.ts`), each a merged low-poly `THREE.BufferGeometry` built from primitives, base sitting exactly at `y=0`:

| Guild | Form | Built from |
|---|---|---|
| herb | sparse three-blade tuft | 3 thin cones, fanned, slight lean |
| strand | low rounded splash mound | squashed hemisphere (mounded, not flat — kept apart from crust) |
| binder | tighter, more splayed tussock | 5 thin cones, denser fan, steeper lean |
| marsh | tall thin reed pair | 2 tall narrow cylinders, minimal splay |
| shrub | the only branching form | trunk cylinder + 3 angled canopy cones |
| crust | flat ground-hugging patch | a short, wide, squat cylinder |

`OccupantMesh` now owns one `THREE.InstancedMesh` per guild (grouped under `object`, still a plain `Object3D` so `main.ts`'s `scene.add(occupantMesh.object)` is unchanged) instead of a single shared mesh — `InstancedMesh` requires every instance in a batch to share one geometry, so six distinct shapes means six batches, not one. The existing per-cell dominant-guild selection, biomass-driven `scaleXZ`/`scaleY`, color ramp, and wind-sway math are otherwise untouched; each cell's write is now routed to the winning guild's mesh instead of always the same one. The old per-guild `heightBoost` multiplier is removed — each shape's own proportions now carry that signal (marsh is already tall and thin, crust already flat), so keeping the multiplier on top would have double-applied it.

**Bonus fix, same code region:** `livingVitality` now reads each dominant guild's own `veg.hsi.*` field (`getStrandHsi`, `getBinderHsi`, `getMarshHsi`, `getShrubHsi`, `getCrustHsi` — all newly available from §4.48) instead of herb's `habitat.suitability` for every guild. Herb is unchanged (it always read the correct field). This closes the deferral L4's composition doc named: "today cell `habitat.suitability` proxies all guilds on a cell — honest for herb, coarse for others."

## Owner decision (this session)

Two questions, asked and answered directly rather than filed as an async candidate sitting: (1) ambition — distinct simple procedural shapes, not a push of the existing color/scale-only encoding, and not fully custom sculpted models; (2) growth — shape stays static per guild, scaled/tinted by biomass exactly as it was before (no per-instance morphing between a young and mature form of the same guild). Recorded as **C-029, Locked**.

## Ship gate

`src/render/guildGeometry.test.ts` — Tier-P, no WebGL context needed (geometry math runs on the CPU):
- All six guild shapes exist, have real geometry, and sit base-at-`y=0` (never embeds below the terrain plane).
- Every pair of guild silhouettes clears a real aspect-ratio (height/width) gap of at least 0.2 — the geometric analogue of `colorDistance`'s color-delta floor. This caught a real problem during development: strand's first draft (a nearly-flat dome) sat only 0.086 apart from crust's aspect ratio, under the floor; fixed by mounding strand higher (radius 0.24→0.18, squash 0.35→0.75) so it reads as a rounded hummock rather than a second flat disc.
- Crust is the flattest silhouette and marsh the tallest-and-thinnest, by construction, not by inspection.
- Shrub has strictly more vertices than every other guild (it's the only branching, multi-lobe form).
- Geometry construction is deterministic (rebuilding a guild's shape twice reproduces identical bounds).

Visual confirmation: the six shapes were rendered through the actual production `guildGeometry.ts` module in a real headless Chromium session (dev server, real Three.js/WebGL), screenshotted, and visually inspected — six clearly distinct, correctly grounded silhouettes, matching the design table above. The full app (`index.html` / `main.ts`) was also loaded and driven for several minutes across multiple sessions with the refactored `OccupantMesh.updateFrom()` running every animation frame; zero console or page errors.

## What moved

**Nothing authoritative.** No probe baseline, no `GOLDEN_*` hash, no registered field — pure presentation (T-006).

## Deferred

- No shape morphing between growth stages (owner-decided this session, not just unscoped) — a shape's *scale* and *color* still carry biomass, its *form* does not change as it grows.
- Multiple guilds stacking as separate visible shoots in the same cell (today, as before, the dominant guild alone draws) — a bigger rendering/clutter question, not asked for.
- Strand/crust silhouette distinction is presently carried mostly by height (aspect ratio); a future pass could add surface texture (small bumps on strand, a rougher/mottled crust material) if the CVD-safe palette work (**C-026**) ever touches this same code.
