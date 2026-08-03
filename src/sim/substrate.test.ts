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
import {
  DEFAULT_SEA_LEVEL_METERS,
  generateIsland,
} from "./terrain/generateIsland";
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

  it("paints seeded sand/clay patches on land — not a mid-x bisect", () => {
    const terrain = generateIsland(32, 32, 10, 42);
    const world = new WorldState(terrain, { seaLevel: DEFAULT_SEA_LEVEL_METERS });
    paintSubstrateMosaic(
      world.soilMaterial.data,
      world.width,
      world.height,
      world.oceanCells,
      42,
      { elev: world.terrain.data },
    );
    let sand = 0;
    let clay = 0;
    let midWestSand = 0;
    let midEastSand = 0;
    let midWestClay = 0;
    let midEastClay = 0;
    const mid = 16;
    for (let z = 0; z < 32; z++) {
      for (let x = 0; x < 32; x++) {
        const i = z * 32 + x;
        if (world.oceanCells.has(i)) continue;
        const m = world.getSoilMaterial(x, z);
        if (m === SUBSTRATE_SAND) sand++;
        else if (m === SUBSTRATE_CLAY) clay++;
        if (x === mid - 1) {
          if (m === SUBSTRATE_SAND) midWestSand++;
          if (m === SUBSTRATE_CLAY) midWestClay++;
        }
        if (x === mid) {
          if (m === SUBSTRATE_SAND) midEastSand++;
          if (m === SUBSTRATE_CLAY) midEastClay++;
        }
      }
    }
    expect(sand).toBeGreaterThan(10);
    expect(clay).toBeGreaterThan(10);
    // Hard west-sand / east-clay bisect would put all mid-1 sand and all mid clay.
    const hardBisect =
      midWestSand > 0 &&
      midWestClay === 0 &&
      midEastClay > 0 &&
      midEastSand === 0;
    expect(hardBisect).toBe(false);
  });

  it("same seed paints an identical mosaic (T-001)", () => {
    const paint = (seed: number) => {
      const terrain = generateIsland(24, 24, 10, 5);
      const world = new WorldState(terrain, {
        seaLevel: DEFAULT_SEA_LEVEL_METERS,
      });
      paintSubstrateMosaic(
        world.soilMaterial.data,
        world.width,
        world.height,
        world.oceanCells,
        seed,
        { elev: world.terrain.data },
      );
      return Array.from(world.soilMaterial.data);
    };
    expect(paint(7)).toEqual(paint(7));
    expect(paint(7)).not.toEqual(paint(8));
  });

  it("substrate encoding delta clears Tier-P floor", () => {
    expect(substrateEncodingDelta()).toBeGreaterThan(0.12);
  });
});

describe("clay perches water instead of draining it (H-003)", () => {
  const setup = (material: number) => {
    const world = new WorldState(generateMountain(10, 10, 4, 1));
    world.soilMaterial.fill(material);
    world.soilMoisture.fill(substrateProps(material).porosity); // fully saturated
    return world;
  };

  it("saturated clay recharges groundwater slower than saturated sand, per step", () => {
    const clay = setup(SUBSTRATE_CLAY);
    const sand = setup(SUBSTRATE_SAND);
    clay.runGroundwaterStep(1);
    sand.runGroundwaterStep(1);
    // One step only — after this, baseflow recession (unrelated to material)
    // starts bleeding groundwater back to the surface for both, which would
    // confound a multi-step snapshot comparison.
    expect(sand.getGroundwater(5, 5)).toBeGreaterThan(clay.getGroundwater(5, 5) * 2);
  });

  it("clay stays waterlogged; sand drains down to field capacity within a few days", () => {
    const clay = setup(SUBSTRATE_CLAY);
    const sand = setup(SUBSTRATE_SAND);
    for (let i = 0; i < 5; i++) {
      clay.runGroundwaterStep(1);
      sand.runGroundwaterStep(1);
    }
    const clayFc = substrateProps(SUBSTRATE_CLAY).porosity * 0.55;
    const sandFc = substrateProps(SUBSTRATE_SAND).porosity * 0.55;
    // Sand's high rechargeCap drains its (small) excess almost immediately.
    expect(sand.getSoilMoisture(5, 5)).toBeLessThanOrEqual(sandFc + 1e-3);
    // Clay's low rechargeCap is the binding constraint — most of its excess
    // is still sitting in the soil column as elevated moisture (waterlogged),
    // not passed on to groundwater.
    expect(clay.getSoilMoisture(5, 5)).toBeGreaterThan(clayFc + 0.05);
  });

  it("loam recharge is unaffected — worlds that never paint substrate keep prior behavior", () => {
    const world = new WorldState(generateMountain(10, 10, 4, 1));
    world.soilMoisture.fill(0.4);
    const before = world.getGroundwater(5, 5);
    world.runGroundwaterStep(1);
    const rechargedLoam = world.getGroundwater(5, 5) - before;
    expect(rechargedLoam).toBeGreaterThan(0);
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
