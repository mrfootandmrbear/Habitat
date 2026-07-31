/**
 * Field Notebook emit corpus (U-006).
 * Every sentence must stay traceable to registry fields via traces + visibleWhen.
 */

import type { NotebookEventKind, NotebookScale, NotebookSnapshot } from "./types";

const SURFACE_EPS = 1e-4;
const MOISTURE_HIGH = 0.25;
const GW_HIGH = 0.05;
const COVER_EPS = 1e-3;
const BIOMASS_EPS = 1e-4;
const SCAR_FRACTION_EPS = 1e-4;

export type CorpusTrace = {
  fieldId: string;
  evidence: string;
};

export type CorpusEntry = {
  id: string;
  event: NotebookEventKind;
  scale: NotebookScale;
  /** Chronology sentence for what-changed (no certainty claim). */
  sentence: string;
  traces: CorpusTrace[];
  visibleWhen: (snap: NotebookSnapshot) => boolean;
};

/**
 * MVP emit set — seeded from slice notebook strings, gated on current state.
 * Do not add a sentence without a real visibleWhen predicate.
 */
export const NOTEBOOK_CORPUS: readonly CorpusEntry[] = [
  {
    id: "flooded-stands",
    event: "flooded",
    scale: "preserve",
    sentence: "Water stands where the land dips.",
    traces: [
      {
        fieldId: "water.surfaceDepth",
        evidence: "mean or max surface depth above dry epsilon",
      },
    ],
    visibleWhen: (s) =>
      s.meanSurfaceDepth > SURFACE_EPS || s.maxSurfaceDepth > SURFACE_EPS,
  },
  {
    id: "seeping-hollow",
    event: "seeping",
    scale: "preserve",
    sentence: "The hollow kept seeping after the rain stopped.",
    traces: [
      {
        fieldId: "water.surfaceDepth",
        evidence: "surface near-dry (mean ≤ epsilon)",
      },
      {
        fieldId: "soil.moisture",
        evidence: "mean moisture still high",
      },
      {
        fieldId: "groundwater.storage",
        evidence: "or mean groundwater storage still high",
      },
    ],
    visibleWhen: (s) =>
      s.meanSurfaceDepth <= SURFACE_EPS &&
      (s.meanSoilMoisture >= MOISTURE_HIGH || s.meanGroundwater >= GW_HIGH),
  },
  {
    id: "burned-scar",
    event: "burned",
    scale: "preserve",
    sentence: "The burn ran to the wet ground and stopped.",
    traces: [
      {
        fieldId: "fire.scar",
        evidence: "fraction of scarred cells above epsilon",
      },
    ],
    visibleWhen: (s) => s.scarFraction > SCAR_FRACTION_EPS,
  },
  {
    id: "colonized-shoots",
    event: "colonized",
    scale: "preserve",
    sentence: "The first shoots appeared in the hollow I kept wet.",
    traces: [
      {
        fieldId: "veg.biomass.herb",
        evidence: "mean herb biomass above epsilon",
      },
      {
        fieldId: "soil.moisture",
        evidence: "mean moisture present (wet enough to hold)",
      },
    ],
    visibleWhen: (s) =>
      s.meanHerbBiomass > BIOMASS_EPS && s.meanSoilMoisture > SURFACE_EPS,
  },
  {
    id: "recovered-green",
    event: "recovered",
    scale: "preserve",
    sentence: "The green came back, and the place sounded fuller.",
    traces: [
      {
        fieldId: "veg.cover",
        evidence: "mean cover above epsilon",
      },
    ],
    visibleWhen: (s) => s.meanCover > COVER_EPS,
  },
  {
    id: "limited-moisture",
    event: "limited",
    scale: "preserve",
    sentence: "Water — not light — is limiting here.",
    traces: [
      {
        fieldId: "habitat.limitingFactor",
        evidence: "modal limiting factor is moisture (0) on sampled land",
      },
    ],
    visibleWhen: (s) => s.modalLimitingFactor === 0 && s.landCellCount > 0,
  },
  {
    id: "limited-salinity",
    event: "limited",
    scale: "preserve",
    sentence: "The hollow still tasted of the sea; the freshened twin took green first.",
    traces: [
      {
        fieldId: "habitat.limitingFactor",
        evidence: "modal limiting factor is salinity (3)",
      },
      {
        fieldId: "soil.salinity",
        evidence: "salinity is the HSI argmin on land",
      },
    ],
    visibleWhen: (s) => s.modalLimitingFactor === 3 && s.landCellCount > 0,
  },
  {
    id: "limited-temperature",
    event: "limited",
    scale: "preserve",
    sentence: "The cold spell left the hollow empty; warmth let the same wet ground take shoots.",
    traces: [
      {
        fieldId: "habitat.limitingFactor",
        evidence: "modal limiting factor is temperature (4)",
      },
      {
        fieldId: "climate.airTemperature",
        evidence: "Heat dial air temperature is the HSI argmin on land",
      },
    ],
    visibleWhen: (s) => s.modalLimitingFactor === 4 && s.landCellCount > 0,
  },
];

/** Uncertainty preface for what-contributed (U-006 — no certainty claim). */
export function contributedPreface(entry: CorpusEntry): string {
  const fields = entry.traces.map((t) => t.fieldId).join(", ");
  return `Likely — where we can see ${fields}. The simulation shows contributing conditions; that does not prove a single cause.`;
}
