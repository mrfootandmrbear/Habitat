import { describe, expect, it } from "vitest";
import { config } from "../config";
import { createExtentCage } from "../render/ExtentCage";
import { SitingCursor } from "../render/SitingCursor";
import { worldToGrid } from "../ui/siting";
import { formatCutaway, soilEncodingDelta } from "../ui/cutaway";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { FlowCueMesh } from "../render/FlowCueMesh";
import { generateMountain } from "./terrain/generateMountain";
import { generateIsland } from "./terrain/generateIsland";
import { shorelineEncodingDelta } from "./climate/seaLevel";
import { fillOrographicRainDepths } from "./climate/orographicPrecip";
import { windById } from "./climate/windRegime";
import {
  elevChangeEncodingStrength,
  FormMemory,
} from "./formMemory";
import { lightEncodingDelta } from "../ui/lightEncoding";
import { terrainEncodingDelta, defaultTerrainRgb, intertidalEncodingDelta } from "../ui/terrainEncoding";
import { occupantEncodingDelta } from "../ui/occupantEncoding";
import { briefChromePresent } from "../ui/briefChrome";
import { LIVING_HOLLOW_BRIEF } from "./scenario/ScenarioSession";

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
      soilDepth: 0.8,
      water: 0.05,
      veg: 0.5,
      elev: 2.1,
    });
    expect(text).toContain("(3,4)");
    expect(text).toContain("depth");
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

  it("berm elev-change encoding exceeds floor after geomorphology (Slice 8c)", () => {
    const w = 24;
    const world = new WorldState(generateMountain(w, w, 6, 3));
    world.vegCover.fill(0);
    world.raiseBerm(12, 12, 3);
    const mem = new FormMemory();
    mem.capture(world.terrain.data, w, w);
    for (let i = 0; i < 40; i++) {
      world.runGeomorphologyStep(1);
    }
    let maxStrength = 0;
    for (let z = 0; z < w; z++) {
      for (let x = 0; x < w; x++) {
        const d = mem.deltaAt(world.terrain.data, x, z);
        maxStrength = Math.max(maxStrength, elevChangeEncodingStrength(d));
      }
    }
    // Perceptual floor used across presentation proxies.
    expect(maxStrength).toBeGreaterThan(0.15);
    expect(mem.meanAbsDelta(world.terrain.data)).toBeGreaterThan(0.01);
  });

  it("understory-light overlay clears the perceptual floor for paired aspects", () => {
    const northLight = 0.13348884880542755;
    const southLight = 0.20132742822170258;
    expect(lightEncodingDelta(northLight, southLight)).toBeGreaterThan(0.15);
  });

  it("default terrain keeps wet-vs-dry legible under vegetation", () => {
    const delta = terrainEncodingDelta(
      { moisture: 0.05, cover: 0.7 },
      { moisture: 0.35, cover: 0.7 },
      config.soilPorosity,
    );
    expect(delta).toBeGreaterThan(0.15);
  });

  it("burn scar encoding clears the perceptual floor against unburned cover", () => {
    const delta = terrainEncodingDelta(
      { moisture: 0.2, cover: 0.4, scar: 0 },
      { moisture: 0.2, cover: 0.4, scar: 0.85 },
      config.soilPorosity,
    );
    expect(delta).toBeGreaterThan(0.15);
  });

  it("herb occupant encoding clears the perceptual floor against pre-arrival", () => {
    const delta = occupantEncodingDelta(0, 0.45, config.herbBiomassMax);
    expect(delta).toBeGreaterThan(0.15);
  });

  it("living hollow storm answer clears the perceptual floor via soil soak (Slice 13)", () => {
    const flat = new Grid2D(12, 12, 1);
    const commit = (herb: number): WorldState => {
      const world = new WorldState(flat.clone());
      world.vegCover.fill(0);
      world.herbBiomass.fill(herb);
      world.soilMoisture.fill(0);
      world.runVegetationStep(1);
      world.runSoilWaterStep(1);
      world.water.fill(0.4);
      world.runSoilWaterStep(1);
      return world;
    };
    const bare = commit(0);
    const colonized = commit(config.herbBiomassMax);
    let bareSoil = 0;
    let colonizedSoil = 0;
    for (let i = 0; i < bare.soilMoisture.data.length; i++) {
      bareSoil += bare.soilMoisture.data[i]!;
      colonizedSoil += colonized.soilMoisture.data[i]!;
    }
    bareSoil /= bare.soilMoisture.data.length;
    colonizedSoil /= colonized.soilMoisture.data.length;
    const delta = soilEncodingDelta(bareSoil, colonizedSoil, config.soilPorosity);
    expect(delta).toBeGreaterThan(0.15);
  });

  it("island shoreline encoding clears the perceptual floor (Slice 16 / C-015)", () => {
    const terrain = generateIsland(48, 48, 10, 21);
    const sea = 2;
    const shoreFrac = shorelineEncodingDelta(48, 48, terrain.data, sea);
    expect(shoreFrac).toBeGreaterThan(0.05);
    // Ocean plane vs default land tint — silhouette readable without inspector.
    const ocean: readonly [number, number, number] = [
      0x1a / 255,
      0x4a / 255,
      0x6e / 255,
    ];
    const land = defaultTerrainRgb(0.1, config.soilPorosity, 0.05, 0);
    const delta = Math.hypot(
      ocean[0] - land[0],
      ocean[1] - land[1],
      ocean[2] - land[2],
    );
    expect(delta).toBeGreaterThan(0.15);
    // Higher sea → more shoreline cells on this radial island.
    expect(
      shorelineEncodingDelta(48, 48, terrain.data, 3.5),
    ).toBeGreaterThan(shoreFrac);
  });

  it("intertidal foreshore tint clears the perceptual floor (Slice 17 / C-016)", () => {
    expect(intertidalEncodingDelta(config.soilPorosity)).toBeGreaterThan(0.08);
    const dry = { moisture: 0.1, cover: 0.05 };
    const foreshore = { moisture: 0.1, cover: 0.05, intertidal: true };
    expect(
      terrainEncodingDelta(dry, foreshore, config.soilPorosity),
    ).toBeGreaterThan(0.08);
  });

  it("orographic wet/dry sides encode in soil darkening without inspector (Slice F)", () => {
    const w = 32;
    const h = 16;
    const ridge = new Grid2D(w, h);
    const mid = (w - 1) * 0.5;
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        ridge.set(x, z, Math.max(0.5, 10 - Math.abs(x - mid) * (10 / mid)));
      }
    }
    const world = new WorldState(ridge, { closedBoundary: true });
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
    const half = (w / 2) | 0;
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        const i = z * w + x;
        const m = world.soilMoisture.data[i]!;
        if (x < half) {
          left += m;
          nL++;
        } else {
          right += m;
          nR++;
        }
      }
    }
    const encoding = Math.abs(
      soilEncodingDelta(left / nL, right / nR, config.soilPorosity),
    );
    // World encoding: ground darkens differently by side — no inspector layer.
    expect(encoding).toBeGreaterThan(0.05);
  });

  it("scenario brief chrome is present when a brief is active (Slice 15)", () => {
    expect(
      briefChromePresent({
        active: true,
        brief: LIVING_HOLLOW_BRIEF,
        currentlySatisfied: false,
        achieved: false,
        samplesTaken: 0,
      }),
    ).toBe(true);
    expect(
      briefChromePresent({
        active: false,
        brief: LIVING_HOLLOW_BRIEF,
        currentlySatisfied: false,
        achieved: false,
        samplesTaken: 0,
      }),
    ).toBe(false);
  });
});
