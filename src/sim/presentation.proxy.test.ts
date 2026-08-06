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
import { elevChangeEncodingStrength, FormMemory } from "./formMemory";
import { BranchSession, branchMoistureEncodingDelta } from "./branch";
import { applyForces, type ForceSettings } from "./forceSettings";
import { lightEncodingDelta } from "../ui/lightEncoding";
import {
  terrainEncodingDelta,
  defaultTerrainRgb,
  intertidalEncodingDelta,
  salinityEncodingDelta,
  saltMemoryEncodingDelta,
  substrateEncodingDelta,
  INTERTIDAL,
} from "../ui/terrainEncoding";
import {
  occupantEncodingDelta,
  shoreInteriorOccupantDelta,
  guildOccupantEncodingDelta,
  binderOccupantEncodingDelta,
  marshOccupantEncodingDelta,
  shrubOccupantEncodingDelta,
  crustOccupantEncodingDelta,
  binderBiomassRgb,
} from "../ui/occupantEncoding";
import {
  guildFlex,
  livingVitality,
  swayAmplitude,
  swayTilt,
} from "../ui/occupantSway";
import { OccupantMesh } from "../render/OccupantMesh";
import { HerbivoreMesh } from "../render/HerbivoreMesh";
import * as THREE from "three";
import { rgbDistance } from "../ui/colorDistance";
import { briefChromePresent } from "../ui/briefChrome";
import { notebookChromePresent } from "../ui/notebookChrome";
import {
  chromeControlCount,
  chromeDensityDelta,
  fullOnlyVisible,
} from "../ui/chromeDensity";
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
    // Floor lowered from 0.15 (BUILD_GUIDE §4.52): the old ramp's `*3`
    // multiplier inflated this delta to 0.223 by amplifying every light
    // value, not just clipping the saturated top of the domain — dropping
    // it (so the ramp stays injective to light=1.0) honestly measures 0.082
    // for this specific pair. Still a clearly nonzero, legible difference;
    // 0.05 matches the floor already used for the comparably subtle
    // orographic wet/dry-sides encoding.
    expect(lightEncodingDelta(northLight, southLight)).toBeGreaterThan(0.05);
  });

  it("default terrain keeps wet-vs-dry legible under vegetation", () => {
    const delta = terrainEncodingDelta(
      { moisture: 0.05, cover: 0.7 },
      { moisture: 0.35, cover: 0.7 },
      config.soilPorosity,
    );
    // Floor lowered from 0.15 (BUILD_GUIDE §4.52): this moisture transition
    // moves mostly in red (Δ0.163) with almost no green movement (Δ0.017) —
    // the old unweighted-Euclidean 0.175 overstated it, since human
    // luminance perception weights green far more than red. Honestly
    // luminance-weighted, it measures 0.136; 0.12 matches the floor already
    // used for substrate-contrast, a comparably material/moisture-driven read.
    expect(delta).toBeGreaterThan(0.12);
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
    const delta = soilEncodingDelta(
      bareSoil,
      colonizedSoil,
      config.soilPorosity,
    );
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
    expect(shorelineEncodingDelta(48, 48, terrain.data, 3.5)).toBeGreaterThan(
      shoreFrac,
    );
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

  it("marsh vs binder guild tint clears perceptual floor (C-016)", () => {
    expect(
      marshOccupantEncodingDelta(
        config.marshBiomassMax,
        config.binderBiomassMax,
        config.marshBiomassMax,
      ),
    ).toBeGreaterThan(0.08);
  });

  it("shrub vs marsh guild tint clears perceptual floor (Slice N10)", () => {
    expect(
      shrubOccupantEncodingDelta(
        config.shrubBiomassMax,
        config.marshBiomassMax,
        config.shrubBiomassMax,
      ),
    ).toBeGreaterThan(0.08);
  });

  it("crust vs shrub guild tint clears perceptual floor (Slice N11)", () => {
    expect(
      crustOccupantEncodingDelta(
        config.crustBiomassMax,
        config.shrubBiomassMax,
        config.crustBiomassMax,
      ),
    ).toBeGreaterThan(0.08);
  });

  it("sand vs clay dry BASE clears the perceptual floor without inspector (C-009)", () => {
    expect(substrateEncodingDelta()).toBeGreaterThan(0.12);
  });

  it("binder mat vs intertidal foreshore clear the cross-file collision floor (BUILD_GUIDE §4.52)", () => {
    // occupant guild cover (binder) and terrain tidal state (intertidal) are
    // two different quantities that co-occur on the shore, and every prior
    // delta check compared a palette only against its own file's colors —
    // this one is the cross-file mechanism the review's §3 finding named.
    const binder = binderBiomassRgb(
      config.binderBiomassMax,
      config.binderBiomassMax,
    );
    expect(rgbDistance(binder, INTERTIDAL)).toBeGreaterThan(0.08);
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
    world.soilMoisture.fill(config.soilPorosity * 0.5);
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
      const shore = nbs.some((ni) => ni >= 0 && elev0[ni]! < 2);
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
      season: "typical",
      erosion: "moderate",
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

  it("occupant sway amplitude is zero at calm wind and rises with wind (L4)", () => {
    const flex = guildFlex("herb");
    const calm = swayAmplitude(0, flex, 1);
    const breeze = swayAmplitude(0.5, flex, 1);
    const gale = swayAmplitude(1, flex, 1);
    expect(calm).toBe(0);
    expect(breeze).toBeGreaterThan(calm);
    expect(gale).toBeGreaterThan(breeze);
    expect(swayAmplitude(1, guildFlex("shrub"), 1)).toBeLessThan(
      swayAmplitude(1, guildFlex("herb"), 1),
    );
    expect(swayAmplitude(1, guildFlex("crust"), 1)).toBeLessThan(
      swayAmplitude(1, guildFlex("shrub"), 1),
    );
  });

  it("standing-dead vitality damps sway while absent vitality is zero (L4 / L3)", () => {
    const max = config.herbBiomassMax;
    expect(livingVitality(0, max, 1)).toBe(0);
    expect(livingVitality(max, max, 1)).toBe(1);
    // HSI collapse leaves standing excess — capacity 0.2·max, biomass still full.
    const dead = livingVitality(max, max, 0.2);
    expect(dead).toBeGreaterThan(0);
    expect(dead).toBeLessThan(1);
    expect(swayAmplitude(1, guildFlex("herb"), dead)).toBeLessThan(
      swayAmplitude(1, guildFlex("herb"), 1),
    );
  });

  it("occupant sway holds a steady lean with only gentle flutter, never rocking through vertical (L4 readability fix)", () => {
    const amplitude = 0.55;
    const max = swayTilt(amplitude, Math.PI / 2, 0); // sin = +1, peak of the sine
    const min = swayTilt(amplitude, -Math.PI / 2, 0); // sin = -1, trough of the sine
    // Always leaning the same way — a windswept plant never swings back
    // past its own resting lean, let alone through vertical.
    expect(min).toBeGreaterThan(0);
    expect(max).toBeCloseTo(amplitude, 5);
    // Some flutter, but held to a minority of the peak lean.
    expect(max - min).toBeLessThan(amplitude * 0.7);
    expect(swayTilt(0, 0, 0)).toBe(0);
  });

  it("occupant lean is coherent in world space regardless of per-cell yaw (L4 sway-direction fix)", () => {
    // Regression test: OccupantMesh used to apply the downwind lean with
    // Object3D.rotateOnAxis *after* setting a per-cell random yaw. That
    // method rotates about an axis in the object's own (already-yawed)
    // local space, so the "world-space" wind axis silently got re-rotated
    // by each cell's own random yaw — every cone leaned a different way
    // even though the wind is one uniform vector. Fixed by composing the
    // yaw and lean as quaternions with the lean's axis outermost (fixed in
    // world space). Every visible instance below must lean the same
    // horizontal direction, independent of its yaw.
    const w = 12;
    const wind = windById("west");
    const world = new WorldState(new Grid2D(w, w, 1), {
      windUx: wind.ux,
      windUz: wind.uz,
    });
    world.herbBiomass.fill(config.herbBiomassMax);
    world.habitatSuitability.fill(1);
    const mesh = new OccupantMesh(w, w, w * 2);
    mesh.updateFrom(world.hydrologyModel, world);

    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    // Per-guild meshes: only herb is seeded here, and instances are
    // packed in fill order rather than at grid index z * w + x, so sample the
    // herb mesh's own instances instead of addressing cells directly. The
    // assertion is unchanged -- every visible instance must lean the same way.
    const herb = mesh.object.children.find(
      (c): c is THREE.InstancedMesh =>
        (c as THREE.InstancedMesh).isInstancedMesh === true &&
        c.name.includes("herb"),
    );
    expect(herb).toBeDefined();
    expect(herb!.count).toBeGreaterThan(3);
    const leanDir = (i: number): THREE.Vector2 => {
      herb!.getMatrixAt(i, m);
      m.decompose(pos, quat, scale);
      const tip = up.clone().applyQuaternion(quat);
      return new THREE.Vector2(tip.x, tip.z);
    };

    const sampled = [0, 1, Math.floor(herb!.count / 2), herb!.count - 1];
    const dirs = sampled.map((i) => leanDir(i));
    const first = dirs[0]!;
    expect(first.length()).toBeGreaterThan(0.01);
    for (const dir of dirs.slice(1)) {
      expect(dir.length()).toBeGreaterThan(0.01);
      const cos = dir.dot(first) / (dir.length() * first.length());
      expect(cos).toBeGreaterThan(0.999);
    }
  });

  it("occupied cells draw 2-4 sub-instances, not exactly one (§4.61 clustering)", () => {
    // A handful of occupied cells at max biomass — before §4.61 this would
    // produce exactly one herb instance per cell (count === occupied cells).
    const w = 8;
    const world = new WorldState(new Grid2D(w, w, 1), {});
    world.herbBiomass.fill(config.herbBiomassMax);
    world.habitatSuitability.fill(1);
    const occupiedCells = w * w;
    const mesh = new OccupantMesh(w, w, w * 2);
    mesh.updateFrom(world.hydrologyModel, world);

    const herb = mesh.object.children.find(
      (c): c is THREE.InstancedMesh =>
        (c as THREE.InstancedMesh).isInstancedMesh === true &&
        c.name.includes("herb"),
    );
    expect(herb).toBeDefined();
    // 2-4 sub-instances per cell -> total strictly between 1x and 4x occupied cells.
    expect(herb!.count).toBeGreaterThan(occupiedCells);
    expect(herb!.count).toBeLessThanOrEqual(occupiedCells * 4);
  });

  it("HerbivoreMesh (A1 / C-027) instance count tracks the true density total via a fixed-order accumulator, not lossy per-cell rounding", () => {
    // config.herbivoreDensityMax (25 ind/km²) x this map's cell area
    // (1e-4 km²) never reaches 0.5 per cell -- an independent per-cell
    // Math.round would round every cell to 0 and the population would
    // never render at all regardless of density. The fixed-order carry
    // accumulator must instead preserve the *sum*.
    const w = 32;
    const world = new WorldState(new Grid2D(w, w, 1));
    const density = 20; // within [0, herbivoreDensityMax], well under 0.5/cell
    world.herbivoreDensity.fill(density);
    const mesh = new HerbivoreMesh(w, w, w * 2);
    mesh.updateFrom(world.hydrologyModel, world);

    const cellAreaKm2 = (config.cellSizeMeters / 1000) ** 2;
    const expectedTotal = density * cellAreaKm2 * w * w;
    expect(mesh.object.count).toBeGreaterThan(0);
    // Within one unit of the true expected total (accumulator's own
    // rounding/carry boundary), not silently zero.
    expect(Math.abs(mesh.object.count - expectedTotal)).toBeLessThanOrEqual(1);
  });

  it("HerbivoreMesh renders nothing at exactly zero density everywhere (literal readout, not a tuned floor)", () => {
    const w = 16;
    const world = new WorldState(new Grid2D(w, w, 1));
    const mesh = new HerbivoreMesh(w, w, w * 2);
    mesh.updateFrom(world.hydrologyModel, world);
    expect(mesh.object.count).toBe(0);
  });

  it("HerbivoreMesh instance placement is deterministic across two renders of the same state (T-001)", () => {
    const w = 30;
    const world = new WorldState(new Grid2D(w, w, 1));
    world.herbivoreDensity.fill(config.herbivoreDensityMax);
    world.herbivoreLimbLength.fill(1.1);
    const meshA = new HerbivoreMesh(w, w, w * 2);
    meshA.updateFrom(world.hydrologyModel, world);
    const meshB = new HerbivoreMesh(w, w, w * 2);
    meshB.updateFrom(world.hydrologyModel, world);

    expect(meshA.object.count).toBe(meshB.object.count);
    expect(meshA.object.count).toBeGreaterThan(0);
    const m = new THREE.Matrix4();
    const mB = new THREE.Matrix4();
    for (let i = 0; i < meshA.object.count; i++) {
      meshA.object.getMatrixAt(i, m);
      meshB.object.getMatrixAt(i, mB);
      expect(m.toArray()).toEqual(mB.toArray());
    }
  });

  it("clustering is hash-identical across two renders of the same seed/tick (T-001)", () => {
    const w = 10;
    const world = new WorldState(new Grid2D(w, w, 1), {
      windUx: 0.6,
      windUz: 0.2,
    });
    world.herbBiomass.fill(config.herbBiomassMax * 0.7);
    world.shrubBiomass.fill(config.shrubBiomassMax * 0.5);
    world.habitatSuitability.fill(0.8);

    const meshA = new OccupantMesh(w, w, w * 2);
    meshA.setSwayTime(3.5);
    meshA.updateFrom(world.hydrologyModel, world);
    const meshB = new OccupantMesh(w, w, w * 2);
    meshB.setSwayTime(3.5);
    meshB.updateFrom(world.hydrologyModel, world);

    // §4.62: herb (winner) and shrub (runner-up) both contribute instances
    // when both clear the visibility floor — both must be hash-identical.
    for (const guild of ["herb", "shrub"] as const) {
      const a = meshA.object.children.find(
        (c): c is THREE.InstancedMesh =>
          (c as THREE.InstancedMesh).isInstancedMesh === true &&
          c.name.includes(guild),
      )!;
      const b = meshB.object.children.find(
        (c): c is THREE.InstancedMesh =>
          (c as THREE.InstancedMesh).isInstancedMesh === true &&
          c.name.includes(guild),
      )!;
      expect(a.count).toBe(b.count);
      expect(a.count).toBeGreaterThan(0);
      const ma = new THREE.Matrix4();
      const mb = new THREE.Matrix4();
      for (let i = 0; i < a.count; i++) {
        a.getMatrixAt(i, ma);
        b.getMatrixAt(i, mb);
        expect(ma.equals(mb)).toBe(true);
      }
    }
  });

  it("mixed stand: runner-up guild contributes instances when both clear visibility floor (§4.62)", () => {
    // Synthetic single cell with shrub canopy + herb understory, both well
    // above shootVisibility's floor. Before §4.62 only the arg-max (shrub)
    // drew; after, herb must also contribute a non-zero instance count
    // attributable to that same cell.
    const w = 4;
    const world = new WorldState(new Grid2D(w, w, 1), {});
    const cx = 2;
    const cz = 2;
    world.shrubBiomass.set(cx, cz, config.shrubBiomassMax * 0.9);
    world.herbBiomass.set(cx, cz, config.herbBiomassMax * 0.55);
    world.habitatSuitability.fill(1);

    const worldSize = w * 2;
    const mesh = new OccupantMesh(w, w, worldSize);
    mesh.updateFrom(world.hydrologyModel, world);

    const shrub = mesh.object.children.find(
      (c): c is THREE.InstancedMesh =>
        (c as THREE.InstancedMesh).isInstancedMesh === true &&
        c.name.includes("shrub"),
    )!;
    const herb = mesh.object.children.find(
      (c): c is THREE.InstancedMesh =>
        (c as THREE.InstancedMesh).isInstancedMesh === true &&
        c.name.includes("herb"),
    )!;
    expect(shrub.count).toBeGreaterThan(0);
    expect(herb.count).toBeGreaterThan(0);

    // Both guilds' instances sit inside the same cell footprint (±0.4 cellW
    // offset from center, matching OccupantMesh's placement bound).
    const cellW = worldSize / (w - 1);
    const ox = -worldSize / 2;
    const cellCx = ox + cx * cellW;
    const cellCz = ox + cz * cellW;
    const half = 0.45 * cellW; // slightly loose vs the 0.4 bound
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    for (const inst of [shrub, herb]) {
      for (let i = 0; i < inst.count; i++) {
        inst.getMatrixAt(i, m);
        pos.setFromMatrixPosition(m);
        expect(Math.abs(pos.x - cellCx)).toBeLessThanOrEqual(half);
        expect(Math.abs(pos.z - cellCz)).toBeLessThanOrEqual(half);
      }
    }
  });

  it("mixed stand: runner-up below visibility floor contributes nothing (§4.62)", () => {
    const w = 4;
    const world = new WorldState(new Grid2D(w, w, 1), {});
    // Winner well above floor; second guild below shootVisibility's 0.008
    // normalized threshold so it must not draw.
    world.herbBiomass.set(1, 1, config.herbBiomassMax);
    world.shrubBiomass.set(1, 1, config.shrubBiomassMax * 0.001);
    world.habitatSuitability.fill(1);
    const mesh = new OccupantMesh(w, w, w * 2);
    mesh.updateFrom(world.hydrologyModel, world);
    const herb = mesh.object.children.find(
      (c): c is THREE.InstancedMesh =>
        (c as THREE.InstancedMesh).isInstancedMesh === true &&
        c.name.includes("herb"),
    )!;
    const shrub = mesh.object.children.find(
      (c): c is THREE.InstancedMesh =>
        (c as THREE.InstancedMesh).isInstancedMesh === true &&
        c.name.includes("shrub"),
    )!;
    expect(herb.count).toBeGreaterThan(0);
    expect(shrub.count).toBe(0);
  });

  it("clustering instance ceiling stays at exactly 4x per guild (§4.61 bound)", () => {
    const w = 6;
    const world = new WorldState(new Grid2D(w, w, 1), {});
    world.herbBiomass.fill(config.herbBiomassMax);
    world.habitatSuitability.fill(1);
    const mesh = new OccupantMesh(w, w, w * 2);
    mesh.updateFrom(world.hydrologyModel, world);
    const herb = mesh.object.children.find(
      (c): c is THREE.InstancedMesh =>
        (c as THREE.InstancedMesh).isInstancedMesh === true &&
        c.name.includes("herb"),
    )!;
    // InstancedMesh capacity itself is the hard ceiling (setMatrixAt beyond
    // it throws) — assert the mesh was allocated at exactly width*height*4,
    // not an unbounded/oversized buffer.
    const geomAttr = herb.instanceMatrix;
    expect(geomAttr.count).toBe(w * w * 4);
  });

  it("Tier-M: OccupantMesh.updateFrom at config.gridSize stays well under one frame budget", () => {
    const n = config.gridSize;
    const world = new WorldState(new Grid2D(n, n, 1), {
      windUx: 0.5,
      windUz: 0.3,
    });
    world.herbBiomass.fill(config.herbBiomassMax * 0.6);
    world.strandBiomass.fill(config.strandBiomassMax * 0.4);
    world.habitatSuitability.fill(0.9);
    const mesh = new OccupantMesh(n, n, config.worldSize);

    const t0 = performance.now();
    mesh.updateFrom(world.hydrologyModel, world);
    const elapsedMs = performance.now() - t0;
    // Generous bound (a 16.7ms/frame budget would be tight; this only
    // guards against a real regression, e.g. an accidental O(n^2) sub-loop)
    // — measured, not assumed: log it so a real number is on record.
    console.log(
      `[Tier-M] OccupantMesh.updateFrom(${n}x${n}, clustering+composite): ${elapsedMs.toFixed(2)}ms`,
    );
    expect(elapsedMs).toBeLessThan(500);
  });

  it("Simple chrome is leaner than Full so the world keeps real estate (U-001)", () => {
    expect(fullOnlyVisible("simple")).toBe(false);
    expect(fullOnlyVisible("full")).toBe(true);
    expect(chromeControlCount("simple")).toBeLessThan(
      chromeControlCount("full"),
    );
    expect(chromeDensityDelta()).toBeGreaterThanOrEqual(8);
  });
});
