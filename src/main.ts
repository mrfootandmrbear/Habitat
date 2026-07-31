import "./style.css";
import { config, type InspectorLayer, type SitingTool } from "./config";
import { SimClock } from "./sim/SimClock";
import { WorldState } from "./sim/WorldState";
import {
  generateIsland,
} from "./sim/terrain/generateIsland";
import { paintSubstrateMosaic, SUBSTRATE_SAND, type DepositMaterialId } from "./sim/terrain/substrates";
import {
  PredictionSession,
  snapshotWaterReader,
} from "./sim/prediction/PredictionSession";
import { createScene } from "./render/Scene";
import { TerrainMesh } from "./render/TerrainMesh";
import { WaterMesh } from "./render/WaterMesh";
import { createExtentCage } from "./render/ExtentCage";
import { OceanMesh } from "./render/OceanMesh";
import { SitingCursor } from "./render/SitingCursor";
import { FlowCueMesh } from "./render/FlowCueMesh";
import { OccupantMesh } from "./render/OccupantMesh";
import { WindArrowMesh } from "./render/WindArrowMesh";
import { RainCueMesh } from "./render/RainCueMesh";
import { CloudMesh } from "./render/CloudMesh";
import { mountControls, TIME_SCALE, type TimeRate } from "./ui/controls";
import { pickTerrainCell } from "./ui/siting";
import { formatCutaway, type CutawaySample } from "./ui/cutaway";
import { totalWaterVolume } from "./sim/hydrology/fluxStep";
import {
  EditUndoStack,
  loadFromLocalStorage,
  saveToLocalStorage,
} from "./sim/sessionPersist";
import {
  rainRegimeById,
  regimeIsWetDay,
  type RainRegimeId,
} from "./sim/climate/rainRegime";
import {
  heatById,
  type HeatId,
} from "./sim/climate/atmosphere";
import {
  stormCueStrength,
  stormSpellArmed,
} from "./ui/stormCue";
import {
  seaLevelById,
  type SeaLevelId,
} from "./sim/climate/seaLevel";
import { tideById, type TideId } from "./sim/climate/tidalEnvelope";
import { windById, type WindId } from "./sim/climate/windRegime";
import { FormMemory } from "./sim/formMemory";
import { BranchSession } from "./sim/branch";
import type { ForceSettings } from "./sim/forceSettings";
import {
  sampleSoundscape,
  snapshotCoverReader,
  snapshotSurfaceDepthReader,
} from "./audio/AudioBus";
import { applyMixToGain, type GainTarget } from "./audio/webAudioHook";
import { mountBriefChrome } from "./ui/briefChrome";
import { mountNotebookChrome } from "./ui/notebookChrome";
import {
  answerNotebook,
  freezeNotebookSnapshot,
} from "./notebook/FieldNotebook";
import type { NotebookQuestionId } from "./notebook/types";
import {
  ScenarioSession,
  livingHollowObjective,
} from "./sim/scenario/ScenarioSession";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("#app missing");
}

const viewport = document.createElement("div");
viewport.id = "viewport";
app.appendChild(viewport);

const n = config.gridSize;
const terrain = generateIsland(
  n,
  n,
  config.mountainPeak,
  config.terrainSeed,
);

const initialSea: SeaLevelId = "mid";
let world = new WorldState(terrain, {
  seaLevel: seaLevelById(initialSea).meters,
  windUx: windById("west").ux,
  windUz: windById("west").uz,
});
paintSubstrateMosaic(
  world.soilMaterial.data,
  world.width,
  world.height,
  world.oceanCells,
  config.terrainSeed,
);
let model = world.hydrologyModel;
const prediction = new PredictionSession(n, n);
const editUndo = new EditUndoStack();
const formMemory = new FormMemory();
const elevDeltaScratch = new Float32Array(n * n);
/** C-005 dual-lane session; null when playing a single world. */
let branchSession: BranchSession | null = null;

function adoptWorld(next: typeof world): void {
  world = next;
  model = world.hydrologyModel;
}

