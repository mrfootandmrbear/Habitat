/**
 * Slice 14 — scenario objective types (G-002, G-005, SIM §12 / G-007).
 * Authored data + completion structure that stores all G-007 shapes without picking one.
 */

/** Half-open cell region; omit on criterion = full preserve. */
export type CellRegion = {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
};

/** Primary ecological criterion — mean of a registered cell field ≥ threshold. */
export type MeanFieldCriterion = {
  kind: "meanField";
  fieldId: string;
  threshold: number;
  region?: CellRegion;
};

export type ScenarioCriterion = MeanFieldCriterion;

/** Persistence window — lengths are authoring params (G-005), not register policy. */
export type PersistenceWindow = {
  /** Rolling ring length in samples (one sample ≈ one sim-day when schedule is daily). */
  lengthDays: number;
  /** Consecutive rolling-met samples required to enter currentlySatisfied. */
  entryDays: number;
  /** Consecutive rolling-failed samples required to leave currentlySatisfied. */
  exitDays: number;
};

export type ScenarioSchedule = {
  /** Sample criterion every N event steps (S-009 — sim time). */
  sampleEveryEventSteps: number;
};

export type ScenarioDefinition = {
  id: string;
  brief: string;
  criterion: ScenarioCriterion;
  window: PersistenceWindow;
  schedule: ScenarioSchedule;
};

/**
 * Completion state — SIM §12 / G-007 accommodation.
 * Store all three; do not interpret which alternative is "the" completion.
 */
export type CompletionState = {
  /** First sim-minute when currentlySatisfied became true; never cleared by evaluator. */
  achievedAtSimMinutes: number | null;
  /** Live window satisfaction after hysteresis. */
  currentlySatisfied: boolean;
  /** Rolling criterion samples, oldest → newest (length ≤ window.lengthDays). */
  windowHistory: readonly boolean[];
};

/** Flat hashable outcome for determinism (Tier-M). */
export type EvaluationOutcome = {
  scenarioId: string;
  achievedAtSimMinutes: number | null;
  currentlySatisfied: boolean;
  rollingMet: boolean;
  samplesTaken: number;
  windowFilled: boolean;
};
