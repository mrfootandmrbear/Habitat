/** Tunable settings for the Habitat reference prototype (T-007). */
export const config = {
  gridSize: 96,
  /**
   * Visual scene half-extent in Three.js units (camera / mesh scale).
   * Independent of Δx — do not tune physical rates against this.
   */
  worldSize: 48,
  /** Δx — cell edge length in metres (SIMULATION_MODEL §2). */
  cellSizeMeters: 10,
  /** Metric world extent (gridSize × Δx). */
  worldExtentMeters: 960,
  mountainPeak: 14,
  /** Preserve elevation floor — not a drainage law (§2). Digs clamp here. */
  elevationFloor: 0,

  /**
   * Integer sim-minute clock (SIMULATION_MODEL §6.1 / §6.5 option 1).
   * Event Δt = 15 sim-minutes → 96 event steps / day.
   */
  eventDtMinutes: 15,
  minutesPerDay: 1440,
  dailyEventSteps: 96,

  /**
   * Wall-clock seconds per event step at 1× (presentation only; S-009).
   * Alias kept as `simDt` for SimClock.
   */
  wallSecondsPerEventStep: 1 / 60,
  /** @deprecated Use wallSecondsPerEventStep — presentation cadence only. */
  simDt: 1 / 60,

  maxStepsPerFrame: 5,

  /**
   * Flux integrator Δt within one event step (normalized).
   * With event Δt = 15 min, rates below are retuned so one event ≈ prior
   * daily hydrograph slice (was 360×(1/60) frame-ish steps).
   */
  eventFluxDt: 1,
  fluxSubsteps: 1,

  /**
   * Retuned for 15-min events (Phase D metric pass).
   * Prior: flowRate 2.5 × dt 1/60 per event; ~360 events/day.
   * Now: ~0.156 × dt 1 per event; 96 events/day (similar daily transport).
   */
  flowRate: 0.156,
  maxOutflowFraction: 0.5,
  dryEpsilon: 1e-4,
  /** Depth (m) added per cell per rainy event step. */
  rainDepthPerEvent: 0.00125,
  /** @deprecated Prefer rainDepthPerEvent. */
  rainPerSecond: 0.075,

  terrainSeed: 42,
  /**
   * Determinism schedule length — must exceed dailyEventSteps so T-001
   * crosses a daily band (soil / ET / veg).
   */
  determinismSteps: 120,

  soilPorosity: 0.45,
  /** Default mobile regolith depth (m) — Slice 8; range [0, 5]. */
  defaultSoilDepthMeters: 0.8,
  /**
   * Days between decadal band commits (prototype compression).
   * SIMULATION_MODEL §6 uses 3600 (10×360-day years); rates are per band call.
   */
  decadalDailySteps: 10,
  /** Soil production P₀ (m / decadal band) at bare bedrock — Heimsath-style. */
  soilProductionP0: 0.004,
  /** Characteristic soil depth h₀ (m) for exp(−h/h₀). */
  soilProductionH0: 0.55,
  /** Hillslope / channel erosion scale (m / band) at unit forcing (GEO-002). */
  soilErosionK: 0.003,
  /** Min D8 accumulation (cells) before channel-style erosion applies. */
  erosionMinAccumulation: 6,
  /** Per daily band (absolute; soil step ignores integrator dt). */
  infiltrationRate: 0.08,
  etRate: 0.012,
  vegGrowthRate: 0.12,
  vegDecayRate: 0.03,
  vegMoistureThreshold: 0.04,
  baseRoughness: 0.03,
  vegRoughnessBonus: 0.12,
  vegInfiltrationBonus: 0.1,
  /** Cell-radius of berm/dig footprint (Euclidean). Was 1 — too small for C-006. */
  sitingBrushRadius: 4,
  /** Peak raise (m) at brush center per stroke. */
  bermRaise: 2.25,
  /** Peak lower (m) at brush center per stroke (clamped by soil.depth). */
  digLower: 1.5,
  predictionWetThreshold: 0.01,
  /** Horizon in event steps (~45 sim-hours at 15 min/event). */
  predictionHorizonSteps: 180,

  /**
   * Cheap GW / baseflow (Slice 8b / C-001) — linear reservoir, not Richards.
   * Moisture above field-capacity fraction recharges GW; recession returns
   * baseflow preferentially on high-accumulation cells.
   */
  gwFieldCapacityFraction: 0.55,
  /** Max soil→GW transfer depth (m) per daily band. */
  gwRechargeRate: 0.04,
  /** Fraction of GW storage released per daily band (linear reservoir). */
  gwRecessionAlpha: 0.12,
  /** Extra recession multiplier at max accumulation (channel preference). */
  gwChannelBoost: 3,

  /** Slice 9 HSI — soil depth at which f_depth saturates (m). */
  hsiDepthRefMeters: 1,
  /** Slice 9 HSI — GW storage depth at which f_groundwater saturates (m). */
  hsiGwRefMeters: 0.25,
} as const;

export type InspectorLayer =
  | "none"
  | "water"
  | "accumulation"
  | "watershed"
  | "soilMoisture"
  | "soilDepth"
  | "vegetation"
  | "depression"
  | "groundwater"
  | "limitingFactor"
  | "suitability";

/** Player land tools — causes (A-005) plus predict marks (P-006). */
export type SitingTool = "none" | "berm" | "dig" | "predict";
