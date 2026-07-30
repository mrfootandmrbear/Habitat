import { describe, expect, it } from "vitest";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import {
  MAX_SUBSTRATE_POROSITY,
  SUBSTRATE_CLAY,
  SUBSTRATE_LOAM,
  SUBSTRATE_SAND,
  paintSubstrateMosaic,
  substrateProps,
} from "./terrain/substrates";
import { substrateEncodingDelta } from "../ui/terrainEncoding";

describe("substrate table (Slice S / C-009 / T-004)", () => {
  it("loam matches the prior global knobs", () => {
    const loam = substrateProps(SUBSTRATE_LOAM);
    expect(loam.porosity).toBe(0.45);
    expect(loam.infiltrationRate).toBe(0.08);
    expect(loam.erosionK).toBe(0.003);
  });

  it("sand drains faster and erodes easier than clay", () => {
    const sand = substrateProps(SUBSTRATE_SAND);
    const clay = substrateProps(SUBSTRATE_CLAY);
    expect(sand.infiltrationRate).toBeGreaterThan(clay.infiltrationRate);
    expect(sand.erosionK).toBeGreaterThan(clay.erosionK);
    expect(clay.porosity).toBeGreaterThan(sand.porosity);
  });

  it("registers soil.material as legacy geomorphology / decadal", () => {
    const world = new WorldState(new Grid2D(4, 4, 1));
    const field = world.registry.get("soil.material");
    expect(field.legacy).toBe(true);
    expect(field.owner).toBe("geomorphology");
    expect(field.band).toBe("decadal");
    expect(field.range).toEqual([0, SUBSTRATE_CLAY]);
    expect(world.getSoilMaterial(0, 0)).toBe(SUBSTRATE_LOAM);
  });

  it("moisture registry range covers the widest table porosity", () => {
    const world = new WorldState(new Grid2D(2, 2, 1));
    expect(world.registry.get("soil.moisture").range).toEqual([
      0,
      MAX_SUBSTRATE_POROSITY,
    ]);
  });

  it("paints sand west / clay east on land", () => {
    const terrain = new Grid2D(8, 8, 3);
    const world = new WorldState(terrain, { seaLevel: 1 });
    paintSubstrateMosaic(
      world.soilMaterial.data,
      world.width,
      world.height,
      world.oceanCells,
    );
    let sawSand = false;
    let sawClay = false;
    for (let z = 0; z < 8; z++) {
      for (let x = 0; x < 8; x++) {
        const i = z * 8 + x;
        if (world.oceanCells.has(i)) continue;
        const m = world.getSoilMaterial(x, z);
        if (x < 4) {
          expect(m).toBe(SUBSTRATE_SAND);
          sawSand = true;
        } else {
          expect(m).toBe(SUBSTRATE_CLAY);
          sawClay = true;
        }
      }
    }
    expect(sawSand && sawClay).toBe(true);
  });

  it("substrate encoding delta clears Tier-P floor", () => {
    expect(substrateEncodingDelta()).toBeGreaterThan(0.12);
  });
});
