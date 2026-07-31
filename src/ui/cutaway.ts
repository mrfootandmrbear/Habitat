/**
 * Dual-readout cutaway strip — soil / water / veg at a cell (BUILD_GUIDE §4.2).
 * Presentation only; reads WorldState fields.
 */
import { LIMITING_LABELS, type LimitingFactorId } from "../sim/habitat/hsiComposition";

export type CutawaySample = {
  x: number;
  z: number;
  soil: number;
  soilDepth: number;
  water: number;
  veg: number;
  elev: number;
  hsi?: number;
  limiting?: number;
  herbBiomass?: number;
  strandBiomass?: number;
  binderBiomass?: number;
  marshBiomass?: number;
  shrubBiomass?: number;
  crustBiomass?: number;
  salinity?: number;
};

export function formatCutaway(sample: CutawaySample | null): string {
  if (!sample) return "Cutaway: hover a cell with a tool";
  const soilPct = Math.round(sample.soil * 100);
  const vegPct = Math.round(sample.veg * 100);
  let line =
    `Cutaway (${sample.x},${sample.z}) · elev ${sample.elev.toFixed(2)} · ` +
    `depth ${sample.soilDepth.toFixed(2)}m · soil ${soilPct}% · ` +
    `water ${sample.water.toFixed(3)} · veg ${vegPct}%`;
  if (sample.hsi !== undefined && sample.limiting !== undefined) {
    const id = Math.round(sample.limiting) as LimitingFactorId;
    const label = LIMITING_LABELS[id] ?? "unknown";
    line += ` · HSI ${sample.hsi.toFixed(2)} · limiting ${label}`;
  }
  if (sample.herbBiomass !== undefined) {
    line += ` · herb ${sample.herbBiomass.toFixed(2)}`;
  }
  if (sample.strandBiomass !== undefined && sample.strandBiomass > 0) {
    line += ` · strand ${sample.strandBiomass.toFixed(2)}`;
  }
  if (sample.binderBiomass !== undefined && sample.binderBiomass > 0) {
    line += ` · binder ${sample.binderBiomass.toFixed(2)}`;
  }
  if (sample.marshBiomass !== undefined && sample.marshBiomass > 0) {
    line += ` · marsh ${sample.marshBiomass.toFixed(2)}`;
  }
  if (sample.shrubBiomass !== undefined && sample.shrubBiomass > 0) {
    line += ` · shrub ${sample.shrubBiomass.toFixed(2)}`;
  }
  if (sample.crustBiomass !== undefined && sample.crustBiomass > 0) {
    line += ` · crust ${sample.crustBiomass.toFixed(2)}`;
  }
  if (sample.salinity !== undefined && sample.salinity > 0) {
    line += ` · salt ${sample.salinity.toFixed(2)}`;
  }
  return line;
}

/** Tier-P encoding: wetter soil maps to a strictly higher moisture channel. */
export function soilEncodingDelta(
  dryMoisture: number,
  wetMoisture: number,
  porosity: number,
): number {
  const dryT = Math.min(1, dryMoisture / porosity);
  const wetT = Math.min(1, wetMoisture / porosity);
  return wetT - dryT;
}
