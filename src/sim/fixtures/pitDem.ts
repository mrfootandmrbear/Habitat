/**
 * Priority-Flood fixtures (H-003, Slice 4b).
 *
 * Expected arrays are derived by hand from the published Priority-Flood
 * definition (Barnes, Lehman & Mulla 2014; NATURAL_PROCESS_MATH §10):
 * filled[c] = max(elev[c], min over paths c→open edge of the path maximum).
 * RichDEM itself has never been run against these — they are algorithm-derived,
 * not tool-generated, and the docs should not call them a RichDEM oracle.
 *
 * FIXTURE_* is the single-pit smoke case: every interior cell fills to the one
 * rim elevation. It cannot distinguish a correct fill from several wrong ones,
 * because the answer is "everything becomes 4" no matter how you get there.
 *
 * NESTED_* is the discriminating case — see its comment below.
 */
export const FIXTURE_W = 5;
export const FIXTURE_H = 5;

/** 5×5 DEM: rim 4, interior 2, deep pit at center (2,2) → 0. */
export const FIXTURE_ELEVATION = new Float32Array([
  4, 4, 4, 4, 4,
  4, 2, 2, 2, 4,
  4, 2, 0, 2, 4,
  4, 2, 2, 2, 4,
  4, 4, 4, 4, 4,
]);

/**
 * After priority-flood from open edges: pit and interior fill to rim spill (4).
 * Edge cells keep raw elevation.
 */
export const FIXTURE_FILLED = new Float32Array([
  4, 4, 4, 4, 4,
  4, 4, 4, 4, 4,
  4, 4, 4, 4, 4,
  4, 4, 4, 4, 4,
  4, 4, 4, 4, 4,
]);

export const FIXTURE_DEPRESSION = new Float32Array([
  0, 0, 0, 0, 0,
  0, 2, 2, 2, 0,
  0, 2, 4, 2, 0,
  0, 2, 2, 2, 0,
  0, 0, 0, 0, 0,
]);

/* ------------------------------------------------------------------ *
 * Nested basin: a depression inside a depression, with one low outlet.
 *
 * 7×7. Rim is 10 with a single notch of 5 at the top edge (3,0). Inside the
 * rim, an outer basin floor of 4 surrounds a ridge of 7, which encloses a
 * pit of 1 at the centre. The ridge encloses the pit under 8-connectivity,
 * so there is no diagonal leak.
 *
 * The correct answer is *two different fill levels*:
 *   outer basin (4) → 5   — it escapes over the notch
 *   inner pit    (1) → 7   — it must first rise over its own ridge, which is
 *                            HIGHER than the level the outer basin settles at
 *
 * That inversion is what makes this fixture worth having. It fails loudly for
 * an implementation that fills every depression to one global spill elevation
 * (pit would read 5), that fills to the rim maximum (10), that ignores the
 * notch and uses the dominant rim height, or that resolves nested depressions
 * in the wrong order. The single-pit fixture above catches none of those.
 * ------------------------------------------------------------------ */

export const NESTED_W = 7;
export const NESTED_H = 7;

export const NESTED_ELEVATION = new Float32Array([
  10, 10, 10,  5, 10, 10, 10,
  10,  4,  4,  4,  4,  4, 10,
  10,  4,  7,  7,  7,  4, 10,
  10,  4,  7,  1,  7,  4, 10,
  10,  4,  7,  7,  7,  4, 10,
  10,  4,  4,  4,  4,  4, 10,
  10, 10, 10, 10, 10, 10, 10,
]);

/** Edge cells keep raw elevation; outer basin → 5 (notch); pit → 7 (ridge). */
export const NESTED_FILLED = new Float32Array([
  10, 10, 10,  5, 10, 10, 10,
  10,  5,  5,  5,  5,  5, 10,
  10,  5,  7,  7,  7,  5, 10,
  10,  5,  7,  7,  7,  5, 10,
  10,  5,  7,  7,  7,  5, 10,
  10,  5,  5,  5,  5,  5, 10,
  10, 10, 10, 10, 10, 10, 10,
]);

/** filled − raw. Ridge and rim are 0; outer basin 1; pit 6. */
export const NESTED_DEPRESSION = new Float32Array([
  0, 0, 0, 0, 0, 0, 0,
  0, 1, 1, 1, 1, 1, 0,
  0, 1, 0, 0, 0, 1, 0,
  0, 1, 0, 6, 0, 1, 0,
  0, 1, 0, 0, 0, 1, 0,
  0, 1, 1, 1, 1, 1, 0,
  0, 0, 0, 0, 0, 0, 0,
]);
