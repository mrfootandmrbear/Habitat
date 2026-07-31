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
import {
  BranchSession,
  branchMoistureEncodingDelta,
} from "./branch";
import { applyForces, type ForceSettings } from "./forceSettings";
import { lightEncodingDelta } from "../ui/lightEncoding";
import {
  terrainEncodingDelta,
  defaultTerrainRgb,
  intertidalEncodingDelta,
  salinityEncodingDelta,
  saltMemoryEncodingDelta,
  substrateEncodingDelta,
} from "../ui/terrainEncoding";
import {
  occupantEncodingDelta,
  shoreInteriorOccupantDelta,
  guildOccupantEncodingDelta,
  binderOccupantEncodingDelta,
} from "../ui/occupantEncoding";
import { briefChromePresent } from "../ui/briefChrome";
import { notebookChromePresent } from "../ui/notebookChrome";
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

  it("salinity crust tint clears the perceptual floor without inspector (C-018)", () => {
    expect(salinityEncodingDelta(config.soilPorosity)).toBeGreaterThan(0.08);
    const fresh = { moisture: 0.25, cover: 0.35, salinity: 0 };
    const salty = { moisture: 0.25, cover: 0.35, salinity: 0.85 };
    expect(
      terrainEncodingDelta(fresh, salty, config.soilPorosity),
    ).toBeGreaterThan(0.08);
  });

  it("twin-hollow salt memory outcome clears perceptual floor (C-018 engagement)", () => {
    expect(saltMemoryEncodingDelta(config.soilPorosity)).toBeGreaterThan(0.15);
    // Occupant wash: freshened biomass vs salt-limited twin (salinity-arrival numbers).
    expect(
      occupantEncodingDelta(0.375, 2.5, config.herbBiomassMax),
    ).toBeGreaterThan(0.15);
  });

  it("strand vs herb guild tint clears perceptual floor (C-018)", () => {
    expect(
      guildOccupantEncodingDelta(
        config.herbBiomassMax,
        config.herbBiomassMax,
        config.strandBiomassMax,
      ),
    ).toBeGreaterThan(0.08);
  });

  it("binder vs strand guild tint clears perceptual floor (C-009)", () => {
    expect(
      binderOccupantEncodingDelta(
        config.binderBiomassMax,
        config.strandBiomassMax,
        config.binderBiomassMax,
      ),
    ).toBeGreaterThan(0.08);
  });

  it("sand vs clay dry BASE clears the perceptual floor without inspector (C-009)", () => {
    expect(substrateEncodingDelta()).toBeGreaterThan(0.12);
  });

  it("overseas shore fringe occupant encoding clears floor vs interior (C-019)", () => {
    const size = 40;
    const sea = 2;
    const world = new WorldState(generateIsland(size, size, 10, 21), {
      seaLevel: sea,
      islandIsolation: 16,
    });
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    for (const i of world.oceanCells) {
      world.soilMoisture.data[i] = 0;
      world.groundwaterStorage.data[i] = 0;
    }
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    const delta = shoreInteriorOccupantDelta(
      world.herbBiomass.data,
      world.terrain.data,
      size,
      size,
      sea,
      config.herbBiomassMax,
      2,
    );
    expect(delta).toBeGreaterThan(0.08);
  });

  it("windward shore elev loss diverges from leeward under one wind (Slice 18 / C-017)", () => {
    const size = 40;
    const wind = windById("west");
    const world = new WorldState(generateIsland(size, size, 10, 19), {
      seaLevel: 2,
      windUx: wind.ux,
      windUz: wind.uz,
    });
    world.soilDepth.fill(1.2);
    world.vegCover.fill(0);
    const elev0 = world.terrain.data.slice();
    for (let n = 0; n < 12; n++) world.runGeomorphologyStep(1);
    const mid = (size / 2) | 0;
    let westLoss = 0;
    let eastLoss = 0;
    let nW = 0;
    let nE = 0;
    for (let i = 0; i < elev0.length; i++) {
      if (elev0[i]! < 2) continue;
      const x = i % size;
      const z = (i / size) | 0;
      const nbs = [
        z > 0 ? i - size : -1,
        z < size - 1 ? i + size : -1,
        x > 0 ? i - 1 : -1,
        x < size - 1 ? i + 1 : -1,
      ];
      const shore = nbs.some(
        (ni) => ni >= 0 && elev0[ni]! < 2,
      );
      if (!shore) continue;
      const loss = elev0[i]! - world.terrain.data[i]!;
      if (x < mid) {
        westLoss += loss;
        nW++;
      } else {
        eastLoss += loss;
        nE++;
      }
    }
    expect(nW).toBeGreaterThan(0);
    expect(nE).toBeGreaterThan(0);
    expect(westLoss / nW).toBeGreaterThan(eastLoss / nE);
  });

  it("lee shore elev rises vs calm under one wind (Slice 19 / C-017)", () => {
    const size = 40;
    const sea = 2;
    const seed = 19;
    const run = (windId: "west" | "calm") => {
      const wind = windById(windId);
      const world = new WorldState(generateIsland(size, size, 10, seed), {
        seaLevel: sea,
        windUx: wind.ux,
        windUz: wind.uz,
      });
      world.soilDepth.fill(1.2);
      world.vegCover.fill(0);
      const elev0 = world.terrain.data.slice();
      for (let n = 0; n < 12; n++) world.runGeomorphologyStep(1);
      const mid = (size / 2) | 0;
      let eastDelta = 0;
      let nE = 0;
      for (let i = 0; i < elev0.length; i++) {
        if (elev0[i]! < sea) continue;
        const x = i % size;
        if (x < mid) continue;
        const z = (i / size) | 0;
        const nbs = [
          z > 0 ? i - size : -1,
          z < size - 1 ? i + size : -1,
          x > 0 ? i - 1 : -1,
          x < size - 1 ? i + 1 : -1,
        ];
        if (!nbs.some((ni) => ni >= 0 && elev0[ni]! < sea)) continue;
        eastDelta += world.terrain.data[i]! - elev0[i]!;
        nE++;
      }
      return nE > 0 ? eastDelta / nE : 0;
    };
    expect(run("west")).toBeGreaterThan(run("calm"));
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

  it("branch moisture compare encoding clears floor without numbers (C-005)", () => {
    const base: ForceSettings = {
      rain: "dry",
      heat: "warm",
      sea: "none",
      tide: "off",
      wind: "calm",
    };
    const root = new WorldState(generateMountain(12, 12, 4, 9));
    applyForces(root, base);
    const session = BranchSession.open(root, base);
    applyForces(session.a, { ...base, rain: "heavy" });
    applyForces(session.b, { ...base, rain: "dry" });
    for (let i = 0; i < config.dailyEventSteps * 8; i++) session.stepBoth();
    let meanA = 0;
    let meanB = 0;
    const nCells = session.a.soilMoisture.data.length;
    for (let i = 0; i < nCells; i++) {
      meanA += session.a.soilMoisture.data[i]!;
      meanB += session.b.soilMoisture.data[i]!;
    }
    meanA /= nCells;
    meanB /= nCells;
    expect(branchMoistureEncodingDelta(meanA, meanB)).toBeGreaterThan(0.15);
    const out = new Float32Array(nCells);
    session.setActive("a");
    expect(session.fillMoistureCompareDelta(out)).toBeGreaterThan(0.15);
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

  it("field notebook chrome is present when open with an answer (U-006)", () => {
    expect(
      notebookChromePresent({
        open: true,
        question: "what-changed",
        answer: {
          question: "what-changed",
          empty: false,
          lines: [
            {
              entryId: "flooded-stands",
              event: "flooded",
              scale: "preserve",
              sentence: "Water stands where the land dips.",
              fieldIds: ["water.surfaceDepth"],
              uncertainty: null,
            },
          ],
        },
      }),
    ).toBe(true);
    expect(
      notebookChromePresent({
        open: false,
        question: "what-changed",
        answer: null,
      }),
    ).toBe(false);
  });
});
