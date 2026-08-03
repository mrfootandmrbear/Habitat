import { describe, expect, it } from "vitest";
import { buildSnowAffinityTexture, computeSnowAffinity } from "./snowAffinity";

function meanOver(
  affinity: Float32Array,
  width: number,
  xRange: [number, number],
  zRange: [number, number],
): number {
  let sum = 0;
  let n = 0;
  for (let z = zRange[0]; z <= zRange[1]; z++) {
    for (let x = xRange[0]; x <= xRange[1]; x++) {
      sum += affinity[z * width + x]!;
      n++;
    }
  }
  return sum / n;
}

describe("snow ground-cover affinity (C-020 G8)", () => {
  it("flat uniform terrain still varies by patch noise, not a flat sheet", () => {
    const width = 20;
    const height = 20;
    const elevation = new Float32Array(width * height).fill(3);
    const affinity = computeSnowAffinity(elevation, width, height);
    let min = Infinity;
    let max = -Infinity;
    for (const v of affinity) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    expect(max - min).toBeGreaterThan(0.05);
  });

  it("higher flat ground collects more than lower flat ground", () => {
    const width = 20;
    const height = 20;
    const elevation = new Float32Array(width * height);
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        elevation[z * width + x] = z < 10 ? 0 : 5;
      }
    }
    const affinity = computeSnowAffinity(elevation, width, height);
    // Stay clear of the step's border row so only the elevation term differs.
    const low = meanOver(affinity, width, [0, width - 1], [2, 7]);
    const high = meanOver(affinity, width, [0, width - 1], [12, 17]);
    expect(high).toBeGreaterThan(low);
  });

  it("a steep step sheds relative to the flat ground on either side", () => {
    const width = 20;
    const height = 20;
    const elevation = new Float32Array(width * height);
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        elevation[z * width + x] = z < 10 ? 0 : 8;
      }
    }
    const affinity = computeSnowAffinity(elevation, width, height);
    const flatLow = meanOver(affinity, width, [0, width - 1], [2, 7]);
    const border = meanOver(affinity, width, [0, width - 1], [9, 10]);
    expect(border).toBeLessThan(flatLow);
  });

  it("builds an RGBA DataTexture sized to the grid", () => {
    const width = 12;
    const height = 8;
    const elevation = new Float32Array(width * height).fill(1);
    const tex = buildSnowAffinityTexture(elevation, width, height);
    expect(tex.image.width).toBe(width);
    expect(tex.image.height).toBe(height);
    expect((tex.image.data as Uint8Array).length).toBe(width * height * 4);
    tex.dispose();
  });
});
