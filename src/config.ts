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
   * Orographic precip γ in P = P₀(1 + γ·u·∇z) (Slice F / C-020 lite).
   * ∇z is metres per cell; γ sized so a ~0.5 m/cell face yields a strong
   * windward/leeward split after land-mean normalization.
   */
  orographicGamma: 2.5,

  /**
   * Integer sim-minute clock (SIMULATION_MODEL §6.1 / §6.5 option 1).
   * Event Δt = 15 sim-minutes → 96 event steps / day.
   */
  eventDtMinutes: 15,
  minutesPerDay: 1440,
  dailyEventSteps: 96,

  /**
   * Wall-clock seconds the clock charges for one event step at unit time scale
   * (presentation only; S-009). Rate labels are derived from it in
   * `sim/timeRates.ts` — never restate the base anywhere else.
   * Alias kept as `simDt` for SimClock.
   */
  wallSecondsPerEventStep: 1 / 60,
  /** @deprecated Use wallSecondsPerEventStep — presentation cadence only. */
  simDt: 1 / 60,

  /**
   * Per-frame catch-up ceiling (SIMULATION_MODEL §6.4, Slice L1). Measured on
   * the reference machine at the default island: 0.918 ms per event step in the
   * worst (wet, band-crossing) case, so 18 steps fit a 16.7 ms frame with no
   * render left. 16 keeps ~1.9 ms of that budget for the frame's own work and
   * still leaves ~4.8 steps/frame of catch-up above the fastest offered rate
   * (`1 week/s`, 11.2 steps/frame) so deferred debt can actually be paid down.
   */
  maxStepsPerFrame: 16,

  /**
   * Hard ceiling on carried time debt, in steps — the spiral-of-death guard
   * (§6.4). Surplus below it is deferred and paid down on later frames rather
   * than discarded; only debt past it is abandoned, and that is the signal
   * §6.4 wants surfaced so the rate can be lowered. 4 frames of catch-up.
   */
  maxTimeDebtSteps: 64,

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
  /**
   * Coastal wave erosion scale (m / decadal band) at full exposure (C-017).
   * Applied only inside geomorphology — no second sediment writer / no SWE.
   */
  shoreErosionK: 0.08,
  /** Max fetch length (cells) for shore exposure saturate(fetch/max). */
  shoreFetchMaxCells: 12,
  /**
   * Fraction of coastal erosion retained for lee deposit (Slice 19 / C-017).
   * Remainder leaves to ledger.shoreErosion (ocean). Geomorphology integrates.
   */
  longshoreRetainFraction: 0.7,
  /**
   * Fraction of hillslope/channel erosion retained for Exner-lite inland
   * deposit (GEO-002). Remainder → ledger.shoreErosion when an ocean exists,
   * else stays in the on-island pool (closed DEM). Same sole sediment writer.
   */
  hillslopeSedimentRetainFraction: 1,
  /** Per sim-day (soil/veg/GW steps scale by dt in days). */
  infiltrationRate: 0.08,
  /**
   * Reference PET depth (m/day) at insolation = 1 (NATURAL_PROCESS_MATH §1.7).
   * Actual demand = etRate · insolation · moisture stress.
   */
  etRate: 0.012,
  /** Open-water PET depth (m/day) at insolation = 1. */
  openWaterEtRate: 0.02,
  /** Wilting point as fraction of porosity — AET → 0 below. */
  etWiltingFraction: 0.15,
  /** Field capacity as fraction of porosity — AET → PET at/above. */
  etFieldCapacityFraction: 0.55,
  vegGrowthRate: 0.12,
  vegDecayRate: 0.03,
  vegMoistureThreshold: 0.04,
  /**
   * Slice 11 — representative seasonal sun + Beer–Lambert canopy attenuation
   * (NATURAL_PROCESS_MATH §1.9 / §3.2).
   */
  solarAltitudeDegrees: 45,
  vegMaxLeafAreaIndex: 6,
  lightExtinctionCoefficient: 0.5,
  baseRoughness: 0.03,
  vegRoughnessBonus: 0.12,
  vegInfiltrationBonus: 0.1,
  /**
   * Sculpt brush size tiers (C-028 / §4.55) — Trusty Bucket vs Heavy Shovel.
   * `sitingBrushRadius` stays the bucket default so ignite and older call sites
   * keep a single number; berm/dig/deposit read the active tier from UI.
   */
  sitingBrushRadii: {
    bucket: 4,
    shovel: 8,
  },
  /** Cell-radius of berm/dig footprint (Euclidean). Was 1 — too small for C-006. */
  sitingBrushRadius: 4,
  /** Peak raise (m) at brush center per stroke. */
  bermRaise: 2.25,
  /** Peak lower (m) at brush center per stroke (clamped by soil.depth). */
  digLower: 1.5,
  /**
   * Geometric mold stamps (C-028 / §4.57) — one-shot form causes (A-005).
   * Fixed footprint radius so a mold reads as a recognizable rampart / mound /
   * cylinder, not a variable brush. Depth rides with elev (C-002).
   */
  moldRadius: 5,
  /** Peak elev(+depth) delta (m) a mold stamp applies at full profile weight. */
  moldHeight: 3.0,

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
  /**
   * Heat plant gate — herb guild cold tolerance (°C). Unimodal TPC: 0 at/below
   * kill, 1 at opt, right-skewed decline above opt (§4.46).
   */
  herbTempKillC: -4,
  herbTempOptC: 12,
  /** Pore salt at/below which herb/shrub/crust f_salinity stays 1 (§4.46). */
  herbSalinityFullThrough: 0.2,

  /**
   * Slice 10 — Fire / Fuel (NATURAL_PROCESS_MATH §3.5, ES-002).
   * Olson litter model: L(t) = (I/k)(1 − e^{−kt}).
   * Fuel load in kg/m²; max input from full cover.
   */
  /** Max litter input rate (kg/m²/band) at cover=1. */
  fuelInputMax: 0.8,
  /** First-order decomposition rate (1/band) — Olson k per decadal step. */
  fuelDecayK: 0.08,
  /**
   * Fire scar exponential fade rate (1/sim-day) on the daily band (§4.45).
   * Was hardcoded `0.08` beside `decayFireScar`; same referent as fuelDecayK's
   * order of magnitude (weeks-to-season of visible scar, not a hard zero).
   */
  fireScarDecayK: 0.08,
  /** Fuel load threshold for fire spread (kg/m²). Below this, fire cannot carry. */
  fuelSpreadThreshold: 0.3,
  /** Fuel moisture extinction — soil.moisture fraction above which fire cannot spread. */
  fuelMoistureExtinction: 0.25,
  /** Slope factor exponent a in e^{a·tanφ} (fire runs uphill). */
  fireSlopeFactorA: 0.8,
  /**
   * Ceiling on the slope factor e^{a·tanφ} (§4.44, fire/fuel review §5).
   * Unclamped the term is unbounded in player-sculpted relief, so a
   * near-vertical face swamps the fuel and moisture terms and ignites
   * regardless of wetness. At 5, a cell still needs a moisture factor above
   * `fireSpreadStrengthMin / 5` to catch on the steepest possible face — i.e.
   * soil moisture below ~0.97 × extinction — so moisture stays decisive.
   * Real rate of spread saturates with slope; this is that saturation.
   */
  fireSlopeFactorMax: 5,
  /**
   * Surface rate of spread (m/min) with no wind — §4.44. Sets how far the
   * front advances per step: rings = ROS · Δt / Δx, with Δt from
   * `eventDtMinutes`. At the shipped event step this is a whole number of
   * cells, so the front moves visibly without crossing the map in one tick.
   * ~0.033 m/s, the moderate end of an unwinded surface fire in light fuels.
   */
  fireRateOfSpreadMetersPerMinute: 2,
  /** Spread strength above which a probed cell catches (dimensionless). */
  fireSpreadStrengthMin: 0.15,
  /** Fraction of fuel consumed per burn event [0,1]. */
  fireFuelConsumption: 0.85,
  /** Fraction of veg.cover killed by fire [0,1]. */
  fireVegMortality: 0.9,
  /** Max fire.fuelLoad (kg/m²) — bounds check. */
  fuelLoadMax: 20,

  /**
   * Slice 12 — Arrival / first occupant (C-007).
   * Days between seasonal / annual band commits (prototype compression).
   */
  seasonalDailySteps: 10,
  annualDailySteps: 36,
  /** Perimeter seed source strength (seeds·m⁻² equivalent). */
  seedSourceStrength: 40,
  /** Exponential kernel mean distance (cells). */
  seedMeanDistanceCells: 8,
  /** Scales seedBank × HSI inside 1 − exp(−·). */
  herbEstablishmentScale: 0.08,
  /** Biomass increment per seasonal band at p = 1 (kg DM·m⁻² / band). */
  herbEstablishmentRate: 0.35,
  /**
   * Fraction of (biomass − capacity) closed per seasonal band when over
   * capacity (L3). Herbaceous green tissue dies over weeks under drought
   * (nature-study heat-dial / winter dieback) — faster than woody, slower
   * than crust mats.
   */
  herbMortalityRate: 0.5,
  /** Resource-derived capacity at HSI = 1 (kg DM·m⁻²) — not fixed K (ES-006). */
  herbBiomassMax: 2.5,

  /**
   * Strand splash pioneer (C-018 / Slice N4) — salt-tolerant shore guild.
   * Same seed schedule as herb; HSI uses shore.exposure × tolerant salinity.
   */
  strandEstablishmentScale: 0.08,
  strandEstablishmentRate: 0.35,
  /** Herbaceous shore guild — same dieback timescale as herb (winter dieback). */
  strandMortalityRate: 0.5,
  strandBiomassMax: 2.5,
  /** Pore salt at/below which strand f_salinity stays 1 (herb fails earlier). */
  strandSalinityFullThrough: 0.9,
  strandTempKillC: -4,
  strandTempOptC: 12,

  /**
   * Sandy crest sand-binder (C-009 / Slice N5) — drained sand + exposure.
   * Same seed schedule as herb/strand; HSI uses drainage × crest × sand × burial.
   */
  binderEstablishmentScale: 0.08,
  binderEstablishmentRate: 0.35,
  /** Herbaceous binder — same dieback timescale as herb (winter dieback). */
  binderMortalityRate: 0.5,
  binderBiomassMax: 2.5,
  /** Loam still admits sparse binder; clay/rock stay at 0. */
  binderLoamSandFactor: 0.25,
  /**
   * Normalized accretion (−divergence of longshore transport, clamped to
   * [0,1]) at which binder burial suitability peaks. Zero and extreme
   * accretion both limit — Ammophila-type binders need moderate burial.
   */
  binderBurialOptimum: 0.35,
  /**
   * Salt-marsh engineer (C-016 / Slice N9) — mid-envelope hydroperiod hump.
   * Same seed schedule as herb/strand/binder; HSI uses inundation × salt × temp.
   */
  marshEstablishmentScale: 0.08,
  marshEstablishmentRate: 0.35,
  /** Herbaceous marsh — same dieback timescale as herb (winter dieback). */
  marshMortalityRate: 0.5,
  marshBiomassMax: 2.5,
  /** Pore salt at/below which marsh f_salinity stays 1 (herb fails earlier). */
  marshSalinityFullThrough: 0.9,
  marshTempKillC: -2,
  marshTempOptC: 14,

  /**
   * Climate-capped woody shrub (Slice N10) — stage-3 inland.
   * Same seed schedule; warmer f_temp than herb so mild/cold stall woody;
   * cover facilitation from herb fraction (no timers — ES-001).
   */
  shrubEstablishmentScale: 0.08,
  shrubEstablishmentRate: 0.3,
  /**
   * Woody stems persist across seasons; dieback is leaf/fine-twig, not
   * structural (Slice N10 woody shrub card) — slower than herbaceous guilds.
   */
  shrubMortalityRate: 0.15,
  shrubBiomassMax: 2.5,
  /** Mild (1°C) zeros shrub; warm (16°C) opens — stricter than herb (−4/12). */
  shrubTempKillC: 1,
  shrubTempOptC: 16,
  /** Michaelis half-saturation on herb cover fraction for facilitation. */
  shrubCoverHalfSat: 0.25,

  /**
   * Cryptogam / biological crust (Slice N11) — stage-2 cover bootstrap.
   * Same seed schedule; damp bare inland; open canopy (shade-limited by
   * denser guilds); upland inundation zero. No litter/OM Process.
   */
  crustEstablishmentScale: 0.08,
  crustEstablishmentRate: 0.4,
  /**
   * Living crust / moss mats desiccate and lose cover within days–weeks when
   * moisture collapses (Slice N11 crust card) — fastest guild dieback.
   */
  crustMortalityRate: 0.9,
  crustBiomassMax: 1.5,

  /**
   * Wall-clock seconds for display water depth to catch ~63% of a step change.
   * Observer only — sim depths stay authoritative (T-006). Stops 16× event
   * strobing from reading as a broken framerate.
   */
  waterDisplayTauSeconds: 0.28,
  overseasSeedBase: 40,
  /** Shore-biased exponential mean distance (cells) — shorter than mainland λ. */
  overseasMeanDistanceCells: 4,

  /**
   * Slice L2 — local seed rain (C-007 "dispersal pressure is a real path").
   * Standing biomass becomes a propagule source, so pressure is
   * `overseas(d) + Σ_neighbours biomass · kernel` rather than distance-to-shore
   * alone. Deterministic separable convolution — no stochastic arrivals while
   * C-003 stays Open.
   *
   * Strength is the pressure a *fully occupied* neighbourhood delivers, so the
   * local term is bounded by this value. Held well under the shore's overseas
   * pressure (overseasSeedBase × S_elig) so isolation still governs founding
   * and the C-019 area/isolation signal survives — local seed only decides how
   * a founded patch *spreads*, never whether an empty island is reached.
   */
  localSeedStrength: 10,
  /**
   * Default local kernel mean distance (cells) for guilds whose nature-study
   * card states no dispersal mode. Deliberately one shared number rather than
   * six invented ones (N-004 — no arbitrary hidden rules): herb, binder, marsh
   * and shrub all use this.
   */
  localSeedMeanDistanceCells: 2,
  /**
   * Strand disperses by sea (Slice N4 card — "sea-dispersed seed";
   * docs/evidence/island-colonization.md §3 hydrochory ≫ wind ≫ bird), so its
   * propagules travel further along the shore than an inland guild's — the one
   * guild with an explicit long-distance referent.
   */
  strandLocalMeanDistanceCells: 6,
  /**
   * Crust spreads as mats creeping into directly adjacent ground (Slice N11
   * card — "living soil crusts and moss mats"), the short-range end of the
   * contrast against sea-dispersed strand.
   */
  crustLocalMeanDistanceCells: 1,
  /** Default authored isolation when seaLevel is set (cells). */
  islandIsolationDefaultCells: 16,
  /** Area half-saturation for S_elig (cells). */
  eligibleAreaRefCells: 200,
  /** Isolation decay length for S_elig (cells). */
  eligibleIsolationMeanCells: 24,
  /** Floor / ceiling on eligible richness multiplier. */
  eligibleRichnessMin: 0.05,
  eligibleRichnessMax: 1,

  /**
   * Slice 20 / C-018 — soil porewater salinity.
   * Shoreline land mixes toward seawater each daily band (fraction of gap closed).
   */
  salinityOceanMixPerDay: 0.2,
  /** Seawater-equivalent concentration on the [0,1] salinity field. */
  salinitySeawater: 1,
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
  | "suitability"
  | "understoryLight"
  | "fuelLoad"
  | "potentialEt"
  | "actualEt"
  | "herbBiomass"
  | "strandBiomass"
  | "binderBiomass"
  | "marshBiomass"
  | "shrubBiomass"
  | "crustBiomass"
  | "seedBank"
  | "intertidal"
  | "shoreExposure"
  | "shoreLongshore"
  | "salinity";