const { scene, camera, renderer, controls } = createScene(viewport);
const terrainMesh = new TerrainMesh(n, n, config.worldSize);
const waterMesh = new WaterMesh(n, n, config.worldSize);
let extentCage = createExtentCage(config.worldSize, config.mountainPeak, {
  seaLevel: world.seaLevel,
  meanHighWater: world.meanHighWater,
});
const oceanMesh = new OceanMesh(config.worldSize);
oceanMesh.setSeaLevel(world.seaLevel);
const sitingCursor = new SitingCursor(n, n, config.worldSize);
const flowCue = new FlowCueMesh(n, n, config.worldSize);
const occupantMesh = new OccupantMesh(n, n, config.worldSize);
const windArrow = new WindArrowMesh(config.worldSize);
windArrow.setWind("west");
const rainCue = new RainCueMesh(config.worldSize);
const cloudMesh = new CloudMesh(config.worldSize);
scene.add(terrainMesh.mesh);
scene.add(waterMesh.mesh);
scene.add(oceanMesh.mesh);
scene.add(extentCage);
scene.add(windArrow.group);
scene.add(cloudMesh.group);
scene.add(rainCue.group);

const briefChrome = mountBriefChrome(app);
const notebookChrome = mountNotebookChrome(app);
let scenarioSession: ScenarioSession | null = null;
let notebookOpen = false;
let notebookQuestion: NotebookQuestionId = "what-changed";

function syncBriefChrome(): void {
  if (!scenarioSession) {
    briefChrome.setState({
      active: false,
      brief: "",
      currentlySatisfied: false,
      achieved: false,
      samplesTaken: 0,
    });
    return;
  }
  const o = scenarioSession.outcome();
  briefChrome.setState({
    active: true,
    brief: scenarioSession.definition.brief,
    currentlySatisfied: o.currentlySatisfied,
    achieved: o.achievedAtSimMinutes !== null,
    samplesTaken: o.samplesTaken,
  });
}

function syncNotebookChrome(): void {
  if (!notebookOpen) {
    notebookChrome.setState({
      open: false,
      question: notebookQuestion,
      answer: null,
    });
    return;
  }
  const snap = freezeNotebookSnapshot({
    surfaceDepth: world.water.data,
    soilMoisture: world.soilMoisture.data,
    groundwater: world.groundwaterStorage.data,
    cover: world.vegCover.data,
    herbBiomass: world.herbBiomass.data,
    strandBiomass: world.strandBiomass.data,
    binderBiomass: world.binderBiomass.data,
    marshBiomass: world.marshBiomass.data,
    fireScar: world.fireScar.data,
    limitingFactor: world.habitatLimitingFactor.data,
    oceanCells: world.oceanCells,
  });
  notebookChrome.setState({
    open: true,
    question: notebookQuestion,
    answer: answerNotebook(notebookQuestion, snap),
  });
}

notebookChrome.onQuestion((id) => {
  notebookQuestion = id;
  syncNotebookChrome();
});

scene.add(sitingCursor.group);
scene.add(flowCue.object);
scene.add(occupantMesh.object);
terrainMesh.updateFrom(model, world, "none", null);
waterMesh.snapFrom(model, world.oceanCells);
occupantMesh.updateFrom(model, world);

let rainRegime: RainRegimeId = "dry";
let heatId: HeatId = "warm";
let windId: WindId = "west";
let seaLevelId: SeaLevelId = initialSea;
let tideId: TideId = "off";
let timeRate: TimeRate = "1x";
let inspector: InspectorLayer = "none";
let sitingTool: SitingTool = "none";
let depositMaterial: DepositMaterialId = SUBSTRATE_SAND;
let steps = 0;
let pointerDown: { x: number; y: number } | null = null;
let cutawayCell: { x: number; z: number } | null = null;
/** Optional Web Audio gain — null until unlocked; mix still computed (C-014). */
let waterGainTarget: GainTarget | null = null;
let lifeGainTarget: GainTarget | null = null;
let lastAudioSilent: boolean | null = null;
let lastLifeSilent: boolean | null = null;

