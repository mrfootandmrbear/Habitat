import "./style.css";
import { config } from "./config";
import { SimClock } from "./sim/SimClock";
import { WorldState } from "./sim/WorldState";
import { generateMountain } from "./sim/terrain/generateMountain";
import { createScene } from "./render/Scene";
import { TerrainMesh } from "./render/TerrainMesh";
import { WaterMesh } from "./render/WaterMesh";
import { mountControls, TIME_SCALE, type TimeRate } from "./ui/controls";

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
const model = world.hydrology;

const { scene, camera, renderer, controls } = createScene(viewport);
const terrainMesh = new TerrainMesh(n, n, config.worldSize);
const waterMesh = new WaterMesh(n, n, config.worldSize);
scene.add(terrainMesh.mesh);
scene.add(waterMesh.mesh);
terrainMesh.updateFrom(model);
waterMesh.updateFrom(model);

let raining = false;
let timeRate: TimeRate = "1x";
let steps = 0;

const clock = new SimClock({
  simDt: config.simDt,
  maxStepsPerFrame: config.maxStepsPerFrame,
  timeScale: TIME_SCALE[timeRate],
});

const ui = mountControls(
  app,
  { raining, timeRate },
  {
    onToggleRain: () => {
      raining = !raining;
      ui.setRaining(raining);
    },
    onReset: () => {
      model.resetWater();
      steps = 0;
      clock.resetDroppedSteps();
      waterMesh.updateFrom(model);
    },
    onTimeRate: (rate) => {
      timeRate = rate;
      clock.setTimeScale(TIME_SCALE[rate]);
      ui.setTimeRate(rate);
    },
  },
);

let lastFrame = performance.now();

function syncMeshes(): void {
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
    model.step(config.simDt);
    steps += 1;
  }

  if (stepsRun > 0) syncMeshes();

  const dropped = clock.getDroppedSteps();
  const rateLabel = timeRate === "pause" ? "paused" : timeRate;
  ui.setStatus(
    `Slice 2 · ${rateLabel} · step ${steps}` +
      (dropped > 0 ? ` · dropped ${dropped}` : "") +
      (raining ? " · raining" : ""),
  );

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