/** Player land tools — causes (A-005). */
export type SitingTool =
  | "none"
  | "berm"
  | "dig"
  | "deposit"
  | "flatten"
  | "mold"
  | "duplicate"
  | "ignite";

/** Sculpt footprint tier (C-028 / C-006) — bucket = fine, shovel = mass. */
export type SitingBrushSize = "bucket" | "shovel";

export function sitingBrushRadiusFor(
  size: SitingBrushSize,
): number {
  return config.sitingBrushRadii[size];
}

/**
 * Geometric mold footprints (C-028 / §4.57) — fixed-form terrain stamps.
 * `cylinder` = round flat-top disc; `pyramid` = square base tapering to a peak;
 * `terrace` = square flat-top mesa; `glacier` = U-shaped trough + terminal
 * moraine carved along the local downhill direction (GEO-001 — authored
 * geological history, not a running Process; see
 * `WorldState.stampGlacierTrough`, which bypasses `moldProfileWeight` below
 * since its footprint is directional and two-signed, not a single radius ×
 * height). Shape-only (elev+depth); no material, no vegetation (C-006).
 * Material stays on the separate deposit path (C-009).
 */
export type MoldShape = "cylinder" | "pyramid" | "terrace" | "glacier";

/**
 * Relative profile weight in [0, 1] of a mold at footprint offset (dx, dz)
 * with fixed radius `r`. Multiplied by a signed height to raise or lower.
 */
export function moldProfileWeight(
  shape: MoldShape,
  dx: number,
  dz: number,
  r: number,
): number {
  switch (shape) {
    case "cylinder": {
      // Round flat-top disc — every cell inside the Euclidean radius full weight.
      return Math.hypot(dx, dz) <= r + 0.01 ? 1 : 0;
    }
    case "terrace": {
      // Square flat-top mesa — Chebyshev footprint, uniform weight.
      return Math.max(Math.abs(dx), Math.abs(dz)) <= r + 0.01 ? 1 : 0;
    }
    case "pyramid": {
      // Square base tapering linearly to a central peak.
      const cheb = Math.max(Math.abs(dx), Math.abs(dz));
      if (cheb > r + 0.01) return 0;
      return 1 - cheb / (r + 1);
    }
    case "glacier": {
      // Directional and two-signed (carve + moraine) — WorldState.stampMold
      // dispatches this shape to stampGlacierTrough before reaching here.
      return 0;
    }
  }
}
