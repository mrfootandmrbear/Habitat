import { describe, expect, it } from "vitest";
import { config } from "../config";
import { WorldState } from "./WorldState";
import { generateIsland, DEFAULT_SEA_LEVEL_METERS } from "./terrain/generateIsland";
import { fillShoreExposure, meanExposure } from "./climate/shoreExposure";
import { windById } from "./climate/windRegime";
import { geomorphologyProcess } from "./process/geomorphologyProcess";
import { computeOceanCells } from "./hydrology/fluxStep";

describe("Slice 18 shore exposure (C-017)", () => {
  it("geomorphology alone writes elev/depth (no second sediment process)", () => {
    expect(geomorphologyProcess.writes).toContain("terrain.elevation");
    expect(geomorphologyProcess.writes).toContain("soil.depth");
    expect(geomorphologyProcess.reads).toContain("shore.exposure");
    expect(geomorphologyProcess.contributes ?? []).not.toContain(
      "terrain.elevation",
    );
  });

  it("west wind exposes west shore more than east shore", () => {
    const size = 48;
    const elev = generateIsland(size, size, 10, 17).data;
    const ocean = computeOceanCells(elev, DEFAULT_SEA_LEVEL_METERS);
    const out = new Float32Array(size * size);
    fillShoreExposure(
      out,
      size,
      size,
      elev,
      ocean,
      windById("west"),
      config.shoreFetchMaxCells,
    );
    const mid = (size / 2) | 0;
    const west = meanExposure(out, (i) => {
      const x = i % size;
      return !ocean.has(i) && x < mid && out[i]! > 0;
    });
    const east = meanExposure(out, (i) => {
      const x = i % size;
      return !ocean.has(i) && x >= mid && out[i]! > 0;
    });
    expect(west).toBeGreaterThan(east);
  });

  it("calm wind yields zero exposure", () => {
    const world = new WorldState(generateIsland(32, 32, 10, 5), {
      seaLevel: DEFAULT_SEA_LEVEL_METERS,
      windUx: 0,
      windUz: 0,
    });
    let max = 0;
    for (let i = 0; i < world.shoreExposure.data.length; i++) {
      max = Math.max(max, world.shoreExposure.data[i]!);
    }
    expect(max).toBe(0);
  });

  it("paired winds diverge shore elev; bedrock invariant; ledger accounts loss", () => {
    const seed = 19;
    const size = 40;
    const bands = 12;

    const run = (windId: "west" | "east") => {
      const w = windById(windId);
      const world = new WorldState(generateIsland(size, size, 10, seed), {
        seaLevel: DEFAULT_SEA_LEVEL_METERS,
        windUx: w.ux,
        windUz: w.uz,
      });
      world.soilDepth.fill(1.2);
      world.vegCover.fill(0);
      const elev0 = world.terrain.data.slice();
      const depth0 = world.soilDepth.data.slice();
      const mid = (size / 2) | 0;
      const westShore: number[] = [];
      const eastShore: number[] = [];
      for (let i = 0; i < elev0.length; i++) {
        if (world.oceanCells.has(i)) continue;
        const x = i % size;
        const z = (i / size) | 0;
        const nbs = [
          z > 0 ? i - size : -1,
          z < size - 1 ? i + size : -1,
          x > 0 ? i - 1 : -1,
          x < size - 1 ? i + 1 : -1,
        ];
        if (!nbs.some((ni) => ni >= 0 && world.oceanCells.has(ni))) continue;
        if (x < mid) westShore.push(i);
        else eastShore.push(i);
      }
      for (let n = 0; n < bands; n++) world.runGeomorphologyStep(1);
      const meanLoss = (cells: number[]) => {
        if (cells.length === 0) return 0;
        let s = 0;
        for (const i of cells) s += elev0[i]! - world.terrain.data[i]!;
        return s / cells.length;
      };
      let bedrockOk = true;
      for (let i = 0; i < elev0.length; i++) {
        if (elev0[i]! < DEFAULT_SEA_LEVEL_METERS) continue;
        const dElev = elev0[i]! - world.terrain.data[i]!;
        const dDepth = depth0[i]! - world.soilDepth.data[i]!;
        // f32 elev/depth over many bands: (bed+h)-h drifts a few ULPs past 1e-6.
        if (Math.abs(dElev - dDepth) > 1e-5) bedrockOk = false;
      }
      return {
        hash: world.stateHash(),
        westMean: meanLoss(westShore),
        eastMean: meanLoss(eastShore),
        shoreErosion: world.shoreErosionLedger,
        bedrockOk,
        westShoreN: westShore.length,
        eastShoreN: eastShore.length,
      };
    };

    const west = run("west");
    const east = run("east");
    expect(west.bedrockOk).toBe(true);
    expect(east.bedrockOk).toBe(true);
    expect(west.westShoreN).toBeGreaterThan(0);
    expect(west.eastShoreN).toBeGreaterThan(0);
    expect(west.hash).not.toBe(east.hash);
    expect(west.westMean).toBeGreaterThan(west.eastMean);
    expect(east.eastMean).toBeGreaterThan(east.westMean);
    // Displaced soil closes via bedrock invariant (Δelev = Δdepth); ledger > 0.
    expect(west.shoreErosion).toBeGreaterThan(0);
  });

  it("setWind is global — no cell arguments", () => {
    const world = new WorldState(generateIsland(24, 24, 8, 3), {
      seaLevel: DEFAULT_SEA_LEVEL_METERS,
    });
    world.setWind(1, 0);
    expect(world.wind.ux).toBe(1);
    let exposed = 0;
    for (let i = 0; i < world.shoreExposure.data.length; i++) {
      if (world.shoreExposure.data[i]! > 0) exposed++;
    }
    expect(exposed).toBeGreaterThan(0);
  });
});
