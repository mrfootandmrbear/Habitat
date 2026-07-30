import { describe, expect, it } from "vitest";
import { config } from "../config";
import {
  fillOrographicRainDepths,
  wetDrySideEncodingDelta,
} from "./climate/orographicPrecip";
import { windById } from "./climate/windRegime";
import { Grid2D } from "./Grid2D";
import { generateIsland } from "./terrain/generateIsland";
import { WorldState } from "./WorldState";
import { soilEncodingDelta } from "../ui/cutaway";

/** East–west ridge: west face slopes up toward the crest (orographic fixture). */
function ridgeTerrain(width: number, height: number, peak: number): Grid2D {
  const g = new Grid2D(width, height);
  const mid = (width - 1) * 0.5;
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const h = peak - Math.abs(x - mid) * (peak / mid);
      g.set(x, z, Math.max(0.5, h));
    }
  }
  return g;
}

describe("orographic precip (Slice F / C-020 lite)", () => {
  it("wind API has no cell arguments", () => {
    const w = windById("west");
    expect(w.ux).toBe(1);
    expect(w.uz).toBe(0);
    expect(windById("calm").ux).toBe(0);
  });

  it("calm wind yields uniform depths; opposite winds diverge placement", () => {
    const size = 24;
    const elev = ridgeTerrain(size, size, 8).data;
    const calm = new Float32Array(size * size);
    const west = new Float32Array(size * size);
    const east = new Float32Array(size * size);
    const neverOcean = () => false;
    const base = 0.01;
    fillOrographicRainDepths(
      calm,
      elev,
      size,
      size,
      base,
      windById("calm"),
      config.orographicGamma,
      neverOcean,
    );
    fillOrographicRainDepths(
      west,
      elev,
      size,
      size,
      base,
      windById("west"),
      config.orographicGamma,
      neverOcean,
    );
    fillOrographicRainDepths(
      east,
      elev,
      size,
      size,
      base,
      windById("east"),
      config.orographicGamma,
      neverOcean,
    );
    expect(calm.every((d) => Math.abs(d - base) < 1e-5)).toBe(true);
    let identical = true;
    for (let i = 0; i < west.length; i++) {
      if (Math.abs(west[i]! - east[i]!) > 1e-6) {
        identical = false;
        break;
      }
    }
    expect(identical).toBe(false);
    let westLeft = 0;
    let westRight = 0;
    let nL = 0;
    let nR = 0;
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        const i = z * size + x;
        if (x < size / 2) {
          westLeft += west[i]!;
          nL++;
        } else {
          westRight += west[i]!;
          nR++;
        }
      }
    }
    // West wind: west face (left) receives more than east face.
    expect(westLeft / nL).toBeGreaterThan(westRight / nR);
  });

  it("addRainField conserves precip ledger with ocean exchange", () => {
    const world = new WorldState(generateIsland(16, 16, 8, 3), {
      seaLevel: 2,
    });
    const depths = new Float32Array(16 * 16);
    fillOrographicRainDepths(
      depths,
      world.terrain.data,
      16,
      16,
      0.01,
      windById("west"),
      config.orographicGamma,
      (i) => world.oceanCells.has(i),
    );
    world.addRainField(depths);
    expect(world.precipitationLedger).toBeCloseTo(
      depths.reduce((a, b) => a + b, 0),
      8,
    );
  });

  it("wet/dry sides encode in soil darkening on a ridge (world, not inspector)", () => {
    const w = 32;
    const h = 16;
    const world = new WorldState(ridgeTerrain(w, h, 10), {
      closedBoundary: true,
    });
    const depths = new Float32Array(w * h);
    const wind = windById("west");
    for (let step = 0; step < config.dailyEventSteps * 2; step++) {
      fillOrographicRainDepths(
        depths,
        world.terrain.data,
        w,
        h,
        config.rainDepthPerEvent * 0.5,
        wind,
        config.orographicGamma,
        () => false,
      );
      world.addRainField(depths);
      world.stepEvent();
    }
    let left = 0;
    let right = 0;
    let nL = 0;
    let nR = 0;
    const mid = (w / 2) | 0;
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        const i = z * w + x;
        const m = world.soilMoisture.data[i]!;
        if (x < mid) {
          left += m;
          nL++;
        } else {
          right += m;
          nR++;
        }
      }
    }
    const leftMean = left / nL;
    const rightMean = right / nR;
    const encoding = Math.abs(
      soilEncodingDelta(leftMean, rightMean, config.soilPorosity),
    );
    expect(leftMean).toBeGreaterThan(rightMean);
    expect(encoding).toBeGreaterThan(0.05);
    expect(
      wetDrySideEncodingDelta(leftMean, rightMean, config.soilPorosity),
    ).toBeGreaterThan(0.05);
  });
});
