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
