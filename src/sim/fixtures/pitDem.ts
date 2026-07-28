/**
 * RichDEM-class Priority-Flood fixture (Barnes-style fill).
 * Expected arrays are the offline oracle for Habitat's `priorityFloodFill`
 * on this DEM — committed so CI does not need the C++ RichDEM binary.
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
