# What the reference images govern — owner-ruled 2026-08-04

> **Read this before critiquing anything.** The gauntlet-loop skill's Step 1
> warns that a critic scoring against a mis-specified bar produces confidently
> wrong direction — worse than no critique, because it is an authoritative
> instruction to make the work worse. That has already happened once on this
> project (a naturalism rubric was used to judge stylized-clarity work, and the
> critic's headline finding was the exact opposite of the art direction).
>
> So: the owner was asked what these references are references *for*. The answer
> is recorded below. **They do not govern terrain shape.**

## The rulings

**Governs (owner-selected, all four):**

1. **Palette & biome readability** — saturated warm greens, ochres, tans;
   adjacent zones unmistakably different materials.
2. **Water look & transparency** — turquoise depth banding *and* seeing the
   submerged terrain through the water. Owner, verbatim: *"I like how the water
   is transparent to see the underwater world."*
3. **Vegetation — type variety & clustering** — distinct silhouettes in
   irregular clumps, not one repeated form on a lattice.
4. **Camera framing** — every reference looks down steeply and fills the frame
   with world.

**Does NOT govern: terrain shape.** Asked directly whether the contour banding
visible in three of the four Godus-lineage references now governs shape, the
owner answered **"still smooth"** and supplied the Planet Coaster reference to
make the point. The 2026-08-04 no-terracing correction **stands**. Terrain is a
smooth continuous heightfield. Do not implement terraces, and do not read the
Godus step contours as a target.

## The images

### `planet-coaster-terrain.png` — Planet Coaster 2 (on disk, fetched 2026-08-04)

Owner-supplied as the shape authority: *"spiritual successors to RCT3."*

- **Shape:** smooth, continuous, rounded rock landforms. Sculpted-looking
  bluffs and overhangs with soft rounded crests. **No terracing, no faceting,
  no stair-stepping anywhere.** This is the terrain-shape bar.
- **Palette:** warm sandy tan rock against saturated mid-green grass. Clearly
  chromatic, never near-neutral grey.
- **Material zones:** rock/grass boundaries follow the landform and are
  legible at a glance, but they are *soft-edged* here, not banded.
- **Framing:** camera pitched down roughly 40–50°. Sky is a thin strip across
  the very top, well under 10% of frame, and it is a deep saturated blue —
  not grey.
- **Vegetation:** several distinct species silhouettes (palms, conifers,
  broadleaf, low shrubs, flowering clumps) in irregular clusters.

### The stylized set — `godus-*` (owner-supplied, on disk 2026-08-04)

Godus is the closest existing execution of Habitat's seed idea (THESIS §1).
**Everything in this set governs colour, water and vegetation — none of it
governs shape.** All four show terracing; ignore it.

- **`godus-biome-cliffs.webp`** — the strongest single image for **biome
  readability**. Reads as five unmistakably different materials in one frame:
  ochre-rust cliff, pale cream rock shelf, saturated yellow-green meadow, dark
  conifer stand, pale sand shore. Each zone is a different *hue*, not a
  different brightness of the same hue. Note also the water: pale turquoise
  shallow → mid cyan → deep navy, with the drowned landform plainly visible
  through the shallow band.
- **`godus-island-topdown.webp`** — the clearest **water transparency** case,
  and the frame is ~100% world with no sky at all. The submerged shelf reads as
  *shape* through the water, and — the important part for the terrain skirt —
  the depth bands are irregular and follow the drowned coastline everywhere.
  Nothing is straight.
- **`godus-terraced-lagoon.jpg`** — vivid turquoise pools against olive-green
  grass and pale sand. Best example of **shallow water being the most saturated
  thing in frame**, which is the exact point the C0 critic scored as failing.
- **`godus-wide-island.jpg`** — saturated yellow-green hills, ochre-red rock
  upland, pale beach, turquoise sea, with a thin band of light blue sky. Useful
  as a whole-composition reference.

### The natural set — `natural-*` (owner-supplied, on disk 2026-08-04)

Owner framing: *"natural images of islands."* These are photographs, so they
are **not** a style target — Habitat is stylized, not photoreal. What they
establish is what the stylization must stay *true to*: how real water actually
bands by depth, and how a coastline actually reads from above.

- **`natural-palau-aerial-wide.jpg`**, **`natural-palau-aerial-close.jpg`** —
  aerial reef-and-island. The single best answer to "what should the shelf
  look like": shallow reef is bright saturated turquoise, deep water is
  saturated navy, and the boundary is a ragged organic edge following
  bathymetry. Submerged reef structure is legible through the water for a long
  way out, not just at the shore.
- **`natural-barrier-reef-aerial.jpg`** — pure bathymetry study. Every value
  from pale cyan to deep blue, all of it chromatic, boundaries entirely
  irregular.
- **`natural-antarctic-king-george.webp`** — the cold-island ruling. Owner:
  *"this is how islands look when cold, the water seems to be pretty similar to
  tropical look just with more white."* Water keeps the full saturated
  turquoise-to-navy ramp; the difference from tropical is **white snow, not
  grey desaturation**. Habitat accumulates snow in-sim, so this rules directly
  on what a cold biome should look like.
- **`natural-canada-forest-islands.webp`** — temperate/boreal analogue: dense
  dark conifer, pale grey rock shore, deep blue-green water. The vegetation
  here is *clustered to the landform*, thick on top and thinning at the rock
  edge — relevant to vegetation placement, not just species mix.
- **`natural-mauritius-lagoon.webp`** — the pale-sand shoreline band that bar
  v2 point 8 asks for, clearly visible as a distinct bright ring between beach
  and turquoise lagoon.
- **`natural-seychelles-boulders.jpg`** — smooth rounded granite against clear
  shallow water. Corroborates the Planet Coaster shape ruling from nature:
  landforms are smooth and rounded, never stepped.
- **`natural-rock-islet-clear-shallows.jpg`** — small islet with vegetation
  capping rock, and clear water showing the submerged base.
- **`natural-split-view-lagoon-reef.jpg`**, **`natural-split-view-reef-dusk.jpg`**
  — half-above/half-below waterline shots. These are the literal illustration
  of the owner's *"transparent to see the underwater world"* requirement: what
  is under the surface is a whole populated world, not a tint.

### Licensing — why these files are not committed

These are third-party images: watermarked stock photography (Alamy, Getty),
press screenshots (TheGamer), and copyrighted game art (Godus / 22cans). This
repo is **public**, so they are gitignored — using them locally as a quality
bar is ordinary reference use, republishing them from a public repo is not, and
git history makes that hard to walk back.

Nothing about the workflow depends on committing them. Critics read the files
off disk; this file records what each one shows and what it governs, and *this
file* is what survives in the repo and in a fresh clone.

### The cold-island ruling — `natural-antarctic-king-george.webp`

Called out separately from the list above because it is a *ruling*, not just a
picture. Owner's words:
*"this is how islands look when cold, the water seems to be pretty similar to
tropical look just with more white."*

This is a **ruling about biome colour**, and it is more specific than anything
in bar v2. Habitat accumulates snow in-sim, and an earlier round measured the
island going white in run-forward captures. The instinct would be to let a cold
world go grey and desaturated. **That is wrong.** What the photo shows:

- **Water keeps the full tropical depth ramp.** Vivid saturated turquoise over
  the shallow shelf, grading to deep saturated navy-teal. It is *not* grey, not
  desaturated, and not muted by being cold.
- **The difference from tropical is white, not grey** — snow on the land and
  pale ice-scoured shallows, sitting against water that is still highly
  chromatic.
- **Bathymetry reads clearly through the shallow water.** Submerged reefs and
  the drowned continuation of the landform are plainly visible as shape, not
  just as a colour tint. This is the clearest illustration yet of the owner's
  transparency requirement.
- **Depth boundaries are irregular and curving**, following the drowned
  landform. Nothing in the frame is straight.
- Land is dark rock plus white snow; the sky is a pale, low-contrast, minor
  band at the very top.

**It independently corroborates the C0 critic's two hardest findings** (see the
Phase C section of `../VISUAL_UPGRADE_NOTE.md`): that shallow water must be the
*most* saturated water in frame rather than the least, and that the shelf-to-deep
transition must follow bathymetry rather than trace a rectangle.

