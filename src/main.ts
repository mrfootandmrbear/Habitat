import "./style.css";
import { config, type InspectorLayer, type SitingTool } from "./config";
import { SimClock } from "./sim/SimClock";
import { WorldState } from "./sim/WorldState";
import { generateMountain } from "./sim/terrain/generateMountain";
import { createScene } from "./render/Scene";
import { TerrainMesh } from "./render/TerrainMesh";
import { WaterMesh } from "./render/WaterMesh";
import { mountControls, TIME_SCALE, type TimeRate } from "./ui/controls";
import { pickTerrainCell } from "./ui/siting";

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

const { scene, camera, renderer, controls } = createScene(viewport);
const terrainMesh = new TerrainMesh(n, n, config.worldSize);
const waterMesh = new WaterMesh(n, n, config.worldSize);
scene.add(terrainMesh.mesh);
scene.add(waterMesh.mesh);
terrainMesh.updateFrom(model, world, "none");
waterMesh.updateFrom(model);

let raining = false;
let timeRate: TimeRate = "1x";
let inspector: InspectorLayer = "none";
let sitingTool: SitingTool = "none";
let steps = 0;
let pointerDown: { x: number; y: number } | null = null;

const clock = new SimClock({
  simDt: config.simDt,
  maxStepsPerFrame: config.maxStepsPerFrame,
  timeScale: TIME_SCALE[timeRate],
});

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
      // Keep orbit usable; siting uses click without drag.
      controls.enabled = true;
    },
  },
);

const canvas = renderer.domElement;

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
  // Ignore drags so OrbitControls can still orbit.
  if (dx * dx + dy * dy > 25) return;

  const cell = pickTerrainCell(e, canvas, camera, terrainMesh.mesh);
  if (!cell) return;

  // A-005: site a cause — berm raises ground; dig lowers a channel.
  if (sitingTool === "berm") {
    world.raiseBerm(cell.x, cell.z);
  } else if (sitingTool === "dig") {
    world.digChannel(cell.x, cell.z);
  }
  syncMeshes();
});

let lastFrame = performance.now();

function syncMeshes(): void {
  terrainMesh.updateFrom(model, world, inspector);
  waterMesh.updateFrom(model);
}

function frame(now: number): void {
  const wallDt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  const { stepsRun } = clock.tick(wallDt);
  for (let i = 0; i < stepsRun; i++) {
    if (raining) {
      model.addRain(config.rainPerSecond * config.simDt);
    }
    world.stepEvent(config.simDt);
    steps += 1;
  }

  if (stepsRun > 0) syncMeshes();

  const dropped = clock.getDroppedSteps();
  const rateLabel = timeRate === "pause" ? "paused" : timeRate;
  const toolLabel =
    sitingTool === "none"
      ? "look"
      : sitingTool === "berm"
        ? "raise berm"
        : "dig channel";
  ui.setStatus(
    `Slice 5b · ${rateLabel} · ${toolLabel} · step ${steps}` +
      (dropped > 0 ? ` · dropped ${dropped}` : "") +
      (raining ? " · raining" : ""),
  );

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
