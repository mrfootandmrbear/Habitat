/**
 * Field Notebook observer (U-006) — bounded causal explanation from frozen fields.
 * Write isolation: reads declared fields via snapshots only; writes nothing (T-006).
 */

import { contributedPreface, NOTEBOOK_CORPUS } from "./corpus";
import type {
  NotebookAnswer,
  NotebookAnswerLine,
  NotebookQuestionId,
  NotebookSnapshot,
} from "./types";

export const notebookObserver = {
  id: "notebook",
  reads: [
    "water.surfaceDepth",
    "soil.moisture",
    "groundwater.storage",
    "veg.cover",
    "veg.biomass.herb",
    "fire.scar",
    "habitat.limitingFactor",
    "soil.salinity",
    "climate.airTemperature",
  ] as const,
  writes: [] as const,
};

export const NOTEBOOK_QUESTIONS: {
  id: NotebookQuestionId;
  label: string;
}[] = [
  { id: "what-changed", label: "What is evident now?" },
  { id: "what-contributed", label: "What might have contributed?" },
];

const EMPTY_HINT =
  "Nothing in the notebook’s MVP vocabulary matches what is visible yet. Look at the place first (U-004).";

function meanOf(data: Float32Array): number {
  if (data.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i]!;
  return sum / data.length;
}

function maxOf(data: Float32Array): number {
  let m = 0;
  for (let i = 0; i < data.length; i++) {
    const v = data[i]!;
    if (v > m) m = v;
  }
  return m;
}

function fractionAbove(data: Float32Array, eps: number): number {
  if (data.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i]! > eps) n++;
  }
  return n / data.length;
}

/**
 * Build a preserve-scale snapshot from copied field buffers (T-006).
 * Callers must pass slices — this function does not copy again.
 */
export function snapshotFromFields(args: {
  surfaceDepth: Float32Array;
  soilMoisture: Float32Array;
  groundwater: Float32Array;
  cover: Float32Array;
  herbBiomass: Float32Array;
  fireScar: Float32Array;
  limitingFactor: Float32Array;
  /** Optional ocean cell indices — skipped for limiting modal. */
  oceanCells?: ReadonlySet<number> | null;
}): NotebookSnapshot {
  const {
    surfaceDepth,
    soilMoisture,
    groundwater,
    cover,
    herbBiomass,
    fireScar,
    limitingFactor,
    oceanCells,
  } = args;

  const counts = new Map<number, number>();
  let land = 0;
  for (let i = 0; i < limitingFactor.length; i++) {
    if (oceanCells?.has(i)) continue;
    land++;
    const k = limitingFactor[i]!;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let modal = -1;
  let best = 0;
  for (const [k, c] of counts) {
    if (c > best) {
      best = c;
      modal = k;
    }
  }

  return {
    meanSurfaceDepth: meanOf(surfaceDepth),
    maxSurfaceDepth: maxOf(surfaceDepth),
    meanSoilMoisture: meanOf(soilMoisture),
    meanGroundwater: meanOf(groundwater),
    meanCover: meanOf(cover),
    meanHerbBiomass: meanOf(herbBiomass),
    scarFraction: fractionAbove(fireScar, 0),
    modalLimitingFactor: land > 0 ? modal : -1,
    landCellCount: land,
  };
}

/** Copy live buffers into a snapshot the notebook can hold without aliasing. */
export function freezeNotebookSnapshot(args: {
  surfaceDepth: Float32Array;
  soilMoisture: Float32Array;
  groundwater: Float32Array;
  cover: Float32Array;
  herbBiomass: Float32Array;
  fireScar: Float32Array;
  limitingFactor: Float32Array;
  oceanCells?: ReadonlySet<number> | null;
}): NotebookSnapshot {
  return snapshotFromFields({
    surfaceDepth: args.surfaceDepth.slice(),
    soilMoisture: args.soilMoisture.slice(),
    groundwater: args.groundwater.slice(),
    cover: args.cover.slice(),
    herbBiomass: args.herbBiomass.slice(),
    fireScar: args.fireScar.slice(),
    limitingFactor: args.limitingFactor.slice(),
    // Set is read-only for modal counts; notebook never mutates it.
    oceanCells: args.oceanCells ?? null,
  });
}

export function answerNotebook(
  question: NotebookQuestionId,
  snap: NotebookSnapshot,
): NotebookAnswer {
  const lines: NotebookAnswerLine[] = [];
  for (const entry of NOTEBOOK_CORPUS) {
    if (!entry.visibleWhen(snap)) continue;
    lines.push({
      entryId: entry.id,
      event: entry.event,
      scale: entry.scale,
      sentence: entry.sentence,
      fieldIds: entry.traces.map((t) => t.fieldId),
      uncertainty:
        question === "what-contributed" ? contributedPreface(entry) : null,
    });
  }
  return {
    question,
    lines,
    empty: lines.length === 0,
  };
}

export function formatNotebookAnswer(answer: NotebookAnswer): string {
  if (answer.empty) return EMPTY_HINT;
  const blocks: string[] = [];
  for (const line of answer.lines) {
    const head = `[${line.event} · ${line.scale}] ${line.sentence}`;
    if (line.uncertainty) {
      blocks.push(`${line.uncertainty}\n${head}`);
    } else {
      blocks.push(head);
    }
  }
  return blocks.join("\n\n");
}

/** Every corpus sentence has at least one registry field trace (U-006). */
export function corpusAllTraced(): boolean {
  return NOTEBOOK_CORPUS.every(
    (e) => e.sentence.trim().length > 0 && e.traces.length > 0,
  );
}
