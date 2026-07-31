import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { LIMITING_LIGHT } from "./habitat/hsiComposition";
import {
  factorLight,
  horizontalInsolation,
} from "./habitat/lightComposition";
import { terrainInsolation } from "./vegetation/lightCompetition";

/** N/S planar slope — same geometry as succession-diverge / Slice 11. */
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

describe("Aspect light into Liebig (C-007 / C-011)", () => {
  it("factorLight is 1 at horizontal and 0 at zero insolation", () => {
    const ref = horizontalInsolation();
    expect(factorLight(ref)).toBe(1);
    expect(factorLight(ref * 1.2)).toBe(1);
    expect(factorLight(0)).toBe(0);
    expect(factorLight(ref * 0.5)).toBeCloseTo(0.5, 8);
  });

  it("does not use understory attenuation — bare and closed canopy share f_light", () => {
    const incoming = 0.4;
    expect(factorLight(incoming)).toBeCloseTo(incoming / horizontalInsolation(), 8);
  });

  it("south face earns herb; steep north is light-limited under one seed schedule", () => {
    const w = 16;
    const sx = 8;
    const sz = 8;
    // rise ±12: south f_light=1; north I₀=0 → light-limited.
    const rise = 12;

    const make = (risePerCell: number) => {
      const world = new WorldState(planarSlope(w, risePerCell));
      world.vegCover.fill(0);
      world.soilDepth.fill(config.hsiDepthRefMeters);
      world.soilMoisture.fill(config.soilPorosity);
      world.groundwaterStorage.fill(config.hsiGwRefMeters);
      world.soilSalinity.fill(0);
      world.shoreExposure.fill(0);
      world.runHabitatStep(1);
      world.herbSeedBank.fill(config.seedSourceStrength);
      world.strandSeedBank.fill(config.seedSourceStrength);
      for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
      return world;
    };

    const south = make(-rise);
    const north = make(rise);
    const southI = terrainInsolation(south.terrain.data, w, w, sx, sz);
    const northI = terrainInsolation(north.terrain.data, w, w, sx, sz);
    expect(southI).toBeGreaterThan(northI);
    expect(north.getLimitingFactor(sx, sz)).toBe(LIMITING_LIGHT);
    expect(north.getHabitatSuitability(sx, sz)).toBe(0);
    expect(south.getLimitingFactor(sx, sz)).not.toBe(LIMITING_LIGHT);
    expect(south.getHerbBiomass(sx, sz)).toBeGreaterThan(0.1);
    expect(north.getHerbBiomass(sx, sz)).toBeLessThan(
      south.getHerbBiomass(sx, sz) * 0.05,
    );
    // Moisture matched — twin isolates aspect light.
    expect(south.soilMoisture.get(sx, sz)).toBeCloseTo(
      north.soilMoisture.get(sx, sz),
      8,
    );
  });

  it("light-limited HSI does not rise when moisture improves", () => {
    const world = new WorldState(planarSlope(8, 12));
    world.shoreExposure.fill(0);
    world.soilSalinity.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilMoisture.fill(0.1);
    world.runHabitatStep(1);
    const hsiDry = world.getHabitatSuitability(2, 2);
    expect(world.getLimitingFactor(2, 2)).toBe(LIMITING_LIGHT);
    world.soilMoisture.fill(config.soilPorosity);
    world.runHabitatStep(1);
    expect(world.getHabitatSuitability(2, 2)).toBeCloseTo(hsiDry, 8);
  });

  it("flat terrain stays free of light limit under full water factors", () => {
    const world = new WorldState(new Grid2D(8, 8, 2));
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.shoreExposure.fill(0);
    world.runHabitatStep(1);
    expect(world.getLimitingFactor(2, 2)).not.toBe(LIMITING_LIGHT);
    expect(world.getHabitatSuitability(2, 2)).toBe(1);
  });
});
