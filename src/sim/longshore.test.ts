import { describe, expect, it } from "vitest";
import { config } from "../config";
import { WorldState } from "./WorldState";
import { generateIsland, DEFAULT_SEA_LEVEL_METERS } from "./terrain/generateIsland";
import { fillShoreExposure } from "./climate/shoreExposure";
import {
  fillLongshoreTendency,
  leeDepositWeight,
  meanLongshore,
} from "./climate/longshoreTendency";
import { windById } from "./climate/windRegime";
import { geomorphologyProcess } from "./process/geomorphologyProcess";
import { computeOceanCells } from "./hydrology/fluxStep";

function shoreCells(
  size: number,
  ocean: ReadonlySet<number>,
  elev: Float32Array,
): { west: number[]; east: number[] } {
  const mid = (size / 2) | 0;
  const west: number[] = [];
  const east: number[] = [];
  for (let i = 0; i < elev.length; i++) {
    if (ocean.has(i)) continue;
    const x = i % size;
    const z = (i / size) | 0;
    const nbs = [
      z > 0 ? i - size : -1,
      z < size - 1 ? i + size : -1,
      x > 0 ? i - 1 : -1,
      x < size - 1 ? i + 1 : -1,
    ];
    if (!nbs.some((ni) => ni >= 0 && ocean.has(ni))) continue;
    if (x < mid) west.push(i);
    else east.push(i);
  }
  return { west, east };
}

describe("Slice 19 longshore / beaches (C-017)", () => {
  it("geomorphology reads shore.longshore; sole elev/depth writer", () => {
    expect(geomorphologyProcess.reads).toContain("shore.longshore");
    expect(geomorphologyProcess.writes).toContain("terrain.elevation");
    expect(geomorphologyProcess.writes).toContain("soil.depth");
    expect(geomorphologyProcess.contributes ?? []).not.toContain(
      "terrain.elevation",
    );
  });

  it("lee deposit weight is positive on downwind flank under west wind", () => {
    const size = 40;
    const elev = generateIsland(size, size, 10, 19).data;
    const ocean = computeOceanCells(elev, DEFAULT_SEA_LEVEL_METERS);
    const wind = windById("west");
    const exposure = new Float32Array(size * size);
    fillShoreExposure(
      exposure,
      size,
      size,
      elev,
      ocean,
      wind,
      config.shoreFetchMaxCells,
    );
    const { west, east } = shoreCells(size, ocean, elev);
    let westW = 0;
    let eastW = 0;
    for (const i of west) {
      westW += leeDepositWeight(i, size, size, ocean, exposure, wind);
    }
    for (const i of east) {
      eastW += leeDepositWeight(i, size, size, ocean, exposure, wind);
    }
    expect(eastW).toBeGreaterThan(westW);
    expect(eastW).toBeGreaterThan(0);
  });

  it("signed longshore tendency is nonzero on oblique exposed shore", () => {
    const size = 48;
    const elev = generateIsland(size, size, 10, 17).data;
    const ocean = computeOceanCells(elev, DEFAULT_SEA_LEVEL_METERS);
    const wind = windById("west");
    const exposure = new Float32Array(size * size);
    const tendency = new Float32Array(size * size);
    fillShoreExposure(
      exposure,
      size,
      size,
      elev,
      ocean,
      wind,
      config.shoreFetchMaxCells,
    );
    fillLongshoreTendency(tendency, size, size, ocean, exposure, wind);
    let absMax = 0;
    for (let i = 0; i < tendency.length; i++) {
      absMax = Math.max(absMax, Math.abs(tendency[i]!));
    }
    expect(absMax).toBeGreaterThan(0);
    expect(
      Math.abs(meanLongshore(tendency, (i) => exposure[i]! > 0)),
    ).toBeLessThan(1);
  });

  it("west wind: windward loses, leeward gains vs calm; bedrock closes", () => {
    const seed = 19;
    const size = 40;
    const bands = 12;
    const sea = DEFAULT_SEA_LEVEL_METERS;

    const run = (windId: "west" | "calm") => {
      const w = windById(windId);
      const world = new WorldState(generateIsland(size, size, 10, seed), {
        seaLevel: sea,
        windUx: w.ux,
        windUz: w.uz,
      });
      world.soilDepth.fill(1.2);
      world.vegCover.fill(0);
      const elev0 = world.terrain.data.slice();
      const depth0 = world.soilDepth.data.slice();
      const { west, east } = shoreCells(size, world.oceanCells, elev0);
      for (let n = 0; n < bands; n++) world.runGeomorphologyStep(1);
      const meanDelta = (cells: number[]) => {
        if (cells.length === 0) return 0;
        let s = 0;
        for (const i of cells) s += world.terrain.data[i]! - elev0[i]!;
        return s / cells.length;
      };
      let bedrockOk = true;
      for (let i = 0; i < elev0.length; i++) {
        if (elev0[i]! < sea) continue;
        const dElev = world.terrain.data[i]! - elev0[i]!;
        const dDepth = world.soilDepth.data[i]! - depth0[i]!;
        if (Math.abs(dElev - dDepth) > 1e-6) bedrockOk = false;
      }
      return {
        hash: world.stateHash(),
        westDelta: meanDelta(west),
        eastDelta: meanDelta(east),
        shoreErosion: world.shoreErosionLedger,
        bedrockOk,
        westN: west.length,
        eastN: east.length,
      };
    };

    const west = run("west");
    const calm = run("calm");
    expect(west.bedrockOk).toBe(true);
    expect(west.westN).toBeGreaterThan(0);
    expect(west.eastN).toBeGreaterThan(0);
    // Windward scours relative to calm.
    expect(west.westDelta).toBeLessThan(calm.westDelta);
    // Lee receives — gains relative to calm production-only flank.
    expect(west.eastDelta).toBeGreaterThan(calm.eastDelta);
    expect(west.shoreErosion).toBeGreaterThan(0);
    // Ocean ledger is a proper fraction of windward scour (retain stays on-island).
    const westLoss = calm.westDelta - west.westDelta;
    expect(west.shoreErosion).toBeLessThan(westLoss * west.westN * 1.5);
  });

  it("opposite winds swap which flank gains", () => {
    const seed = 19;
    const size = 40;
    const bands = 12;

    const flankGain = (windId: "west" | "east") => {
      const w = windById(windId);
      const world = new WorldState(generateIsland(size, size, 10, seed), {
        seaLevel: DEFAULT_SEA_LEVEL_METERS,
        windUx: w.ux,
        windUz: w.uz,
      });
      world.soilDepth.fill(1.2);
      world.vegCover.fill(0);
      const elev0 = world.terrain.data.slice();
      const { west, east } = shoreCells(size, world.oceanCells, elev0);
      for (let n = 0; n < bands; n++) world.runGeomorphologyStep(1);
      const meanDelta = (cells: number[]) => {
        let s = 0;
        for (const i of cells) s += world.terrain.data[i]! - elev0[i]!;
        return s / cells.length;
      };
      return {
        hash: world.stateHash(),
        westDelta: meanDelta(west),
        eastDelta: meanDelta(east),
      };
    };

    const west = flankGain("west");
    const east = flankGain("east");
    expect(west.hash).not.toBe(east.hash);
    expect(west.eastDelta).toBeGreaterThan(west.westDelta);
    expect(east.westDelta).toBeGreaterThan(east.eastDelta);
  });
});
