import type {
  InspectorLayer,
  MoldShape,
  SitingBrushSize,
  SitingTool,
} from "../config";
import {
  HEAT_REGIMES,
  type HeatId,
} from "../sim/climate/atmosphere";
import {
  RAIN_REGIMES,
  type RainRegimeId,
} from "../sim/climate/rainRegime";
import {
  SEA_LEVEL_REGIMES,
  type SeaLevelId,
} from "../sim/climate/seaLevel";
import {
  TIDE_REGIMES,
  type TideId,
} from "../sim/climate/tidalEnvelope";
import {
  WIND_REGIMES,
  type WindId,
} from "../sim/climate/windRegime";
import {
  SEASON_REGIMES,
  type SeasonId,
} from "../sim/climate/seasonRegime";
import {
  EROSION_REGIMES,
  type ErosionId,
} from "../sim/climate/erosionRegime";
import {
  SUBSTRATE_CLAY,
  SUBSTRATE_ROCK,
  SUBSTRATE_SAND,
  type DepositMaterialId,
} from "../sim/terrain/substrates";
import {
  CHROME_DENSITY_STORAGE_KEY,
  type ChromeDensity,
  resolveChromeDensity,
} from "./chromeDensity";
import { sustainableRates, rateDescription, type TimeRateId } from "./timeRates";

function markFullOnly(el: HTMLElement): void {
  el.classList.add("chrome-full");
  el.dataset.chromeTier = "full";
}

function makeRow(id: string, ariaLabel: string): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "chrome-row";
  row.id = id;
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", ariaLabel);
  return row;
}

/** Rate ids and their sim-time-per-wall-second meaning live in `timeRates.ts`. */
export type TimeRate = TimeRateId;

const LAYERS: { id: InspectorLayer; label: string }[] = [
  { id: "none", label: "View: terrain" },
  { id: "water", label: "Inspect: water" },
  { id: "accumulation", label: "Inspect: flow accumulation" },
  { id: "watershed", label: "Inspect: watershed" },
  { id: "soilMoisture", label: "Inspect: soil moisture" },
  { id: "soilDepth", label: "Inspect: soil depth" },
  { id: "vegetation", label: "Inspect: vegetation cover" },
  { id: "depression", label: "Inspect: depression depth" },
  { id: "groundwater", label: "Inspect: groundwater" },
  { id: "limitingFactor", label: "Inspect: limiting factor" },
  { id: "suitability", label: "Inspect: habitat suitability" },
  { id: "understoryLight", label: "Inspect: understory light" },
  { id: "fuelLoad", label: "Inspect: fuel load" },
  { id: "potentialEt", label: "Inspect: potential ET" },
  { id: "actualEt", label: "Inspect: actual ET" },
  { id: "herbBiomass", label: "Inspect: herb biomass" },
  { id: "strandBiomass", label: "Inspect: strand biomass" },
  { id: "binderBiomass", label: "Inspect: binder biomass" },
  { id: "marshBiomass", label: "Inspect: marsh biomass" },
  { id: "shrubBiomass", label: "Inspect: shrub biomass" },
  { id: "crustBiomass", label: "Inspect: crust biomass" },
  { id: "seedBank", label: "Inspect: herb seed bank" },
  { id: "intertidal", label: "Inspect: intertidal" },
  { id: "shoreExposure", label: "Inspect: shore exposure" },
  { id: "shoreLongshore", label: "Inspect: shore longshore" },
  { id: "salinity", label: "Inspect: soil salinity" },
];

/** Cause tools (A-005) + predict marks (P-006). Geological deposit = C-009. */
const SITING: { id: SitingTool; label: string }[] = [
  { id: "none", label: "Tool: look" },
  { id: "predict", label: "Tool: predict wet" },
  { id: "berm", label: "Tool: raise berm" },
  { id: "dig", label: "Tool: dig channel" },
  { id: "deposit", label: "Tool: deposit" },
  { id: "flatten", label: "Tool: flatten" },
  { id: "mold", label: "Tool: mold" },
  { id: "ignite", label: "Tool: ignite (authored)" },
];

