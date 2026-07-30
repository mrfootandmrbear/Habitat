import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { vegetationProcess } from "./process/vegetationProcess";
import {
  evaluateLight,
  terrainInsolation,
} from "./vegetation/lightCompetition";

describe("light / succession (Slice 11, ES-001 / T-005)", () => {
  it("registers inspectable light fields under the existing vegetation owner", () => {
    const world = new WorldState(new Grid2D(6, 6, 2));
    for (const id of [
      "light.insolation",
      "veg.leafAreaIndex",
      "light.understory",
    ]) {
      const field = world.registry.get(id);
      expect(field.owner).toBe("vegetation");
      expect(field.band).toBe("daily");
      expect(field.legacy).toBe(false);
      expect(vegetationProcess.writes).toContain(id);
    }
  });

  it("Beer–Lambert monotonicity: more canopy means less understory light", () => {
    const open = evaluateLight(0.8, 0.1);
    const closed = evaluateLight(0.8, 0.9);
    expect(closed.leafAreaIndex).toBeGreaterThan(open.leafAreaIndex);
    expect(closed.understoryLight).toBeLessThan(open.understoryLight);
  });

  it("south-facing terrain receives more representative insolation than north-facing", () => {
    const south = planarSlope(9, -4);
    const north = planarSlope(9, 4);
    const center = 4;
    const southI = terrainInsolation(south.data, 9, 9, center, center);
    const northI = terrainInsolation(north.data, 9, 9, center, center);
    expect(southI).toBeGreaterThan(northI);
  });

  it("paired aspects diverge under identical moisture and rules", () => {
    const south = new WorldState(planarSlope(12, -4));
    const north = new WorldState(planarSlope(12, 4));
    for (const world of [south, north]) {
      world.soilMoisture.fill(0.25);
      world.vegCover.fill(0.1);
      for (let i = 0; i < 40; i++) world.runVegetationStep(1);
    }
    expect(mean(south.insolation.data)).toBeGreaterThan(
      mean(north.insolation.data),
    );
    expect(mean(south.vegCover.data)).toBeGreaterThan(
      mean(north.vegCover.data),
    );
  });

  it("burn-cleared cover has a larger light-driven gain than closed canopy", () => {
    const world = new WorldState(new Grid2D(4, 4, 2));
    world.soilMoisture.fill(0.25);
    world.vegCover.set(0, 0, 0.1);
    world.vegCover.set(1, 0, 0.8);
    const burnedStart = world.vegCover.get(0, 0);
    const unburnedStart = world.vegCover.get(1, 0);
    world.runVegetationStep(1);
    const burnedGain = world.vegCover.get(0, 0) - burnedStart;
    const unburnedGain = world.vegCover.get(1, 0) - unburnedStart;
    expect(world.getUnderstoryLight(0, 0)).toBeGreaterThan(
      world.getUnderstoryLight(1, 0),
    );
    expect(burnedGain).toBeGreaterThan(unburnedGain);
  });

  it("keeps light and cover finite and inside registered bounds", () => {
    const world = new WorldState(planarSlope(8, -20));
    world.soilMoisture.fill(config.soilPorosity);
    world.vegCover.fill(1);
    for (let i = 0; i < 20; i++) world.runVegetationStep(1);
    world.registry.assertBounds("slice-11-test");
    for (const data of [
      world.insolation.data,
      world.leafAreaIndex.data,
      world.understoryLight.data,
      world.vegCover.data,
    ]) {
      expect([...data].every(Number.isFinite)).toBe(true);
    }
  });
});

function planarSlope(size: number, risePerCell: number): Grid2D {
  const terrain = new Grid2D(size, size);
  const offset = Math.abs(risePerCell) * size;
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      terrain.set(x, z, offset + z * risePerCell);
    }
  }
  return terrain;
}

function mean(data: Float32Array): number {
  let total = 0;
  for (let i = 0; i < data.length; i++) total += data[i]!;
  return total / data.length;
}
