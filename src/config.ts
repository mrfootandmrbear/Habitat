/** Tunable settings for the Habitat reference prototype (T-007). */
export const config = {
  gridSize: 96,
  worldSize: 48,
  mountainPeak: 14,
  simDt: 1 / 60,
  maxStepsPerFrame: 5,
  flowRate: 2.5,
  maxOutflowFraction: 0.5,
  dryEpsilon: 1e-4,
  rainPerSecond: 0.02,
  terrainSeed: 42,
  determinismSteps: 120,
  /** Event steps between daily soil-water updates (Slice 4). */
  dailyEventSteps: 360,
  soilPorosity: 0.45,
  infiltrationRate: 0.08,
  etRate: 0.012,
  /** Slice 5 — cover growth from soil moisture (no fixed K). */
  vegGrowthRate: 0.12,
  vegDecayRate: 0.03,
  vegMoistureThreshold: 0.04,
  /** Slice 5b siting brush (A-005 — cause, not outcome). */
  sitingBrushRadius: 1,
  bermRaise: 0.85,
  digLower: 0.65,
  /** Slice 5a prediction (P-006) — wet if depth exceeds this. */
  predictionWetThreshold: 0.01,
  /** Steps after commit before auto-compare. */
  predictionHorizonSteps: 180,
} as const;

export type InspectorLayer =
  | "none"
  | "water"
  | "accumulation"
  | "watershed"
  | "soilMoisture"
  | "vegetation";

/** Player land tools — causes (A-005) plus predict marks (P-006). */
export type SitingTool = "none" | "berm" | "dig" | "predict";
