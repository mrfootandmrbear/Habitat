import type { InspectorLayer, SitingTool } from "../config";
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

export type TimeRate = "pause" | "1x" | "4x" | "16x";

export const TIME_SCALE: Record<TimeRate, number> = {
  pause: 0,
  "1x": 1,
  "4x": 4,
  "16x": 16,
};

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
  { id: "seedBank", label: "Inspect: herb seed bank" },
  { id: "intertidal", label: "Inspect: intertidal" },
  { id: "shoreExposure", label: "Inspect: shore exposure" },
  { id: "shoreLongshore", label: "Inspect: shore longshore" },
  { id: "salinity", label: "Inspect: soil salinity" },
];

/** Cause tools (A-005) + predict marks (P-006). */
const SITING: { id: SitingTool; label: string }[] = [
  { id: "none", label: "Tool: look" },
  { id: "predict", label: "Tool: predict wet" },
  { id: "berm", label: "Tool: raise berm" },
  { id: "dig", label: "Tool: dig channel" },
  { id: "ignite", label: "Tool: ignite (authored)" },
];

export function mountControls(
  parent: HTMLElement,
  initial: {
    rainRegime: RainRegimeId;
    seaLevel: SeaLevelId;
    tide: TideId;
    wind: WindId;
    timeRate: TimeRate;
    inspector: InspectorLayer;
    sitingTool: SitingTool;
  },
  handlers: {
    onRainRegime: (id: RainRegimeId) => void;
    onSeaLevel: (id: SeaLevelId) => void;
    onTide: (id: TideId) => void;
    onWind: (id: WindId) => void;
    onReset: () => void;
    onTimeRate: (rate: TimeRate) => void;
    onInspector: (layer: InspectorLayer) => void;
    onSitingTool: (tool: SitingTool) => void;
    onCommitPrediction: () => void;
    onComparePrediction: () => void;
    onClearPrediction: () => void;
    onSave: () => void;
    onLoad: () => void;
    onUndo: () => void;
    onRememberForm: () => void;
    onToggleBrief: () => void;
  },
): {
  setRainRegime: (id: RainRegimeId) => void;
  setSeaLevel: (id: SeaLevelId) => void;
  setTide: (id: TideId) => void;
  setWind: (id: WindId) => void;
  setTimeRate: (rate: TimeRate) => void;
  setInspector: (layer: InspectorLayer) => void;
  setSitingTool: (tool: SitingTool) => void;
  setStatus: (text: string) => void;
  setHint: (text: string) => void;
  setCutaway: (text: string) => void;
  setUndoEnabled: (enabled: boolean) => void;
} {
  const bar = document.createElement("div");
  bar.id = "controls";

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

  forcePanel.append(rainSelect, seaSelect, tideSelect, windSelect);

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.textContent = "Reset water";
  resetBtn.addEventListener("click", handlers.onReset);

  const briefBtn = document.createElement("button");
  briefBtn.type = "button";
  briefBtn.id = "toggle-brief";
  briefBtn.textContent = "Accept brief";
  briefBtn.setAttribute(
    "aria-label",
    "Accept or dismiss scenario brief (G-002 / Slice 15)",
  );
  briefBtn.addEventListener("click", handlers.onToggleBrief);

  const rememberBtn = document.createElement("button");
  rememberBtn.type = "button";
  rememberBtn.textContent = "Remember form";
  rememberBtn.setAttribute(
    "aria-label",
    "Remember current landform as then (return visit)",
  );
  rememberBtn.addEventListener("click", handlers.onRememberForm);

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "Save";
  saveBtn.setAttribute("aria-label", "Save world (T-003)");
  saveBtn.addEventListener("click", handlers.onSave);

  const loadBtn = document.createElement("button");
  loadBtn.type = "button";
  loadBtn.textContent = "Load";
  loadBtn.setAttribute("aria-label", "Load world");
  loadBtn.addEventListener("click", handlers.onLoad);

  const undoBtn = document.createElement("button");
  undoBtn.type = "button";
  undoBtn.textContent = "Undo edit";
  undoBtn.setAttribute("aria-label", "Undo last terrain edit (C-013)");
  undoBtn.disabled = true;
  undoBtn.addEventListener("click", handlers.onUndo);

  const timeGroup = document.createElement("div");
  timeGroup.id = "time-rates";
  timeGroup.setAttribute("role", "group");
  timeGroup.setAttribute("aria-label", "Simulation time rate");

  const rates: TimeRate[] = ["pause", "1x", "4x", "16x"];
  const rateButtons = new Map<TimeRate, HTMLButtonElement>();

  for (const rate of rates) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = rate === "pause" ? "Pause" : rate;
    btn.addEventListener("click", () => handlers.onTimeRate(rate));
    timeGroup.appendChild(btn);
    rateButtons.set(rate, btn);
  }

  const syncTimeRate = (rate: TimeRate): void => {
    for (const [key, btn] of rateButtons) {
      btn.classList.toggle("active", key === rate);
    }
  };
  syncTimeRate(initial.timeRate);

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
    handlers.onSitingTool(sitingSelect.value as SitingTool);
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

  const hint = document.createElement("div");
  hint.id = "siting-hint";
  hint.textContent =
    "Shape the island · set climate forces · run time · watch the place answer";

  const cutaway = document.createElement("div");
  cutaway.id = "cutaway";
  cutaway.textContent = "Cutaway: hover a cell with a tool";

  const status = document.createElement("div");
  status.id = "status";
  status.textContent = "Habitat";

  bar.append(
    forcePanel,
    briefBtn,
    resetBtn,
    rememberBtn,
    saveBtn,
    loadBtn,
    undoBtn,
    timeGroup,
    sitingSelect,
    predictGroup,
    inspectorSelect,
    hint,
    cutaway,
    status,
  );
  parent.appendChild(bar);

  return {
    setRainRegime: (id) => {
      rainSelect.value = id;
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
    setTimeRate: syncTimeRate,
    setInspector: (layer) => {
      inspectorSelect.value = layer;
    },
    setSitingTool: (tool) => {
      sitingSelect.value = tool;
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
  };
}
