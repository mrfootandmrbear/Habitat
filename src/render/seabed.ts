/**
 * Single source of truth for the seabed outside the sim grid.
 *
 * Why this file exists: the seabed past the map footprint is described in two
 * places that must agree — TerrainMesh builds it as *geometry* (the skirt),
 * and OceanMesh needs the same shape as a *depth* to pick its water colour.
 * They were written independently first, and the result was immediate and
 * obvious on screen: the water said "shallow turquoise" over places the
 * geometry had sunk into a trough, and dark ridges appeared where the colour
 * ramp expected open blue. Two implementations of one surface cannot be kept
 * in sync by intention.
 *
 * This is the same lesson `lightingRig.ts` records for sun direction, where
 * duplicated literals produced near-black water — and the same fix: one
 * definition, consumed by everything that needs it. The TypeScript and GLSL
 * bodies below are deliberately line-for-line equivalent; change them together
 * or not at all.
 */

/** How far past the sim grid the seabed continues, in world units. */
export const SKIRT_REACH = 60;

/**
 * The shelf break has to wander, and it can only wander *outward*.
 *
 * A cold critic measured the first version's break as straight to within 1%
 * over a 420px run, sitting a constant ~10px off the map footprint across the
 * whole frame: the fall-off itself warped nicely, but the *radius at which the
 * fall-off began* was the grid boundary exactly, so the eye still read a
 * straight shelf break. Its verdict: "it reads as a shelf break in the wrong
 * place." In the reference aerials the reef-to-navy boundary is the raggedest
 * line in the picture and never runs parallel to anything.
 *
 * That also removes a gradient kink the critic suspected but could not confirm
 * from a still, and which is real: depth is flat inside the grid and starts
 * climbing the instant `boxDist` goes positive, so the footprint carried a
 * crease in the depth function regardless of how well the fall-off was warped.
 *
 * Outward-only, because inward is not ours to move: inside the grid the seabed
 * is simulation state, and warping the water's depth there would put the colour
 * back out of agreement with the terrain — the exact bug seabed.ts exists to
 * prevent. So the drop is *delayed* by a wandering distance that is never zero,
 * which reads as a broad flat shelf breaking at an irregular line. That is also
 * what the Palau and barrier-reef references actually show.
 */
const SHELF_DELAY_MIN = 4;
const SHELF_DELAY_RANGE = 22;

/** Metres of depth gained per world unit travelled away from the grid. */
export const SKIRT_SLOPE = 0.34;

/** How strongly the warp modulates the fall-off (0 = a plain cone). */
export const SKIRT_WARP_AMOUNT = 0.45;

/**
 * Deterministic, seedless ripple that keeps the seabed's depth contours from
 * tracing the grid's rectangle. Pure function of position — no RNG, nothing
 * that could reach sim determinism (T-001); the geometry side evaluates it
 * once at construction and the water side evaluates it per fragment.
 *
 * Sines rather than hash noise on purpose: this surface is always underwater,
 * it needs to not look man-made rather than to look detailed, and a closed
 * form is far easier to keep identical across two languages than a hash is.
 */
export function skirtWarp(x: number, z: number): number {
  return (
    0.55 * Math.sin(x * 0.11) * Math.cos(z * 0.13) +
    0.3 * Math.sin(x * 0.071 + z * 0.053) +
    0.15 * Math.cos(x * 0.037 - z * 0.041)
  );
}

/**
 * Lower-frequency companion to `skirtWarp`, driving *where* the shelf breaks
 * rather than how steeply it falls. Deliberately long-wavelength (~140–220
 * world units) so the break reads as coastline-scale, not as noise.
 */
export function shelfStartWarp(x: number, z: number): number {
  return (
    0.6 * Math.sin(x * 0.045 + 1.7) * Math.cos(z * 0.038 - 0.9) +
    0.4 * Math.sin((x + z) * 0.028 + 2.3)
  );
}

/** GLSL twin of the functions above. Keep identical, line for line. */
export const SEABED_GLSL = /* glsl */ `
float skirtWarp(vec2 p) {
  return 0.55 * sin(p.x * 0.11) * cos(p.y * 0.13)
       + 0.30 * sin(p.x * 0.071 + p.y * 0.053)
       + 0.15 * cos(p.x * 0.037 - p.y * 0.041);
}

float shelfStartWarp(vec2 p) {
  return 0.6 * sin(p.x * 0.045 + 1.7) * cos(p.y * 0.038 - 0.9)
       + 0.4 * sin((p.x + p.y) * 0.028 + 2.3);
}

float seabedOutside(vec2 p, float boxDist) {
  float delay = ${SHELF_DELAY_MIN.toFixed(4)}
              + ${SHELF_DELAY_RANGE.toFixed(4)} * clamp(0.5 + 0.5 * shelfStartWarp(p), 0.0, 1.0);
  return max(boxDist - delay, 0.0);
}

float seabedDrop(vec2 p, float outside) {
  return outside * ${SKIRT_SLOPE.toFixed(4)}
       * (1.0 + ${SKIRT_WARP_AMOUNT.toFixed(4)} * skirtWarp(p));
}
`;

/**
 * How far past the *shelf break* a point is, given its distance past the grid
 * boundary. Zero across the whole flat shelf, so depth stays continuous with
 * the simulated seabed inside the grid and the only crease in the function sits
 * on the wandering break line.
 */
export function seabedOutside(x: number, z: number, boxDist: number): number {
  const delay =
    SHELF_DELAY_MIN +
    SHELF_DELAY_RANGE * Math.min(1, Math.max(0, 0.5 + 0.5 * shelfStartWarp(x, z)));
  return Math.max(boxDist - delay, 0);
}

/**
 * Depth gained at `outside` world units past the grid boundary, at world XZ
 * (x, z). Zero at the boundary itself, so the skirt meets the terrain edge
 * exactly and the water's depth ramp is continuous across the seam.
 */
export function seabedDrop(x: number, z: number, outside: number): number {
  return outside * SKIRT_SLOPE * (1 + SKIRT_WARP_AMOUNT * skirtWarp(x, z));
}
