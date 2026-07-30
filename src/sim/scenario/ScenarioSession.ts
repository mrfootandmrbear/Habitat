/**
 * Scenario objective container (Slice 14 / G-002).
 * Observer only — reads WorldState, never writes (T-006).
 */

import { config } from "../../config";
import type { WorldState } from "../WorldState";
import {
  createWindowEvalState,
  pushSample,
  rollingMet,
  type WindowEvalState,
} from "./windowEval";
import type {
  CompletionState,
  EvaluationOutcome,
  MeanFieldCriterion,
  ScenarioDefinition,
} from "./types";

/**
 * Scenario evaluator observer — mirrors PredictionSession write isolation.
 * Declared contract: reads criterion fields; writes nothing on WorldState.
 */
export const scenarioObserver = {
  id: "scenario",
  reads: ["veg.biomass.herb", "clock.simMinutes"] as const,
  writes: [] as const,
};

/** Readonly sample surface — session never holds a mutable WorldState reference. */
export type CriterionReader = {
  width: number;
  height: number;
  simMinutes: number;
  meanField(fieldId: string, region?: MeanFieldCriterion["region"]): number;
};

export function criterionReaderFromWorld(world: WorldState): CriterionReader {
  return {
    width: world.width,
    height: world.height,
    simMinutes: world.simMinutes,
    meanField(fieldId, region) {
      const data = fieldData(world, fieldId);
      return meanOverRegion(data, world.width, world.height, region);
    },
  };
}

function fieldData(world: WorldState, fieldId: string): Float32Array {
  switch (fieldId) {
    case "veg.biomass.herb":
      return world.herbBiomass.data;
    case "veg.cover":
      return world.vegCover.data;
    case "soil.moisture":
      return world.soilMoisture.data;
    case "water.surfaceDepth":
      return world.water.data;
    default:
      throw new Error(`scenario criterion: unsupported field '${fieldId}'`);
  }
}

function meanOverRegion(
  data: Float32Array,
  width: number,
  height: number,
  region: MeanFieldCriterion["region"],
): number {
  const x0 = region?.x0 ?? 0;
  const x1 = region?.x1 ?? width;
  const z0 = region?.z0 ?? 0;
  const z1 = region?.z1 ?? height;
  let sum = 0;
  let n = 0;
  for (let z = z0; z < z1; z++) {
    for (let x = x0; x < x1; x++) {
      if (x < 0 || z < 0 || x >= width || z >= height) continue;
      sum += data[z * width + x]!;
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

/**
 * Loads an authored objective + schedule over sandbox play.
 * Completion state lives here — not in the registry (G-007 store-only).
 */
export class ScenarioSession {
  readonly definition: ScenarioDefinition;
  private readonly evalState: WindowEvalState = createWindowEvalState();
  private samplesTaken = 0;
  /** simMinutes at which the next sample is due. */
  private nextSampleAt: number;

  constructor(definition: ScenarioDefinition) {
    validateDefinition(definition);
    this.definition = definition;
    this.nextSampleAt = this.samplePeriodMinutes();
  }

  get completion(): CompletionState {
    return {
      achievedAtSimMinutes: this.evalState.achievedAtSimMinutes,
      currentlySatisfied: this.evalState.currentlySatisfied,
      windowHistory: [...this.evalState.history],
    };
  }

  get rollingMet(): boolean {
    return rollingMet(
      this.evalState.history,
      this.definition.window.lengthDays,
    );
  }

  get samplesTakenCount(): number {
    return this.samplesTaken;
  }

  /**
   * Observe world at current clock — samples when schedule boundary is crossed.
   * Never mutates WorldState (T-006).
   */
  observe(world: WorldState): void {
    this.observeReader(criterionReaderFromWorld(world));
  }

  /** Same logic without requiring a live WorldState handle. */
  observeReader(reader: CriterionReader): void {
    const period = this.samplePeriodMinutes();
    while (reader.simMinutes >= this.nextSampleAt) {
      this.takeSample(reader);
      this.nextSampleAt += period;
    }
  }

  /** Force one sample at the reader's current simMinutes (tests / probe). */
  sampleNow(reader: CriterionReader): void {
    this.takeSample(reader);
  }

  outcome(): EvaluationOutcome {
    const w = this.definition.window.lengthDays;
    return {
      scenarioId: this.definition.id,
      achievedAtSimMinutes: this.evalState.achievedAtSimMinutes,
      currentlySatisfied: this.evalState.currentlySatisfied,
      rollingMet: this.rollingMet,
      samplesTaken: this.samplesTaken,
      windowFilled: this.evalState.history.length >= w,
    };
  }

  /** Deterministic outcome fingerprint for Tier-M replay. */
  outcomeHash(): string {
    const o = this.outcome();
    const hist = this.evalState.history.map((b) => (b ? "1" : "0")).join("");
    return [
      o.scenarioId,
      o.achievedAtSimMinutes ?? "null",
      o.currentlySatisfied ? "1" : "0",
      o.rollingMet ? "1" : "0",
      o.samplesTaken,
      o.windowFilled ? "1" : "0",
      hist,
    ].join("|");
  }

  private samplePeriodMinutes(): number {
    return (
      this.definition.schedule.sampleEveryEventSteps * config.eventDtMinutes
    );
  }

  private takeSample(reader: CriterionReader): void {
    const { criterion, window } = this.definition;
    if (criterion.kind !== "meanField") {
      throw new Error(`unsupported criterion kind`);
    }
    const mean = reader.meanField(criterion.fieldId, criterion.region);
    const met = mean >= criterion.threshold;
    pushSample(this.evalState, met, window, reader.simMinutes);
    this.samplesTaken++;
  }
}

function validateDefinition(def: ScenarioDefinition): void {
  const { window, schedule } = def;
  if (window.lengthDays < 1) {
    throw new Error("scenario window.lengthDays must be ≥ 1");
  }
  if (window.entryDays < 1) {
    throw new Error("scenario window.entryDays must be ≥ 1");
  }
  if (window.exitDays < 1) {
    throw new Error("scenario window.exitDays must be ≥ 1");
  }
  if (schedule.sampleEveryEventSteps < 1) {
    throw new Error("scenario schedule.sampleEveryEventSteps must be ≥ 1");
  }
}

/** Reference brief used by the living-hollow style scaffold objective. */
export const LIVING_HOLLOW_BRIEF =
  "The brief asked me to keep the hollow wet long enough for life to hold the next storm.";

/** Authored demo objective for probe + tests (veg.biomass.herb persistence). */
export function livingHollowObjective(
  overrides?: Partial<{
    threshold: number;
    lengthDays: number;
    entryDays: number;
    exitDays: number;
    sampleEveryEventSteps: number;
  }>,
): ScenarioDefinition {
  return {
    id: "living-hollow-hold",
    brief: LIVING_HOLLOW_BRIEF,
    criterion: {
      kind: "meanField",
      fieldId: "veg.biomass.herb",
      threshold: overrides?.threshold ?? 0.5,
    },
    window: {
      lengthDays: overrides?.lengthDays ?? 3,
      entryDays: overrides?.entryDays ?? 1,
      exitDays: overrides?.exitDays ?? 2,
    },
    schedule: {
      sampleEveryEventSteps:
        overrides?.sampleEveryEventSteps ?? config.dailyEventSteps,
    },
  };
}
