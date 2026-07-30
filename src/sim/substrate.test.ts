import { describe, expect, it } from "vitest";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import {
  MAX_SUBSTRATE_POROSITY,
  SUBSTRATE_CLAY,
  SUBSTRATE_LOAM,
  SUBSTRATE_ROCK,
  SUBSTRATE_SAND,
  paintSubstrateMosaic,
  substrateProps,
} from "./terrain/substrates";
import { substrateEncodingDelta } from "../ui/terrainEncoding";
import { generateMountain } from "./terrain/generateMountain";
import { EditUndoStack } from "./sessionPersist";

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

  it("rock sheds and resists more than clay", () => {
    const rock = substrateProps(SUBSTRATE_ROCK);
    const clay = substrateProps(SUBSTRATE_CLAY);
    const sand = substrateProps(SUBSTRATE_SAND);
    expect(rock.infiltrationRate).toBeLessThan(clay.infiltrationRate);
    expect(rock.erosionK).toBeLessThan(clay.erosionK);
    expect(rock.infiltrationRate).toBeLessThan(sand.infiltrationRate);
    expect(rock.erosionK).toBeLessThan(sand.erosionK);
    expect(rock.porosity).toBeLessThan(sand.porosity);
  });

  it("registers soil.material as legacy geomorphology / decadal", () => {
    const world = new WorldState(new Grid2D(4, 4, 1));
    const field = world.registry.get("soil.material");
    expect(field.legacy).toBe(true);
    expect(field.owner).toBe("geomorphology");
    expect(field.band).toBe("decadal");
    expect(field.range).toEqual([0, SUBSTRATE_ROCK]);
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

describe("depositSubstrate (C-009 geological deposit)", () => {
  it("raises elev+depth and stamps material where mass lands", () => {
    const world = new WorldState(generateMountain(24, 24, 6, 2));
    const x = 12;
    const z = 12;
    world.soilMaterial.fill(SUBSTRATE_LOAM);
    const elev0 = world.terrain.get(x, z);
    const depth0 = world.soilDepth.get(x, z);

    world.depositSubstrate(x, z, SUBSTRATE_ROCK, 1.0);
    expect(world.terrain.get(x, z)).toBeGreaterThan(elev0);
    expect(world.soilDepth.get(x, z)).toBeGreaterThan(depth0);
    expect(world.getSoilMaterial(x, z)).toBe(SUBSTRATE_ROCK);
    const bed0 = elev0 - depth0;
    expect(world.terrain.get(x, z) - world.soilDepth.get(x, z)).toBeCloseTo(
      bed0,
      5,
    );
  });

  it("berm does not change material", () => {
    const world = new WorldState(generateMountain(24, 24, 6, 2));
    world.soilMaterial.fill(SUBSTRATE_CLAY);
    world.raiseBerm(12, 12, 1.0);
    expect(world.getSoilMaterial(12, 12)).toBe(SUBSTRATE_CLAY);
  });

  it("undo restores material after deposit", () => {
    const world = new WorldState(generateMountain(20, 20, 5, 2));
    world.soilMaterial.fill(SUBSTRATE_LOAM);
    const undo = new EditUndoStack();
    undo.pushCheckpoint(world);
    world.depositSubstrate(10, 10, SUBSTRATE_SAND, 0.8);
    expect(world.getSoilMaterial(10, 10)).toBe(SUBSTRATE_SAND);
    expect(undo.undo(world)).toBe(true);
    expect(world.getSoilMaterial(10, 10)).toBe(SUBSTRATE_LOAM);
  });
});
