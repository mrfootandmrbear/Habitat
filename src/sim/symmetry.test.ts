import { describe, expect, it } from "vitest";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";

/** Mirror terrain across x for §8.6 symmetry. */
function mirrorX(src: Grid2D): Grid2D {
  const out = new Grid2D(src.width, src.height);
  for (let z = 0; z < src.height; z++) {
    for (let x = 0; x < src.width; x++) {
      out.set(src.width - 1 - x, z, src.get(x, z));
    }
  }
  return out;
}

describe("symmetry invariant (§8.6)", () => {
  it("mirrored terrain + rain → mirrored water depths", () => {
    const w = 24;
    const h = 16;
    const base = new Grid2D(w, h);
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        base.set(x, z, x * 0.15 + z * 0.02);
      }
    }
    const left = new WorldState(base.clone());
    const right = new WorldState(mirrorX(base));

    for (let i = 0; i < 80; i++) {
      left.addRain(0.01);
      right.addRain(0.01);
      left.stepEvent();
      right.stepEvent();
    }

    let maxDiff = 0;
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        const a = left.water.get(x, z);
        const b = right.water.get(w - 1 - x, z);
        maxDiff = Math.max(maxDiff, Math.abs(a - b));
      }
    }
    expect(maxDiff).toBeLessThan(1e-5);
  });
});
