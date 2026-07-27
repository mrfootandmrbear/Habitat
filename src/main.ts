import "./style.css";
import { config } from "./config";
import { HeightfieldHydrology } from "./sim/hydrology/HeightfieldHydrology";
import type { HydrologyModel } from "./sim/hydrology/HydrologyModel";
import { generateMountain } from "./sim/terrain/generateMountain";
import { createScene } from "./render/Scene";
import { TerrainMesh } from "./render/TerrainMesh";
import { WaterMesh } from "./render/WaterMesh";
import { mountControls } from "./ui/controls";

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

// Depend on HydrologyModel so a later backend can swap in (T-007).
const model: HydrologyModel = new HeightfieldHydrology(terrain);

const { scene, camera, renderer, controls } = createScene(viewport);
const terrainMesh = new TerrainMesh(n, n, config.worldSize);
const waterMesh = new WaterMesh(n, n, config.worldSize);
scene.add(terrainMesh.mesh);
scene.add(waterMesh.mesh);
terrainMesh.updateFrom(model);
waterMesh.updateFrom(model);

let raining = false;
let steps = 0;

const ui = mountControls(
  app,
  { raining },
  {
    onToggleRain: () => {
      raining = !raining;
      ui.setRaining(raining);
    },
    onReset: () => {
      model.resetWater();
      steps = 0;
      waterMesh.updateFrom(model);
    },
  },
);

let accumulator = 0;
let lastFrame = performance.now();

function syncMeshes(): void {
  waterMesh.updateFrom(model);
}

function frame(now: number): void {
  const wallDt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;
  accumulator += wallDt;

  let stepped = 0;
  while (accumulator >= config.simDt && stepped < config.maxStepsPerFrame) {
    if (raining) {
      model.addRain(config.rainPerSecond * config.simDt);
    }
    model.step(config.simDt);
    steps += 1;
    accumulator -= config.simDt;
    stepped += 1;
  }

  if (stepped > 0) syncMeshes();

  ui.setStatus(
    raining
      ? `Slice 1 · raining · step ${steps}`
      : `Slice 1 · rain off · step ${steps}`,
  );

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
