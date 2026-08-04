import { describe, expect, it } from "vitest";
import { SEABED_TUNING, seabedForget, seabedOutside, seabedDrop } from "./seabed";

/**
 * These pin the guarantees behind a bug that reached the deployed build.
 *
 * The seabed skirt and the ocean's depth lookup both sample the elevation field
 * past the sim grid, where ClampToEdge returns the boundary cell repeated
 * outward. A raised cell on the boundary row was therefore extruded into a
 * ridge of dry land pointing out to sea, with a matching pale streak in the
 * water. It was reported from a screenshot, which is an expensive way to find
 * out; the invariants are cheap to assert directly.
 */
describe("seabedForget", () => {
  const SEA = 0;
  const { EDGE_FORGET, BASIN_DEPTH, SUBMERGE_FADE, SUBMERGE_MARGIN } = SEABED_TUNING;

  it("leaves the boundary itself untouched, so the skirt seam stays exact", () => {
    for (const bed of [-9, -3, -0.2, 0, 1.5, 4]) {
      expect(seabedForget(bed, SEA, 0)).toBeCloseTo(bed, 10);
    }
  });

  it("never raises the seabed — deep edges stay deep", () => {
    for (const bed of [-40, -12, -5, -1, 0, 3]) {
      for (let d = 0; d <= 80; d += 1.5) {
        expect(seabedForget(bed, SEA, d)).toBeLessThanOrEqual(bed + 1e-9);
      }
    }
  });

  it("puts everything outside the footprint under water — the reported bug", () => {
    // A berm well above sea level sitting on the boundary row is the exact
    // case from the screenshot: it must not extrude as land.
    for (const bed of [0.1, 1, 2.5, 6, 15]) {
      for (let d = SUBMERGE_FADE; d <= 80; d += 1.5) {
        expect(seabedForget(bed, SEA, d)).toBeLessThanOrEqual(SEA - SUBMERGE_MARGIN + 1e-9);
      }
    }
  });

  it("forgets per-cell edge detail once past the forget distance", () => {
    // Two very different boundary cells must converge, or their difference
    // streaks outward as a visible ridge or channel.
    const basin = SEA - BASIN_DEPTH;
    for (let d = EDGE_FORGET; d <= 80; d += 2) {
      const shallow = seabedForget(-0.1, SEA, d);
      const raised = seabedForget(3, SEA, d);
      expect(shallow).toBeLessThanOrEqual(basin + 1e-9);
      expect(raised).toBeLessThanOrEqual(basin + 1e-9);
      expect(Math.abs(shallow - raised)).toBeLessThan(1e-9);
    }
  });

  it("is monotonic in distance, so no band re-emerges further out", () => {
    for (const bed of [-8, -2, 0.5, 4]) {
      let previous = Infinity;
      for (let d = 0; d <= 60; d += 0.5) {
        const value = seabedForget(bed, SEA, d);
        expect(value).toBeLessThanOrEqual(previous + 1e-9);
        previous = value;
      }
    }
  });

  it("tracks sea level rather than assuming a zero datum", () => {
    for (const sea of [-3, 0, 7.5]) {
      expect(seabedForget(sea + 2, sea, 40)).toBeLessThanOrEqual(sea - SUBMERGE_MARGIN + 1e-9);
    }
  });
});

describe("seabedOutside", () => {
  it("is zero across the flat shelf, so depth stays continuous with the sim grid", () => {
    // The shelf break is delayed by a wandering distance that is never zero,
    // which is what stops it tracing the map footprint.
    for (let x = -40; x <= 40; x += 7) {
      for (let z = -40; z <= 40; z += 7) {
        expect(seabedOutside(x, z, 0)).toBe(0);
        expect(seabedOutside(x, z, 3)).toBe(0);
      }
    }
  });

  it("never begins the drop exactly at the boundary", () => {
    // If the delay could reach zero the break would coincide with the
    // footprint somewhere, and a straight segment is what a critic caught.
    for (let x = -80; x <= 80; x += 3) {
      for (let z = -80; z <= 80; z += 3) {
        expect(seabedOutside(x, z, 0.5)).toBe(0);
      }
    }
  });

  it("does eventually fall away", () => {
    let anyPositive = false;
    for (let x = -80; x <= 80; x += 5) {
      if (seabedOutside(x, 0, 60) > 0) anyPositive = true;
    }
    expect(anyPositive).toBe(true);
  });
});

describe("seabedDrop", () => {
  it("is exactly zero at the break, so geometry and water agree at the seam", () => {
    for (let x = -60; x <= 60; x += 9) {
      for (let z = -60; z <= 60; z += 9) {
        expect(seabedDrop(x, z, 0)).toBe(0);
      }
    }
  });

  it("always descends — the warp modulates the fall, it cannot invert it", () => {
    for (let x = -60; x <= 60; x += 9) {
      for (let z = -60; z <= 60; z += 9) {
        expect(seabedDrop(x, z, 25)).toBeGreaterThan(0);
      }
    }
  });
});