/** Brush size tiers (C-028 / §4.55) — craft names, still causes. */
const BRUSH_SIZES: { id: SitingBrushSize; label: string }[] = [
  { id: "bucket", label: "Brush: bucket" },
  { id: "shovel", label: "Brush: shovel" },
];

/** Geometric mold footprints (C-028 / §4.57) — one-shot form causes (A-005). */
const MOLD_SHAPES: { id: MoldShape; label: string }[] = [
  { id: "cylinder", label: "Mold: cylinder mound" },
  { id: "pyramid", label: "Mold: pyramid" },
  { id: "terrace", label: "Mold: square terrace" },
];

const MATERIAL_LABEL: Record<DepositMaterialId, string> = {
  [SUBSTRATE_SAND]: "Material: sand",
  [SUBSTRATE_CLAY]: "Material: clay",
  [SUBSTRATE_ROCK]: "Material: rock",
};

export function mountControls(
  parent: HTMLElement,
  initial: {
    rainRegime: RainRegimeId;
    heat: HeatId;
    seaLevel: SeaLevelId;
    tide: TideId;
    wind: WindId;
    season: SeasonId;
    erosion: ErosionId;
    timeRate: TimeRate;
    inspector: InspectorLayer;
    sitingTool: SitingTool;
    sitingBrushSize: SitingBrushSize;
    moldShape: MoldShape;
    depositMaterial: DepositMaterialId;
    /** Island terrain seed (T-001 — regenerates the exact landscape). */
    terrainSeed: number;
  },
  handlers: {
    onRainRegime: (id: RainRegimeId) => void;
    onHeat: (id: HeatId) => void;
    onSeaLevel: (id: SeaLevelId) => void;
    onTide: (id: TideId) => void;
    onWind: (id: WindId) => void;
    onSeason: (id: SeasonId) => void;
    onErosion: (id: ErosionId) => void;
    onReset: () => void;
    onNewIsland: (seed: number) => void;
    onTimeRate: (rate: TimeRate) => void;
    onInspector: (layer: InspectorLayer) => void;
    onSitingTool: (tool: SitingTool) => void;
    onSitingBrushSize: (size: SitingBrushSize) => void;
    onMoldShape: (shape: MoldShape) => void;
    onDepositMaterial: (id: DepositMaterialId) => void;
    onCommitPrediction: () => void;
    onComparePrediction: () => void;
    onClearPrediction: () => void;
    onSave: () => void;
    onLoad: () => void;
    onUndo: () => void;
    onRememberForm: () => void;
    onBranch: () => void;
    onShowBranchA: () => void;
    onShowBranchB: () => void;
    onCompareBranches: () => void;
    onEndBranch: () => void;
    onToggleBrief: () => void;
    onToggleNotebook: () => void;
  },
): {
  setRainRegime: (id: RainRegimeId) => void;
  setHeat: (id: HeatId) => void;
  setSeaLevel: (id: SeaLevelId) => void;
  setTide: (id: TideId) => void;
  setWind: (id: WindId) => void;
  setSeason: (id: SeasonId) => void;
  setErosion: (id: ErosionId) => void;
  setTimeRate: (rate: TimeRate) => void;
  setInspector: (layer: InspectorLayer) => void;
  setSitingTool: (tool: SitingTool) => void;
  setSitingBrushSize: (size: SitingBrushSize) => void;
  setMoldShape: (shape: MoldShape) => void;
  setDepositMaterial: (id: DepositMaterialId) => void;
  setTerrainSeed: (seed: number) => void;
  setStatus: (text: string) => void;
  setHint: (text: string) => void;
  setCutaway: (text: string) => void;
  setUndoEnabled: (enabled: boolean) => void;
  setBranchMode: (active: boolean) => void;
  setChromeDensity: (density: ChromeDensity) => void;
  getChromeDensity: () => ChromeDensity;
} {
  const bar = document.createElement("div");
  bar.id = "controls";
  bar.setAttribute("aria-label", "Habitat controls");

  let chromeDensity: ChromeDensity = "simple";
  try {
    chromeDensity = resolveChromeDensity(
      globalThis.localStorage?.getItem(CHROME_DENSITY_STORAGE_KEY),
    );
  } catch {
    chromeDensity = "simple";
  }

  const densityGroup = document.createElement("div");
  densityGroup.id = "chrome-density";
  densityGroup.setAttribute("role", "group");
  densityGroup.setAttribute(
    "aria-label",
    "Control density (U-001 — Simple or Full)",
  );

  const simpleBtn = document.createElement("button");
  simpleBtn.type = "button";
  simpleBtn.id = "chrome-simple";
  simpleBtn.textContent = "Simple";
  simpleBtn.setAttribute(
    "aria-label",
    "Simple controls — sculpt, primary forces, time",
  );

  const fullBtn = document.createElement("button");
  fullBtn.type = "button";
  fullBtn.id = "chrome-full";
  fullBtn.textContent = "Full";
  fullBtn.setAttribute(
    "aria-label",
    "Full controls — all force dials, inspect, branch, session",
  );

  const applyChromeDensity = (density: ChromeDensity): void => {
    chromeDensity = density;
    bar.dataset.chrome = density;
    simpleBtn.classList.toggle("active", density === "simple");
    fullBtn.classList.toggle("active", density === "full");
    simpleBtn.setAttribute("aria-pressed", String(density === "simple"));
    fullBtn.setAttribute("aria-pressed", String(density === "full"));
    try {
      globalThis.localStorage?.setItem(CHROME_DENSITY_STORAGE_KEY, density);
    } catch {
      /* private mode / no storage — density still applies for the session */
    }
  };

  simpleBtn.addEventListener("click", () => applyChromeDensity("simple"));
  fullBtn.addEventListener("click", () => applyChromeDensity("full"));
  densityGroup.append(simpleBtn, fullBtn);

  const forcePanel = document.createElement("fieldset");
  forcePanel.id = "force-panel";
  forcePanel.setAttribute("aria-label", "Forces (C-004 — global regimes)");
  const forceLegend = document.createElement("legend");
  forceLegend.textContent = "Forces";
  forcePanel.appendChild(forceLegend);

  const rainSelect = document.createElement("select");
  rainSelect.id = "rain-regime";
  rainSelect.setAttribute(
    "aria-label",
    "Mean rainfall climate (C-004 force dial)",
  );
  for (const regime of RAIN_REGIMES) {
    const opt = document.createElement("option");
    opt.value = regime.id;
    opt.textContent = regime.label;
    rainSelect.appendChild(opt);
  }
  rainSelect.value = initial.rainRegime;
  rainSelect.addEventListener("change", () => {
    handlers.onRainRegime(rainSelect.value as RainRegimeId);
  });

  const heatSelect = document.createElement("select");
  heatSelect.id = "heat-regime";
  heatSelect.setAttribute(
    "aria-label",
    "Heat (C-020 — air temperature → rain/snow/sleet phase)",
  );
  for (const regime of HEAT_REGIMES) {
    const opt = document.createElement("option");
    opt.value = regime.id;
    opt.textContent = regime.label;
    heatSelect.appendChild(opt);
  }
  heatSelect.value = initial.heat;
  heatSelect.addEventListener("change", () => {
    handlers.onHeat(heatSelect.value as HeatId);
  });
  markFullOnly(heatSelect);

  const seaSelect = document.createElement("select");
  seaSelect.id = "sea-level";
  seaSelect.setAttribute(
    "aria-label",
    "Sea level (C-015 force dial — global, no place targeting)",
  );
  for (const regime of SEA_LEVEL_REGIMES) {
    const opt = document.createElement("option");
    opt.value = regime.id;
    opt.textContent = regime.label;
    seaSelect.appendChild(opt);
  }
  seaSelect.value = initial.seaLevel;
  seaSelect.addEventListener("change", () => {
    handlers.onSeaLevel(seaSelect.value as SeaLevelId);
  });

  const tideSelect = document.createElement("select");
  tideSelect.id = "tide-envelope";
  tideSelect.setAttribute(
    "aria-label",
    "Tide envelope (C-016 — MHW/MLW globals, no phase)",
  );
  for (const regime of TIDE_REGIMES) {
    const opt = document.createElement("option");
    opt.value = regime.id;
    opt.textContent = regime.label;
    tideSelect.appendChild(opt);
  }
  tideSelect.value = initial.tide;
  tideSelect.addEventListener("change", () => {
    handlers.onTide(tideSelect.value as TideId);
  });
  markFullOnly(tideSelect);

  const windSelect = document.createElement("select");
  windSelect.id = "wind-regime";
  windSelect.setAttribute(
    "aria-label",
    "Wind (C-020 lite — orographic mean rain, no place targeting)",
  );
  for (const regime of WIND_REGIMES) {
    const opt = document.createElement("option");
    opt.value = regime.id;
    opt.textContent = regime.label;
    windSelect.appendChild(opt);
  }
  windSelect.value = initial.wind;
  windSelect.addEventListener("change", () => {
    handlers.onWind(windSelect.value as WindId);
  });

  const seasonSelect = document.createElement("select");
  seasonSelect.id = "season-regime";
  seasonSelect.setAttribute(
    "aria-label",
    "Season (C-021 force dial — phenology pressure, distinct from Heat)",
  );
  for (const regime of SEASON_REGIMES) {
    const opt = document.createElement("option");
    opt.value = regime.id;
    opt.textContent = regime.label;
    seasonSelect.appendChild(opt);
  }
  seasonSelect.value = initial.season;
  seasonSelect.addEventListener("change", () => {
    handlers.onSeason(seasonSelect.value as SeasonId);
  });
  markFullOnly(seasonSelect);

  const erosionSelect = document.createElement("select");
  erosionSelect.id = "erosion-intensity";
  erosionSelect.setAttribute(
    "aria-label",
    "Erosion intensity (C-022 force dial — storminess, no cell targeting)",
  );
  for (const regime of EROSION_REGIMES) {
    const opt = document.createElement("option");
    opt.value = regime.id;
    opt.textContent = regime.label;
    erosionSelect.appendChild(opt);
  }
  erosionSelect.value = initial.erosion;
  erosionSelect.addEventListener("change", () => {
    handlers.onErosion(erosionSelect.value as ErosionId);
  });
  markFullOnly(erosionSelect);

  forcePanel.append(
    rainSelect,
    seaSelect,
    windSelect,
    heatSelect,
    tideSelect,
    seasonSelect,
    erosionSelect,
  );

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.id = "reset-water";
  resetBtn.textContent = "Reset water";
  resetBtn.addEventListener("click", handlers.onReset);
  markFullOnly(resetBtn);

  const seedGroup = document.createElement("div");
  seedGroup.id = "seed-actions";
  seedGroup.setAttribute("role", "group");
  seedGroup.setAttribute(
    "aria-label",
    "Island seed (T-001 — same seed, same landscape)",
  );

  const seedInput = document.createElement("input");
  seedInput.type = "number";
  seedInput.id = "terrain-seed";
  seedInput.setAttribute("aria-label", "Terrain seed");
  seedInput.title = "Copyable seed — regenerates this exact island";
  seedInput.value = String(initial.terrainSeed);
  seedInput.step = "1";

  const newIslandBtn = document.createElement("button");
  newIslandBtn.type = "button";
  newIslandBtn.id = "new-island";
  newIslandBtn.textContent = "New island";
  newIslandBtn.setAttribute(
    "aria-label",
    "Generate island from the seed field (same preserve type — not a second biome)",
  );
  newIslandBtn.addEventListener("click", () => {
    const parsed = Number.parseInt(seedInput.value, 10);
    const seed = Number.isFinite(parsed) ? parsed : initial.terrainSeed;
    seedInput.value = String(seed);
    handlers.onNewIsland(seed);
  });

  seedGroup.append(seedInput, newIslandBtn);
  markFullOnly(seedGroup);

  const briefBtn = document.createElement("button");
  briefBtn.type = "button";
  briefBtn.id = "toggle-brief";
  briefBtn.textContent = "Accept brief";
  briefBtn.setAttribute(
    "aria-label",
    "Accept or dismiss scenario brief (G-002 / Slice 15)",
  );
  briefBtn.addEventListener("click", handlers.onToggleBrief);
  markFullOnly(briefBtn);

  const notebookBtn = document.createElement("button");
  notebookBtn.type = "button";
  notebookBtn.id = "toggle-notebook";
  notebookBtn.textContent = "Notebook";
  notebookBtn.setAttribute(
    "aria-label",
    "Open or close Field Notebook (U-006)",
  );
  notebookBtn.addEventListener("click", handlers.onToggleNotebook);
  markFullOnly(notebookBtn);

  const rememberBtn = document.createElement("button");
  rememberBtn.type = "button";
  rememberBtn.id = "remember-form";
  rememberBtn.textContent = "Remember form";
  rememberBtn.setAttribute(
    "aria-label",
    "Remember current landform as then (return visit)",
  );
  rememberBtn.addEventListener("click", handlers.onRememberForm);
  markFullOnly(rememberBtn);

  const branchGroup = document.createElement("div");
  branchGroup.id = "branch-actions";
  branchGroup.setAttribute("role", "group");
  branchGroup.setAttribute(
    "aria-label",
    "Branch and compare (C-005 — same castle, different forces)",
  );

  const branchBtn = document.createElement("button");
  branchBtn.type = "button";
  branchBtn.id = "branch-open";
  branchBtn.textContent = "Branch";
  branchBtn.setAttribute(
    "aria-label",
    "Fork this world into A and B (C-005)",
  );
  branchBtn.addEventListener("click", handlers.onBranch);

  const showABtn = document.createElement("button");
  showABtn.type = "button";
  showABtn.id = "branch-show-a";
  showABtn.textContent = "Show A";
  showABtn.disabled = true;
  showABtn.addEventListener("click", handlers.onShowBranchA);

  const showBBtn = document.createElement("button");
  showBBtn.type = "button";
  showBBtn.id = "branch-show-b";
  showBBtn.textContent = "Show B";
  showBBtn.disabled = true;
  showBBtn.addEventListener("click", handlers.onShowBranchB);

  const compareBranchBtn = document.createElement("button");
  compareBranchBtn.type = "button";
  compareBranchBtn.id = "branch-compare";
  compareBranchBtn.textContent = "Compare branches";
  compareBranchBtn.disabled = true;
  compareBranchBtn.setAttribute(
    "aria-label",
    "Tint soil moisture difference between A and B (no numbers)",
  );
  compareBranchBtn.addEventListener("click", handlers.onCompareBranches);

  const endBranchBtn = document.createElement("button");
  endBranchBtn.type = "button";
  endBranchBtn.id = "branch-end";
  endBranchBtn.textContent = "Keep this branch";
  endBranchBtn.disabled = true;
  endBranchBtn.addEventListener("click", handlers.onEndBranch);

  branchGroup.append(
    branchBtn,
    showABtn,
    showBBtn,
    compareBranchBtn,
    endBranchBtn,
  );
  markFullOnly(branchGroup);

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.id = "save-world";
  saveBtn.textContent = "Save";
  saveBtn.setAttribute("aria-label", "Save world (T-003)");
  saveBtn.addEventListener("click", handlers.onSave);
  markFullOnly(saveBtn);

  const loadBtn = document.createElement("button");
  loadBtn.type = "button";
  loadBtn.id = "load-world";
  loadBtn.textContent = "Load";
  loadBtn.setAttribute("aria-label", "Load world");
  loadBtn.addEventListener("click", handlers.onLoad);
  markFullOnly(loadBtn);

  const undoBtn = document.createElement("button");
  undoBtn.type = "button";
  undoBtn.id = "undo-edit";
  undoBtn.textContent = "Undo edit";
  undoBtn.setAttribute("aria-label", "Undo last terrain edit (C-013)");
  undoBtn.disabled = true;
  undoBtn.addEventListener("click", handlers.onUndo);

  const timeGroup = document.createElement("div");
  timeGroup.id = "time-rates";
  timeGroup.setAttribute("role", "group");
  timeGroup.setAttribute(
    "aria-label",
    "Simulation time rate — simulated time per second (L6)",
  );

  // Only rates this machine can actually deliver are offered (L6 / L1).
  const rateButtons = new Map<TimeRate, HTMLButtonElement>();

  for (const rate of sustainableRates()) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = rate.label;
    const description = rateDescription(rate);
    btn.setAttribute("aria-label", description);
    btn.title = description;
    btn.addEventListener("click", () => handlers.onTimeRate(rate.id));
    timeGroup.appendChild(btn);
    rateButtons.set(rate.id, btn);
  }

  const syncTimeRate = (rate: TimeRate): void => {
    for (const [key, btn] of rateButtons) {
      btn.classList.toggle("active", key === rate);
    }
  };
  syncTimeRate(initial.timeRate);

  const materialSelect = document.createElement("select");
  materialSelect.id = "deposit-material";
  materialSelect.setAttribute(
    "aria-label",
    "Deposit material (C-009 geological setup)",
  );
  for (const id of [SUBSTRATE_SAND, SUBSTRATE_CLAY, SUBSTRATE_ROCK] as const) {
    const opt = document.createElement("option");
    opt.value = String(id);
    opt.textContent = MATERIAL_LABEL[id];
    materialSelect.appendChild(opt);
  }
  materialSelect.value = String(initial.depositMaterial);
  materialSelect.addEventListener("change", () => {
    handlers.onDepositMaterial(
      Number(materialSelect.value) as DepositMaterialId,
    );
  });

  const moldSelect = document.createElement("select");
  moldSelect.id = "mold-shape";
  moldSelect.setAttribute(
    "aria-label",
    "Mold shape (C-028 / §4.57 — geometric form stamp)",
  );
  for (const shape of MOLD_SHAPES) {
    const opt = document.createElement("option");
    opt.value = shape.id;
    opt.textContent = shape.label;
    moldSelect.appendChild(opt);
  }
  moldSelect.value = initial.moldShape;
  moldSelect.addEventListener("change", () => {
    handlers.onMoldShape(moldSelect.value as MoldShape);
  });

  const syncMaterialVisibility = (tool: SitingTool): void => {
    const showMaterial = tool === "deposit";
    materialSelect.hidden = !showMaterial;
    materialSelect.disabled = !showMaterial;
    const showMold = tool === "mold";
    moldSelect.hidden = !showMold;
    moldSelect.disabled = !showMold;
  };

  const sitingSelect = document.createElement("select");
  sitingSelect.id = "siting-tool";
  sitingSelect.setAttribute("aria-label", "Tool");
  for (const tool of SITING) {
    const opt = document.createElement("option");
    opt.value = tool.id;
    opt.textContent = tool.label;
    sitingSelect.appendChild(opt);
  }
  sitingSelect.value = initial.sitingTool;
  sitingSelect.addEventListener("change", () => {
    const tool = sitingSelect.value as SitingTool;
    syncMaterialVisibility(tool);
    handlers.onSitingTool(tool);
  });

  const brushSelect = document.createElement("select");
  brushSelect.id = "siting-brush-size";
  brushSelect.setAttribute(
    "aria-label",
    "Brush size (C-028 — bucket or shovel)",
  );
  for (const size of BRUSH_SIZES) {
    const opt = document.createElement("option");
    opt.value = size.id;
    opt.textContent = size.label;
    brushSelect.appendChild(opt);
  }
  brushSelect.value = initial.sitingBrushSize;
  brushSelect.addEventListener("change", () => {
    handlers.onSitingBrushSize(brushSelect.value as SitingBrushSize);
  });

  const predictGroup = document.createElement("div");
  predictGroup.id = "predict-actions";
  predictGroup.setAttribute("role", "group");
  predictGroup.setAttribute("aria-label", "Prediction (P-006)");

  const commitBtn = document.createElement("button");
  commitBtn.type = "button";
  commitBtn.textContent = "Commit prediction";
  commitBtn.addEventListener("click", handlers.onCommitPrediction);

  const compareBtn = document.createElement("button");
  compareBtn.type = "button";
  compareBtn.textContent = "Compare";
  compareBtn.addEventListener("click", handlers.onComparePrediction);

  const clearPredBtn = document.createElement("button");
  clearPredBtn.type = "button";
  clearPredBtn.textContent = "Clear prediction";
  clearPredBtn.addEventListener("click", handlers.onClearPrediction);

  predictGroup.append(commitBtn, compareBtn, clearPredBtn);
  markFullOnly(predictGroup);

  const inspectorSelect = document.createElement("select");
  inspectorSelect.id = "inspector";
  inspectorSelect.setAttribute("aria-label", "Inspector layer (T-005)");
  for (const layer of LAYERS) {
    const opt = document.createElement("option");
    opt.value = layer.id;
    opt.textContent = layer.label;
    inspectorSelect.appendChild(opt);
  }
  inspectorSelect.value = initial.inspector;
  inspectorSelect.addEventListener("change", () => {
    handlers.onInspector(inspectorSelect.value as InspectorLayer);
  });
  markFullOnly(inspectorSelect);

  const hint = document.createElement("div");
  hint.id = "siting-hint";
  hint.textContent =
    "Shape the island · set climate forces · run time · watch the place answer";

  const cutaway = document.createElement("div");
  cutaway.id = "cutaway";
  cutaway.textContent = "Cutaway: hover a cell with a tool";
  markFullOnly(cutaway);

  const status = document.createElement("div");
  status.id = "status";
  status.textContent = "Habitat";

  syncMaterialVisibility(initial.sitingTool);

  const loopRow = makeRow(
    "chrome-row-loop",
    "Core loop — density, forces, time, tools",
  );
  loopRow.append(
    densityGroup,
    forcePanel,
    timeGroup,
    sitingSelect,
    brushSelect,
    materialSelect,
    moldSelect,
    undoBtn,
  );

  const sessionRow = makeRow(
    "chrome-row-session",
    "Session — brief, notebook, seed, branch, save",
  );
  sessionRow.classList.add("chrome-full");
  sessionRow.dataset.chromeTier = "full";
  sessionRow.append(
    briefBtn,
    notebookBtn,
    resetBtn,
    seedGroup,
    rememberBtn,
    branchGroup,
    saveBtn,
    loadBtn,
    predictGroup,
    inspectorSelect,
  );

  const readRow = makeRow("chrome-row-read", "Status and cutaway");
  readRow.append(hint, cutaway, status);

  bar.append(loopRow, sessionRow, readRow);
  applyChromeDensity(chromeDensity);
  parent.appendChild(bar);

  return {
    setRainRegime: (id) => {
      rainSelect.value = id;
    },
    setHeat: (id) => {
      heatSelect.value = id;
    },
    setSeaLevel: (id) => {
      seaSelect.value = id;
    },
    setTide: (id) => {
      tideSelect.value = id;
    },
    setWind: (id) => {
      windSelect.value = id;
    },
    setSeason: (id) => {
      seasonSelect.value = id;
    },
    setErosion: (id) => {
      erosionSelect.value = id;
    },
    setTimeRate: syncTimeRate,
    setInspector: (layer) => {
      inspectorSelect.value = layer;
    },
    setSitingTool: (tool) => {
      sitingSelect.value = tool;
      syncMaterialVisibility(tool);
    },
    setSitingBrushSize: (size) => {
      brushSelect.value = size;
    },
    setMoldShape: (shape) => {
      moldSelect.value = shape;
    },
    setDepositMaterial: (id) => {
      materialSelect.value = String(id);
    },
    setTerrainSeed: (seed) => {
      seedInput.value = String(seed);
    },
    setStatus: (text: string) => {
      status.textContent = text;
    },
    setHint: (text: string) => {
      hint.textContent = text;
    },
    setCutaway: (text: string) => {
      cutaway.textContent = text;
    },
    setUndoEnabled: (enabled: boolean) => {
      undoBtn.disabled = !enabled;
    },
    setBranchMode: (active: boolean) => {
      showABtn.disabled = !active;
      showBBtn.disabled = !active;
      compareBranchBtn.disabled = !active;
      endBranchBtn.disabled = !active;
      branchBtn.disabled = active;
    },
    setChromeDensity: applyChromeDensity,
    getChromeDensity: () => chromeDensity,
  };
}
