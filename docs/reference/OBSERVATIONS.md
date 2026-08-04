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

### The four conversation-attached references (not yet on disk — see below)

Described here so a critic has *something* concrete until the files land.

1. **Painterly stylized island (top-down).** Layered ochre/rust cliff strata,
   saturated yellow-green meadow, deep conifers, turquoise shallows against
   near-black deep water. The strongest example of **biome readability** —
   every zone is a different hue, not a different shade. Frame is ~100% world;
   no sky at all.
2. **Godus.** Terraced contour steps (**shape — does not govern**), olive-green
   grass, pale sand shore, vivid turquoise pools and sea. Water is transparent
   over pale sand. Palms and rounded shrubs, clustered irregularly.
3. **Godus, wider shot.** Saturated yellow-green hills, ochre-red rock uplands,
   pale sand beach, turquoise sea. Small strip of light blue sky at top.
4. **Stylized island map (top-down).** The clearest **water transparency**
   example: pale turquoise shallows shading to teal deep, with the submerged
   landform plainly visible through the water. Distinct biome patches —
   yellow-green, olive, tan, brown upland.

### Cold-island aerial photograph (owner-supplied 2026-08-04, not yet on disk)

A real aerial photo of a snow-covered polar island group. Owner's words:
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

## Getting the four attachments onto disk

They arrived as chat attachments, which live in the conversation, not the
filesystem — and **a subagent critic cannot see conversation attachments**, only
files. Until they are saved here, critics score piece 2–5 against the written
descriptions above plus bar v2, which is weaker than a side-by-side.

To fix, save each image into this folder, e.g.:

    docs/reference/godus-terraces.png
    docs/reference/godus-wide.png
    docs/reference/painterly-island.png
    docs/reference/stylized-island-map.png

Then add a one-line note per image here saying *why* it was picked. Per the
folder README, that note is worth more than the image alone — it tells a critic
what to look at instead of leaving it to guess.
