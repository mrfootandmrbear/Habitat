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
} as const;

export type InspectorLayer =
  | "none"
  | "water"
  | "accumulation"
  | "watershed"
  | "soilMoisture";
