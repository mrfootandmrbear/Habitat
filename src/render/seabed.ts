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

/** GLSL twin of `skirtWarp` + `seabedDrop`. Keep identical to the TS above. */
export const SEABED_GLSL = /* glsl */ `
float skirtWarp(vec2 p) {
  return 0.55 * sin(p.x * 0.11) * cos(p.y * 0.13)
       + 0.30 * sin(p.x * 0.071 + p.y * 0.053)
       + 0.15 * cos(p.x * 0.037 - p.y * 0.041);
}

float seabedDrop(vec2 p, float outside) {
  return outside * ${SKIRT_SLOPE.toFixed(4)}
       * (1.0 + ${SKIRT_WARP_AMOUNT.toFixed(4)} * skirtWarp(p));
}
`;

/**
 * Depth gained at `outside` world units past the grid boundary, at world XZ
 * (x, z). Zero at the boundary itself, so the skirt meets the terrain edge
 * exactly and the water's depth ramp is continuous across the seam.
 */
export function seabedDrop(x: number, z: number, outside: number): number {
  return outside * SKIRT_SLOPE * (1 + SKIRT_WARP_AMOUNT * skirtWarp(x, z));
}