const clock = new SimClock({
  simDt: config.simDt,
  maxStepsPerFrame: config.maxStepsPerFrame,
  timeScale: TIME_SCALE[timeRate],
});

// Atmosphere Process owns delivery — seed force dials on WorldState.
world.setRainRegime(rainRegime);
world.setAirTemperature(heatById(heatId).airTempC);
{
  const w0 = windById(windId);
  world.setWind(w0.ux, w0.uz);
}

function runCompare(): void {
  if (prediction.phase !== "committed" && prediction.phase !== "compared") {
    return;
  }
  // Snapshot so compare cannot alias live buffers (P-006 write isolation).
  const reader = snapshotWaterReader(n, n, world.water.data);
  prediction.compare(reader);
  syncMeshes();
}

function fillElevDelta(): Float32Array | null {
  if (branchSession?.compareMode) {
    branchSession.fillMoistureCompareDelta(elevDeltaScratch);
    return elevDeltaScratch;
  }
  if (!formMemory.hasThen) return null;
  for (let i = 0; i < world.terrain.data.length; i++) {
    const x = i % n;
    const z = (i / n) | 0;
    elevDeltaScratch[i] = formMemory.deltaAt(world.terrain.data, x, z);
  }
  return elevDeltaScratch;
}

function currentForces(): ForceSettings {
  return {
    rain: rainRegime,
    heat: heatId,
    sea: seaLevelId,
    tide: tideId,
    wind: windId,
  };
}

function syncForceUiFrom(forces: ForceSettings): void {
  rainRegime = forces.rain;
  heatId = forces.heat;
  seaLevelId = forces.sea;
  tideId = forces.tide;
  windId = forces.wind;
  ui.setRainRegime(forces.rain);
  ui.setHeat(forces.heat);
  ui.setSeaLevel(forces.sea);
  ui.setTide(forces.tide);
  ui.setWind(forces.wind);
  windArrow.setWind(forces.wind);
  oceanMesh.setSeaLevel(seaLevelById(forces.sea).meters);
  rebuildExtentCage();
}

function showBranchLane(lane: "a" | "b"): void {
  if (!branchSession) return;
  branchSession.setActive(lane);
  adoptWorld(branchSession.activeWorld);
  syncForceUiFrom(branchSession.forcesOn(lane));
  syncMeshes();
  syncWaterDisplay(0, true);
  ui.setHint(
    branchSession.compareMode
      ? `Showing ${lane.toUpperCase()} · compare tint is moisture vs the other lane`
      : `Showing ${lane.toUpperCase()} — set forces, run time, then Compare branches`,
  );
}

