import { describe, expect, it } from "vitest";
import { config } from "../config";
import { createExtentCage } from "../render/ExtentCage";
import { SitingCursor } from "../render/SitingCursor";
import { worldToGrid } from "../ui/siting";
import { formatCutaway, soilEncodingDelta } from "../ui/cutaway";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { FlowCueMesh } from "../render/FlowCueMesh";

describe("presentation proxies (BUILD_GUIDE §4.2, Tier-P)", () => {
  it("worldToGrid snaps world hits to integer cells", () => {
    const cellW = config.worldSize / (config.gridSize - 1);
    const ox = -config.worldSize / 2;
    const x = 10;
    const z = 20;
    const worldX = ox + x * cellW + cellW * 0.2;
    const worldZ = ox + z * cellW - cellW * 0.3;
    const cell = worldToGrid(worldX, worldZ);
    expect(cell).toEqual({ x, z });
  });

  it("SitingCursor snaps to the same cell as worldToGrid", () => {
    const cursor = new SitingCursor(32, 32, 48);
    const cellW = 48 / 31;
    const ox = -24;
    const wx = ox + 8 * cellW;
    const wz = ox + 12 * cellW;
    const fromGrid = worldToGrid(wx, wz, 32, 32, 48);
    const fromCursor = cursor.setFromWorld(wx, wz, 5);
    expect(fromCursor).toEqual(fromGrid);
    expect(cursor.getCell()).toEqual({ x: 8, z: 12 });
  });

  it("extent cage spans the configured worldSize", () => {
    const cage = createExtentCage(48, 14);
    const pos = cage.geometry.getAttribute("position")!;
    let maxAbsX = 0;
    for (let i = 0; i < pos.count; i++) {
      maxAbsX = Math.max(maxAbsX, Math.abs(pos.getX(i)));
    }
    expect(maxAbsX).toBeCloseTo(24, 5);
  });

  it("soil encoding delta exceeds perceptual floor for wet vs dry", () => {
    const delta = soilEncodingDelta(0.02, 0.35, config.soilPorosity);
    expect(delta).toBeGreaterThan(0.15);
  });

  it("cutaway format includes cell and stack channels", () => {
    const text = formatCutaway({
      x: 3,
      z: 4,
      soil: 0.2,
      water: 0.05,
      veg: 0.5,
      elev: 2.1,
    });
    expect(text).toContain("(3,4)");
    expect(text).toContain("soil");
    expect(text).toContain("water");
    expect(text).toContain("veg");
  });

  it("flow cue draws segments only for wet directed cells", () => {
    const terrain = new Grid2D(8, 8, 1);
    for (let z = 0; z < 8; z++) {
      for (let x = 0; x < 8; x++) terrain.set(x, z, x * 0.3);
    }
    const world = new WorldState(terrain);
    world.water.fill(0);
    world.water.set(2, 2, 0.2);
    world.ensureStructureFresh();
    const cue = new FlowCueMesh(8, 8, 16);
    cue.updateFrom(world.hydrologyModel, world);
    const draw = cue.object.geometry.drawRange.count;
    expect(draw).toBeGreaterThan(0);
  });
});
