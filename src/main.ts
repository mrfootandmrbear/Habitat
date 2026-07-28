import "./style.css";
import { config, type InspectorLayer, type SitingTool } from "./config";
import { SimClock } from "./sim/SimClock";
import { WorldState } from "./sim/WorldState";
import { generateMountain } from "./sim/terrain/generateMountain";
import {
  PredictionSession,
  snapshotWaterReader,
} from "./sim/prediction/PredictionSession";
import { createScene } from "./render/Scene";
import { TerrainMesh } from "./render/TerrainMesh";
import { WaterMesh } from "./render/WaterMesh";
import { createExtentCage } from "./render/ExtentCage";
import { SitingCursor } from "./render/SitingCursor";
import { FlowCueMesh } from "./render/FlowCueMesh";
import { mountControls, TIME_SCALE, type TimeRate } from "./ui/controls";
import { pickTerrainCell } from "./ui/siting";
import { formatCutaway, type CutawaySample } from "./ui/cutaway";
import { totalWaterVolume } from "./sim/hydrology/fluxStep";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("#app missing");
}

const viewport = document.createElement("div");
viewport.id = "viewport";
app.appendChild(viewport);

const n = config.gridSize;
const terrain = generateMountain(
  n,
  n,
  config.mountainPeak,
  config.terrainSeed,
);

const world = new WorldState(terrain);
const model = world.hydrologyModel;
const prediction = new PredictionSession(n, n);

const { scene, camera, renderer, controls } = createScene(viewport);
const terrainMesh = new TerrainMesh(n, n, config.worldSize);
const waterMesh = new WaterMesh(n, n, config.worldSize);
const extentCage = createExtentCage(config.worldSize, config.mountainPeak);
const sitingCursor = new SitingCursor(n, n, config.worldSize);
const flowCue = new FlowCueMesh(n, n, config.worldSize);
scene.add(terrainMesh.mesh);
scene.add(waterMesh.mesh);
scene.add(extentCage);
scene.add(sitingCursor.group);
scene.add(flowCue.object);
terrainMesh.updateFrom(model, world, "none", null);
waterMesh.updateFrom(model);

let raining = false;
let timeRate: TimeRate = "1x";
let inspector: InspectorLayer = "none";
let sitingTool: SitingTool = "none";
let steps = 0;
let pointerDown: { x: number; y: number } | null = null;
let cutawayCell: { x: number; z: number } | null = null;

const clock = new SimClock({
  simDt: config.simDt,
  maxStepsPerFrame: config.maxStepsPerFrame,
  timeScale: TIME_SCALE[timeRate],
});

function runCompare(): void {
  if (prediction.phase !== "committed" && prediction.phase !== "compared") {
    return;
  }
  // Snapshot so compare cannot alias live buffers (P-006 write isolation).
  const reader = snapshotWaterReader(n, n, world.water.data);
  prediction.compare(reader);
  syncMeshes();
}

const ui = mountControls(
  app,
  { raining, timeRate, inspector, sitingTool },
  {
    onToggleRain: () => {
      raining = !raining;
      ui.setRaining(raining);
    },
    onReset: () => {
      model.resetWater();
      steps = 0;
      clock.resetDroppedSteps();
      syncMeshes();
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
          "Yellow cell = mark · Commit → rain → Compare",
        );
      } else {
        sitingCursor.setVisible(true);
        ui.setHint("Yellow cell = site · click to place cause (orbit on look)");
      }
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
    world.raiseBerm(cell.x, cell.z);
  } else if (sitingTool === "dig") {
    world.digChannel(cell.x, cell.z);
  }
  syncMeshes();
});

let lastFrame = performance.now();

function sampleCutaway(cell: { x: number; z: number }): CutawaySample {
  return {
    x: cell.x,
    z: cell.z,
    soil: world.getSoilMoisture(cell.x, cell.z),
    water: model.getWaterDepth(cell.x, cell.z),
    veg: world.getVegCover(cell.x, cell.z),
    elev: model.getTerrainHeight(cell.x, cell.z),
  };
}

function syncMeshes(): void {
  world.ensureStructureFresh();
  terrainMesh.updateFrom(model, world, inspector, prediction.overlayClassify());
  waterMesh.updateFrom(model);
  flowCue.updateFrom(model, world);
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
    soil += world.soilMoisture.data[i]!;
  }
  const surface = totalWaterVolume(world.water.data);
  const residual = world.waterBalanceResidual();
  return (
    `H₂O precip ${world.precipitationLedger.toFixed(1)} · ` +
    `surf ${surface.toFixed(1)} · soil ${soil.toFixed(1)} · ` +
    `ET ${world.etLedger.toFixed(1)} · residual ${residual.toFixed(3)}`
  );
}

function frame(now: number): void {
  const wallDt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  const { stepsRun } = clock.tick(wallDt);
  for (let i = 0; i < stepsRun; i++) {
    if (raining) {
      model.addRain(config.rainDepthPerEvent);
    }
    world.stepEvent();
    steps += 1;
  }

  if (prediction.shouldAutoCompare(steps)) {
    runCompare();
  }

  if (stepsRun > 0) {
    syncMeshes();
    if (cutawayCell) {
      ui.setCutaway(formatCutaway(sampleCutaway(cutawayCell)));
    }
  }

  const timeDebt = clock.getTimeDebt();
  const rateLabel = timeRate === "pause" ? "paused" : timeRate;
  const toolLabel =
    sitingTool === "none"
      ? "look"
      : sitingTool === "berm"
        ? "raise berm"
        : sitingTool === "dig"
          ? "dig channel"
          : "predict";
  ui.setStatus(
    `${rateLabel} · ${toolLabel} · ${predictionStatus()} · step ${steps}` +
      (timeDebt > 0 ? ` · timeDebt ${timeDebt}` : "") +
      (raining ? " · raining" : "") +
      ` · ${conservationLine()}`,
  );

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