const ui = mountControls(
  app,
  {
    rainRegime,
    heat: heatId,
    seaLevel: seaLevelId,
    tide: tideId,
    wind: windId,
    timeRate,
    inspector,
    sitingTool,
    depositMaterial,
  },
  {
    onRainRegime: (id) => {
      rainRegime = id;
      world.setRainRegime(id);
      ui.setRainRegime(id);
      ui.setHint(
        `Climate: ${rainRegimeById(id).label} — watch the sky build a spell`,
      );
    },
    onHeat: (id) => {
      heatId = id;
      const h = heatById(id);
      world.setAirTemperature(h.airTempC);
      ui.setHeat(id);
      ui.setHint(
        `${h.label} — precip phase follows air temperature (rain / sleet / snow)`,
      );
    },
    onWind: (id) => {
      windId = id;
      const w = windById(id);
      world.setWind(w.ux, w.uz);
      windArrow.setWind(id);
      ui.setWind(id);
      ui.setHint(
        id === "calm"
          ? "Wind calm — no arrow; shores idle"
          : `${w.label} — warm mark is where the wind comes from; tip shows blow`,
      );
      syncMeshes();
    },
    onTide: (id) => {
      tideId = id;
      const amp = tideById(id).amplitudeMeters;
      world.setTidalAmplitude(amp);
      ui.setTide(id);
      rebuildExtentCage();
      const mhw = world.meanHighWater;
      const mlw = world.meanLowWater;
      ui.setHint(
        amp <= 0 || mhw === undefined || mlw === undefined
          ? "Tide off — no intertidal band"
          : `${tideById(id).label} — upper ring is mean high water; tinted shore is the band`,
      );
      syncMeshes();
    },
    onToggleBrief: () => {
      if (scenarioSession) {
        scenarioSession = null;
        syncBriefChrome();
        ui.setHint("Brief dismissed — sandbox continues (G-001)");
        return;
      }
      scenarioSession = new ScenarioSession(livingHollowObjective());
      syncBriefChrome();
      ui.setHint("Brief accepted — same loop, finite objective (G-002)");
    },
    onToggleNotebook: () => {
      notebookOpen = !notebookOpen;
      syncNotebookChrome();
      ui.setHint(
        notebookOpen
          ? "Notebook open — ask after you have noticed something (U-004 / U-006)"
          : "Notebook closed — look at the place",
      );
    },
    onSeaLevel: (id) => {
      seaLevelId = id;
      const meters = seaLevelById(id).meters;
      world.setSeaLevel(meters);
      oceanMesh.setSeaLevel(meters);
      rebuildExtentCage();
      syncMeshes();
      ui.setSeaLevel(id);
      ui.setHint(
        meters === undefined
          ? "Sea off — legacy perimeter drainage"
          : `Sea level ${meters.toFixed(1)} m · shore ${world.shorelineCellCount()} cells`,
      );
    },
    onReset: () => {
      model.resetWater();
      steps = 0;
      clock.resetDroppedSteps();
      syncMeshes();
      syncWaterDisplay(0, true);
    },
    onTimeRate: (rate) => {
      timeRate = rate;
      clock.setTimeScale(TIME_SCALE[rate]);
      ui.setTimeRate(rate);
    },
    onInspector: (layer) => {
      inspector = layer;
      ui.setInspector(layer);
      syncMeshes();
    },
    onSitingTool: (tool) => {
      sitingTool = tool;
      ui.setSitingTool(tool);
      controls.enabled = true;
      if (tool === "none") {
        sitingCursor.setVisible(false);
        ui.setHint(
          "Look mode · pick a tool for yellow cell cursor + cutaway",
        );
      } else if (tool === "predict") {
        sitingCursor.setVisible(true);
        ui.setHint(
          "Yellow cell = mark · Commit → set Rain regime → Compare",
        );
      } else if (tool === "deposit") {
        sitingCursor.setVisible(true);
        ui.setHint(
          "Deposit = geological dump — raises ground and sets sand/clay/rock",
        );
      } else {
        sitingCursor.setVisible(true);
        ui.setHint("Yellow cell = site · click to place cause (orbit on look)");
      }
    },
    onDepositMaterial: (id) => {
      depositMaterial = id;
      ui.setDepositMaterial(id);
    },
    onCommitPrediction: () => {
      if (prediction.commit(steps)) {
        syncMeshes();
      }
    },
    onComparePrediction: () => {
      runCompare();
    },
    onClearPrediction: () => {
      prediction.clear();
      syncMeshes();
    },
    onRememberForm: () => {
      formMemory.capture(world.terrain.data, n, n);
      syncMeshes();
      ui.setHint("Remembered form — run time, then look for change tint");
    },
    onBranch: () => {
      branchSession = BranchSession.open(world, currentForces());
      adoptWorld(branchSession.activeWorld);
      ui.setBranchMode(true);
      syncMeshes();
      syncWaterDisplay(0, true);
      ui.setHint(
        "Branched A = B — change forces on one lane, run time, Compare branches",
      );
    },
    onShowBranchA: () => {
      showBranchLane("a");
    },
    onShowBranchB: () => {
      showBranchLane("b");
    },
    onCompareBranches: () => {
      if (!branchSession) return;
      branchSession.compareMode = !branchSession.compareMode;
      syncMeshes();
      ui.setHint(
        branchSession.compareMode
          ? "Compare on — cool/warm tint is wetter/drier than the other lane"
          : "Compare off — looking at this lane alone",
      );
    },
    onEndBranch: () => {
      if (!branchSession) return;
      const kept = branchSession.activeWorld;
      branchSession = null;
      adoptWorld(kept);
      ui.setBranchMode(false);
      syncMeshes();
      syncWaterDisplay(0, true);
      ui.setHint("Kept this branch as the live world");
    },
    onSave: () => {
      try {
        saveToLocalStorage(world);
        ui.setHint(`Saved · hash ${world.stateHash()}`);
      } catch (err) {
        ui.setHint(
          `Save failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    onLoad: () => {
      try {
        if (branchSession) {
          branchSession = null;
          ui.setBranchMode(false);
        }
        if (!loadFromLocalStorage(world)) {
          ui.setHint("No saved world in this browser");
          return;
        }
        editUndo.noteEditEpoch();
        formMemory.clear();
        prediction.clear();
        steps = 0;
        clock.resetDroppedSteps();
        syncMeshes();
        syncWaterDisplay(0, true);
        ui.setUndoEnabled(false);
        ui.setHint(`Loaded · hash ${world.stateHash()}`);
      } catch (err) {
        ui.setHint(
          `Load failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    onUndo: () => {
      if (!editUndo.undo(world)) {
        ui.setHint("Nothing to undo (edits only, before time runs)");
        return;
      }
      syncMeshes();
      ui.setUndoEnabled(editUndo.canUndo);
      ui.setHint("Undid last terrain edit");
    },
  },
);

const canvas = renderer.domElement;

canvas.addEventListener("pointermove", (e) => {
  if (sitingTool === "none") return;
  const cell = pickTerrainCell(e, canvas, camera, terrainMesh.mesh);
  if (!cell) {
    sitingCursor.setVisible(false);
    return;
  }
  const y = model.getTerrainHeight(cell.x, cell.z);
  const cellW = config.worldSize / (n - 1);
  const ox = -config.worldSize / 2;
  sitingCursor.setFromWorld(
    ox + cell.x * cellW,
    ox + cell.z * cellW,
    y,
  );
  cutawayCell = cell;
  ui.setCutaway(formatCutaway(sampleCutaway(cell)));
});

canvas.addEventListener("pointerdown", (e) => {
  if (sitingTool === "none" || e.button !== 0) return;
  pointerDown = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener("pointerup", (e) => {
  if (sitingTool === "none" || e.button !== 0 || !pointerDown) {
    pointerDown = null;
    return;
  }
  const dx = e.clientX - pointerDown.x;
  const dy = e.clientY - pointerDown.y;
  pointerDown = null;
  if (dx * dx + dy * dy > 25) return;

  const cell = pickTerrainCell(e, canvas, camera, terrainMesh.mesh);
  if (!cell) return;
  cutawayCell = cell;
  ui.setCutaway(formatCutaway(sampleCutaway(cell)));

  if (sitingTool === "predict") {
    prediction.toggleMark(cell.x, cell.z);
    syncMeshes();
    return;
  }

  if (sitingTool === "berm") {
    editUndo.pushCheckpoint(world);
    world.raiseBerm(cell.x, cell.z);
    ui.setUndoEnabled(editUndo.canUndo);
  } else if (sitingTool === "dig") {
    editUndo.pushCheckpoint(world);
    world.digChannel(cell.x, cell.z);
    ui.setUndoEnabled(editUndo.canUndo);
  } else if (sitingTool === "deposit") {
    editUndo.pushCheckpoint(world);
    world.depositSubstrate(cell.x, cell.z, depositMaterial);
    ui.setUndoEnabled(editUndo.canUndo);
  } else if (sitingTool === "ignite") {
    // Authored ignition only (C-003 Open) — pulse cause, not stochastic (A-002 / A-005).
    world.igniteCell(cell.x, cell.z);
  }
  syncMeshes();
});

let lastFrame = performance.now();

function sampleCutaway(cell: { x: number; z: number }): CutawaySample {
  return {
    x: cell.x,
    z: cell.z,
    soil: world.getSoilMoisture(cell.x, cell.z),
    soilDepth: world.getSoilDepth(cell.x, cell.z),
    water: model.getWaterDepth(cell.x, cell.z),
    veg: world.getVegCover(cell.x, cell.z),
    elev: model.getTerrainHeight(cell.x, cell.z),
    hsi: world.getHabitatSuitability(cell.x, cell.z),
    limiting: world.getLimitingFactor(cell.x, cell.z),
    herbBiomass: world.getHerbBiomass(cell.x, cell.z),
    strandBiomass: world.getStrandBiomass(cell.x, cell.z),
    binderBiomass: world.getBinderBiomass(cell.x, cell.z),
    marshBiomass: world.getMarshBiomass(cell.x, cell.z),
    salinity: world.getSoilSalinity(cell.x, cell.z),
  };
}

function syncAudio(): void {
  // Observer only — snapshot so the bus cannot alias live buffers (T-006).
  const scape = sampleSoundscape(
    snapshotSurfaceDepthReader(n, n, world.water.data),
    snapshotCoverReader(n, n, world.vegCover.data),
  );
  applyMixToGain(scape.water, waterGainTarget);
  applyMixToGain(scape.life, lifeGainTarget);
  if (lastAudioSilent !== scape.water.silent) {
    lastAudioSilent = scape.water.silent;
    if (scape.water.silent && rainRegime === "dry") {
      ui.setHint("The hollow went quiet when the water left.");
    }
  }
  if (lastLifeSilent !== scape.life.silent) {
    lastLifeSilent = scape.life.silent;
    if (!scape.life.silent && scape.life.level >= 0.2) {
      ui.setHint("The green came back, and the place sounded fuller.");
    }
  }
}

function rebuildExtentCage(): void {
  scene.remove(extentCage);
  extentCage.geometry.dispose();
  (extentCage.material as import("three").Material).dispose();
  extentCage = createExtentCage(config.worldSize, config.mountainPeak, {
    seaLevel: world.seaLevel,
    meanHighWater: world.meanHighWater,
  });
  scene.add(extentCage);
}

let lastFlowCueWall = 0;

function syncMeshes(nowWall?: number): void {
  world.ensureStructureFresh();
  terrainMesh.updateFrom(
    model,
    world,
    inspector,
    prediction.overlayClassify(),
    fillElevDelta(),
  );
  // Flow ticks every event look like strobe at 16× — refresh ~4 Hz max.
  if (nowWall === undefined || nowWall - lastFlowCueWall >= 0.25) {
    flowCue.updateFrom(model, world);
    if (nowWall !== undefined) lastFlowCueWall = nowWall;
  }
  occupantMesh.updateFrom(model, world);
  syncAudio();
}

/** Presentation: storm event active (rain cue + muted shallow sheet). */
let stormDisplayActive = false;
/** Wall-seconds remaining after spell unarms — stops 16× strobe (G1). */
let stormReleaseHold = 0;
const STORM_RELEASE_HOLD_S = 1.6;

function climateDayIndex(): number {
  return Math.floor(
    world.simMinutes / config.eventDtMinutes / config.dailyEventSteps,
  );
}

function syncWaterDisplay(wallDt: number, snap = false): void {
  if (snap) waterMesh.snapFrom(model, world.oceanCells);
  else waterMesh.updateFrom(model, world.oceanCells, wallDt, stormDisplayActive);
}

function predictionStatus(): string {
  const nMarks = prediction.markCount;
  if (prediction.phase === "compared" && prediction.lastCompare) {
    const c = prediction.lastCompare;
    return `pred hit ${c.hits} miss ${c.misses} extra ${c.unexpected}`;
  }
  if (prediction.phase === "committed") {
    const since = prediction.stepsSinceCommit(steps) ?? 0;
    return `pred committed ${nMarks} · ${since}/${config.predictionHorizonSteps}`;
  }
  if (prediction.phase === "marking") {
    return `pred marking ${nMarks}`;
  }
  return "pred idle";
}

function conservationLine(): string {
  let soil = 0;
  for (let i = 0; i < world.soilMoisture.data.length; i++) {
    soil += world.soilStorageDepth(i);
  }
  const surface = totalWaterVolume(world.water.data);
  const residual = world.waterBalanceResidual();
  const ocean = world.oceanExchangeLedger;
  return (
    `H₂O precip ${world.precipitationLedger.toFixed(1)} · ` +
    `surf ${surface.toFixed(1)} · soil ${soil.toFixed(1)} · ` +
    `ET ${world.etLedger.toFixed(1)} · ocean ${ocean.toFixed(1)} · ` +
    `residual ${residual.toFixed(3)}`
  );
}

function frame(now: number): void {
  const wallDt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  const { stepsRun } = clock.tick(wallDt);
  const wind = windById(windId);
  let rainingThisTick = false;
  let phaseThisTick = world.precipPhase;
  for (let i = 0; i < stepsRun; i++) {
    try {
      const precipBefore = world.precipitationLedger;
      if (branchSession) {
        branchSession.stepBoth();
      } else {
        world.stepEvent();
      }
      if (world.precipitationLedger > precipBefore) {
        rainingThisTick = true;
        phaseThisTick = world.precipPhase;
      }
      if (scenarioSession) {
        scenarioSession.observe(world);
        syncBriefChrome();
      }
      steps += 1;
    } catch (err) {
      clock.setTimeScale(0);
      timeRate = "pause";
      ui.setTimeRate("pause");
      const msg = err instanceof Error ? err.message : String(err);
      ui.setHint(`Sim paused — ${msg.slice(0, 120)}`);
      console.error(err);
      break;
    }
  }
  // Storm + cloud cues — hold across wet block / cloud charge (G1; T-006).
  cloudMesh.setAtmosphere(world.cloudWater, world.precipPhase);
  cloudMesh.update(wallDt, wind.ux, wind.uz);
  if (stepsRun > 0) {
    const wetDay = regimeIsWetDay(
      rainRegimeById(rainRegime),
      climateDayIndex(),
    );
    const armed = stormSpellArmed({
      rainingThisTick,
      cloudWater: world.cloudWater,
      wetDay,
    });
    if (armed) {
      stormReleaseHold = STORM_RELEASE_HOLD_S;
      stormDisplayActive = true;
    } else if (stormReleaseHold > 0) {
      stormReleaseHold = Math.max(0, stormReleaseHold - wallDt);
      stormDisplayActive = true;
    } else {
      stormDisplayActive = false;
    }
    const strength = stormCueStrength(rainRegime);
    rainCue.setStorm(stormDisplayActive, strength, phaseThisTick);
  } else if (timeRate === "pause") {
    stormDisplayActive = false;
    stormReleaseHold = 0;
    rainCue.setStorm(false);
  }
  rainCue.update(wallDt, wind.ux, wind.uz);

  if (prediction.shouldAutoCompare(steps)) {
    runCompare();
  }

  if (stepsRun > 0) {
    editUndo.noteTimeAdvanced();
    ui.setUndoEnabled(false);
    syncMeshes(now / 1000);
    if (cutawayCell) {
      ui.setCutaway(formatCutaway(sampleCutaway(cutawayCell)));
    }
  }
  // Water display catches up every wall frame — not every event step.
  syncWaterDisplay(wallDt);

  const timeDebt = clock.getTimeDebt();
  const rateLabel = timeRate === "pause" ? "paused" : timeRate;
  const toolLabel =
    sitingTool === "none"
      ? "look"
      : sitingTool === "berm"
        ? "raise berm"
        : sitingTool === "dig"
          ? "dig channel"
          : sitingTool === "deposit"
            ? "deposit"
            : sitingTool === "ignite"
              ? "ignite"
              : "predict";
  ui.setStatus(
    `${rateLabel} · ${toolLabel} · ${predictionStatus()} · step ${steps}` +
      (timeDebt > 0 ? ` · timeDebt ${timeDebt}` : "") +
      ` · ${rainRegimeById(rainRegime).label}` +
      ` · ${windById(windId).label}` +
      ` · ${tideById(tideId).label}` +
      (formMemory.hasThen ? " · then" : "") +
      (branchSession
        ? ` · branch ${branchSession.active.toUpperCase()}${branchSession.compareMode ? "↔" : ""}`
        : "") +
      ` · ${conservationLine()}`,
  );

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
