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
    id: "colonized-strand",
    event: "colonized",
    scale: "preserve",
    sentence: "Olive mats hugged the salty shore before the inland hollow greened.",
    traces: [
      {
        fieldId: "veg.biomass.strand",
        evidence: "mean strand biomass above epsilon",
      },
      {
        fieldId: "soil.salinity",
        evidence: "shore salt present where strand establishes",
      },
    ],
    visibleWhen: (s) => s.meanStrandBiomass > BIOMASS_EPS,
  },
  {
    id: "colonized-binder",
    event: "colonized",
    scale: "preserve",
    sentence: "Sandy khaki mats bound the dry crest while the hollow stayed green with herbs.",
    traces: [
      {
        fieldId: "veg.biomass.binder",
        evidence: "mean binder biomass above epsilon",
      },
      {
        fieldId: "shore.exposure",
        evidence: "crest exposure where binder establishes",
      },
    ],
    visibleWhen: (s) => s.meanBinderBiomass > BIOMASS_EPS,
  },
  {
    id: "colonized-marsh",
    event: "colonized",
    scale: "preserve",
    sentence: "Cool teal turf held the mid-tide foreshore while the dry terrace stayed herb-green.",
    traces: [
      {
        fieldId: "veg.biomass.marsh",
        evidence: "mean marsh biomass above epsilon",
      },
      {
        fieldId: "shore.intertidal",
        evidence: "envelope band where marsh establishes",
      },
    ],
    visibleWhen: (s) => s.meanMarshBiomass > BIOMASS_EPS,
  },
  {
    id: "colonized-shrub",
    event: "colonized",
    scale: "preserve",
    sentence: "Deep green scrub filled the warm herb hollow; the cold twin stayed grass-only.",
    traces: [
      {
        fieldId: "veg.biomass.shrub",
        evidence: "mean shrub biomass above epsilon",
      },
      {
        fieldId: "climate.airTemperature",
        evidence: "warmth floor that unlocks woody escalation",
      },
    ],
    visibleWhen: (s) => s.meanShrubBiomass > BIOMASS_EPS,
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
  {
    id: "limited-spray",
    event: "limited",
    scale: "preserve",
    sentence: "The windward face took the spray; the lee twin kept its inland green.",
    traces: [
      {
        fieldId: "habitat.limitingFactor",
        evidence: "modal limiting factor is spray (5)",
      },
      {
        fieldId: "shore.exposure",
        evidence: "shore exposure is the HSI argmin on land — distinct from soil.salinity",
      },
    ],
    visibleWhen: (s) => s.modalLimitingFactor === 5 && s.landCellCount > 0,
  },
  {
    id: "limited-inundation",
    event: "limited",
    scale: "preserve",
    sentence: "The wet shore band kept inland herbs out; the dry terrace above the tide took green.",
    traces: [
      {
        fieldId: "habitat.limitingFactor",
        evidence: "modal limiting factor is inundation (6)",
      },
      {
        fieldId: "shore.intertidal",
        evidence: "tidal envelope hydroperiod is the HSI argmin — distinct from salinity and spray",
      },
    ],
    visibleWhen: (s) => s.modalLimitingFactor === 6 && s.landCellCount > 0,
  },
  {
    id: "limited-light",
    event: "limited",
    scale: "preserve",
    sentence: "The north face stayed dim; the south twin took green under the same seed.",
    traces: [
      {
        fieldId: "habitat.limitingFactor",
        evidence: "modal limiting factor is light (7)",
      },
      {
        fieldId: "light.insolation",
        evidence: "open-sky aspect insolation is the HSI argmin — not understory attenuation",
      },
    ],
    visibleWhen: (s) => s.modalLimitingFactor === 7 && s.landCellCount > 0,
  },
];

/** Uncertainty preface for what-contributed (U-006 — no certainty claim). */
export function contributedPreface(entry: CorpusEntry): string {
  const fields = entry.traces.map((t) => t.fieldId).join(", ");
  return `Likely — where we can see ${fields}. The simulation shows contributing conditions; that does not prove a single cause.`;
}