## Which references go to which critic

A critic shown fifteen images grades against an average of them. Each piece's
critic gets only the ones that bear on its piece, plus this file:

| piece | references to attach |
|---|---|
| terrain skirt / bathymetry | `natural-palau-aerial-*`, `natural-barrier-reef-aerial`, `godus-island-topdown` |
| water colour & transparency | `godus-terraced-lagoon`, `natural-split-view-*`, `natural-mauritius-lagoon`, `natural-antarctic-king-george` |
| palette & biome readability | `godus-biome-cliffs`, `godus-wide-island`, `natural-canada-forest-islands` |
| terrain shape / de-facet | `planet-coaster-terrain`, `natural-seychelles-boulders` — **and the anti-terracing guard in the brief** |
| vegetation variety & clustering | `godus-biome-cliffs`, `natural-canada-forest-islands`, `natural-rock-islet-clear-shallows` |
| camera framing | `godus-island-topdown`, `godus-wide-island`, `planet-coaster-terrain` |

Every brief must carry the shape ruling, because two thirds of the stylized set
shows terracing and a critic that infers the bar from the images alone will ask
for it. A previous critic on this project did exactly that, and it cost a round.

## In a fresh clone the images will be missing

They are gitignored (see above), so a new checkout has this file but no
pictures. That is the intended trade. If a round needs the real side-by-side
again, ask the owner to re-supply them into this folder under the same
filenames — the names in the table above are the contract, and nothing else
needs to change.
