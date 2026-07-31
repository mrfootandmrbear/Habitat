import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { FieldRegistry } from "./registry/FieldRegistry";
import type { ScalarBox } from "./registry/types";
import { SimScheduler } from "./process/scheduler";
import { surfaceWaterProcess } from "./process/surfaceWaterProcess";
import { soilWaterProcess } from "./process/soilWaterProcess";
import { vegetationProcess } from "./process/vegetationProcess";
import { vegetationSeasonalProcess } from "./process/vegetationSeasonalProcess";
import { geomorphologyProcess } from "./process/geomorphologyProcess";
import { groundwaterProcess } from "./process/groundwaterProcess";
import { habitatProcess } from "./process/habitatProcess";
import { fuelProcess } from "./process/fuelProcess";
import { fireProcess } from "./process/fireProcess";
import { dispersalProcess } from "./process/dispersalProcess";
import { atmosphereProcess } from "./process/atmosphereProcess";
import { fluxStep, computeOceanCells, computeShorelineCells } from "./hydrology/fluxStep";
import {
  stepAtmosphere,
  type PrecipPhase,
  PRECIP_PHASE_RAIN,
} from "./climate/atmosphere";
import {
  rainRegimeById,
  type RainRegimeId,
} from "./climate/rainRegime";
import { fillOrographicRainDepths } from "./climate/orographicPrecip";
import {
  countIntertidal,
  fillIntertidalMask,
  meanHighWater,
  meanLowWater,
} from "./climate/tidalEnvelope";
import { fillShoreExposure } from "./climate/shoreExposure";
import {
  fillLongshoreTendency,
  leeDepositWeight,
} from "./climate/longshoreTendency";
import { evaluateHsi, LIMITING_SPRAY } from "./habitat/hsiComposition";
import { evaluateStrandHsi } from "./habitat/strandHsiComposition";
import { evaluateBinderHsi } from "./habitat/binderHsiComposition";
import { evaluateMarshHsi } from "./habitat/marshHsiComposition";
import { evaluateShrubHsi } from "./habitat/shrubHsiComposition";
import { evaluateCrustHsi } from "./habitat/crustHsiComposition";
import {
  concentrateSalinity,
  diluteSalinity,
  mixTowardSeawater,
} from "./habitat/salinityComposition";
import {
  eligibleRichness,
  establishmentProbability,
  nextHerbBiomass,
  overseasSeedPressure,
  physicalCoverFrom,
  seedPressureAt,
  shoreDistanceField,
} from "./habitat/arrivalComposition";
import {
  computeD8Accumulation,
  computeD8FlowDirection,
  computePerimeterOutlets,
  computeWatershedLabels,
  priorityFloodFill,
  type FlowDirection,
} from "./hydrology/flowRouting";
import type { HydrologyModel } from "./hydrology/HydrologyModel";
import { HeightfieldHydrology } from "./hydrology/HeightfieldHydrology";
import {
  evaluateLight,
  terrainInsolation,
} from "./vegetation/lightCompetition";
import { evaluateEt } from "./hydrology/evapotranspiration";
import {
  MAX_SUBSTRATE_POROSITY,
  SUBSTRATE_LOAM,
  SUBSTRATE_ROCK,
  substrateProps,
} from "./terrain/substrates";
import {
  hillslopeDepositWeight,
  isLocalMinimum,
} from "./terrain/hillslopeDeposit";

/**
 * Owns authoritative world fields and the field registry.
 * Structural flow (3), soil (4), vegetation (5–6), geomorphology (8),
 * cheap GW/baseflow (8b / C-001), hygiene.
 */
export class WorldState {
  readonly width: number;
  readonly height: number;
  readonly terrain: Grid2D;
  readonly water: Grid2D;
  readonly soilMoisture: Grid2D;
  /**
   * Porewater salinity fraction [0,1] — Slice 20 / C-018.
   * Legacy: hysteresis memory (T-003 / S-008). Owner soilWater.
   * 1 = seawater-equivalent; rides water column (no separate salt ledger).
   */
  readonly soilSalinity: Grid2D;
  /**
   * Substrate class id — Slice S / C-009 (loam=0, sand=1, clay=2).
   * Legacy: material memory (T-003). Owner geomorphology. Properties from
   * `substrates.ts` table (T-004) — not per-material process forks.
   */
  readonly soilMaterial: Grid2D;
  /**
   * Mobile regolith depth (m) — Slice 8 (SIMULATION_MODEL §3).
   * Legacy: cannot be reconstructed from current forcing (T-003 / S-007).
   * Owner geomorphology (production / erosion).
   */
  readonly soilDepth: Grid2D;
  /**
   * Groundwater storage depth (m) — Slice 8b / C-001 (GWSWEX-style compartment).
   * Legacy: slow storage memory, not reconstructible from current rain (T-003).
   */
  readonly groundwaterStorage: Grid2D;
  /**
   * Liebig HSI [0,1] — Slice 9 (NATURAL_PROCESS_MATH §3.3).
   * Derived each daily band from moisture / depth / GW — not legacy.
   */
  readonly habitatSuitability: Grid2D;
  /** Limiting factor id: 0 moisture, 1 depth, 2 groundwater, 3 salinity. */
  readonly habitatLimitingFactor: Grid2D;
  /** Gap from HSI to the second-smallest factor (≥ 0). */
  readonly habitatLimitingGap: Grid2D;
  /** Fractional cover [0,1] — Slice 5; unit bound, not ecological K (ES-006). */
  readonly vegCover: Grid2D;
  /** Manning-like n — owned by vegetation (Slice 6 / E-005). */
  readonly surfaceRoughness: Grid2D;
  /** Infiltration capacity — owned by soilWater; veg contributes (Slice 6). */
  readonly infiltrationCapacity: Grid2D;
  /** Veg inbox contribution toward infiltration capacity. */
  readonly vegInfiltrationContribution: Grid2D;
  /** Slope/aspect incoming light [0,1] — Slice 11, derived from terrain. */
  readonly insolation: Grid2D;
  /** Leaf area index [0, max LAI] — Slice 11, derived from veg.cover. */
  readonly leafAreaIndex: Grid2D;
  /** Beer–Lambert light below canopy [0,1] — Slice 11. */
  readonly understoryLight: Grid2D;
  /** Potential ET depth (m) this daily step — dry-down inspectable. */
  readonly potentialEt: Grid2D;
  /** Actual ET depth (m) this daily step — dry-down inspectable. */
  readonly actualEt: Grid2D;
  /**
   * Burn scar intensity [0,1] — set on burn, decays daily (presentation memory).
   * Owner: fire.
   */
  readonly fireScar: Grid2D;
  /**
   * Fuel load (kg/m²) — Slice 10, Olson litter model (NATURAL_PROCESS_MATH §3.5).
   * Accumulates from veg.cover; depleted by fire. Owner: fuel, band: decadal.
   */
  readonly fuelLoad: Grid2D;
  /**
   * Active burning flag [0,1] — set by authored ignition, cleared after spread.
   * Owner: fire, band: event.
   */
  readonly fireBurning: Grid2D;
  /**
   * Fire intensity [0, 10] — energy release during burn (relative units).
   * Proportional to fuel consumed × spread rate proxy. Owner: fire, band: event.
   */
  readonly fireIntensity: Grid2D;
  /**
   * Herb seed bank (seeds·m⁻²) — Slice 12, fixed perimeter source (C-007).
   * Owner: dispersal, band: annual. Legacy: colonization memory (T-003 / S-007).
   */
  readonly herbSeedBank: Grid2D;
  /**
   * Establishment probability [0,1] — Slice 12 inspectable arrival chance.
   * Owner: dispersal; refreshed on annual commit from seed × HSI.
   */
  readonly herbEstablishment: Grid2D;
  /**
   * Herb biomass (kg DM·m⁻²) — Slice 12 first occupant.
   * Owner: vegetation, band: seasonal. Not legacy (herbaceous).
   */
  readonly herbBiomass: Grid2D;
  /**
   * Strand seed bank — C-018 splash pioneer (same overseas/perimeter schedule).
   * Owner: dispersal, band: annual. Legacy colonization memory.
   */
  readonly strandSeedBank: Grid2D;
  /** Strand establishment probability [0,1] from seed × strand HSI. */
  readonly strandEstablishment: Grid2D;
  /**
   * Strand biomass (kg DM·m⁻²) — C-018 shore mats.
   * Owner: vegetation, band: seasonal.
   */
  readonly strandBiomass: Grid2D;
  /**
   * Sand-binder seed bank — C-009 crest guild (same overseas/perimeter schedule).
   * Owner: dispersal, band: annual. Legacy colonization memory.
   */
  readonly binderSeedBank: Grid2D;
  /** Binder establishment probability [0,1] from seed × binder HSI. */
  readonly binderEstablishment: Grid2D;
  /**
   * Binder biomass (kg DM·m⁻²) — C-009 sandy crest mats.
   * Owner: vegetation, band: seasonal.
   */
  readonly binderBiomass: Grid2D;
  /**
   * Salt-marsh seed bank — C-016 mid-envelope guild (same overseas/perimeter schedule).
   * Owner: dispersal, band: annual. Legacy colonization memory.
   */
  readonly marshSeedBank: Grid2D;
  /** Marsh establishment probability [0,1] from seed × marsh HSI. */
  readonly marshEstablishment: Grid2D;
  /**
   * Marsh biomass (kg DM·m⁻²) — C-016 salt-marsh engineer.
   * Owner: vegetation, band: seasonal.
   */
  readonly marshBiomass: Grid2D;
  /**
   * Woody shrub seed bank — Slice N10 climate-capped inland (same overseas/perimeter schedule).
   * Owner: dispersal, band: annual. Legacy colonization memory.
   */
  readonly shrubSeedBank: Grid2D;
  /** Shrub establishment probability [0,1] from seed × shrub HSI. */
  readonly shrubEstablishment: Grid2D;
  /**
   * Shrub biomass (kg DM·m⁻²) — Slice N10 climate-capped woody.
   * Owner: vegetation, band: seasonal. Legacy standing woody (SIMULATION_MODEL).
   */
  readonly shrubBiomass: Grid2D;
  /**
   * Cryptogam crust seed bank — Slice N11 stage-2 bootstrap (same overseas/perimeter schedule).
   * Owner: dispersal, band: annual. Legacy colonization memory.
   */
  readonly crustSeedBank: Grid2D;
  /** Crust establishment probability [0,1] from seed × crust HSI. */
  readonly crustEstablishment: Grid2D;
  /**
   * Crust biomass (kg DM·m⁻²) — Slice N11 cryptogam / biological crust.
   * Owner: vegetation, band: seasonal. Legacy standing cover (SIMULATION_MODEL).
   */
  readonly crustBiomass: Grid2D;
  readonly registry: FieldRegistry;
  readonly scheduler: SimScheduler;

  /** Derived structural layers (SIMULATION_MODEL §3.9). */
  flowDirection: FlowDirection | null = null;
  flowAccumulation: Uint32Array | null = null;
  watershedLabel: Uint16Array | null = null;
  /** Filled routing surface (Slice 4b). */
  filledElevation: Float32Array | null = null;
  /** Pit depth on routing surface — registered derived field. */
  readonly depressionDepth: Grid2D;
  /**
   * Absorbing outlet cells (SIM §10.2). Default: perimeter edge-minima so the
   * preserve is not a closed bathtub. Tests may pass `closedBoundary: true`.
   * When seaLevel is set, perimeter outlets are unused — ocean cells drain.
   */
  outletCells: ReadonlySet<number> = new Set();
  /** Ocean cells (elev < seaLevel) — C-015. Empty when sea level absent. */
  oceanCells: ReadonlySet<number> = new Set();
  /**
   * Intertidal mask 0/1 — MLW ≤ elev < MHW (C-016). Empty when sea absent or
   * amplitude 0. Derived only; not a second hydrology.
   */
  readonly intertidal: Grid2D;
  /**
   * Shore exposure 0/1 — fetch × onshore wind (C-017). Derived; coastal
   * retreat is applied only inside geomorphology (no second sediment writer).
   */
  readonly shoreExposure: Grid2D;
  /**
   * Signed longshore tendency — exposure × (û · shore tangent) (C-017 / Slice 19).
   * Derived; lee deposit integrates inside geomorphology only.
   */
  readonly shoreLongshore: Grid2D;
  private readonly closedBoundary: boolean;
  /** Global sea datum (m). Undefined = legacy closed / perimeter mode. */
  private seaLevelMeters: number | undefined;
  /** Authored isolation (cells) for overseas S_elig — C-019. */
  private isolationCells: number;
  /** Half-range tidal amplitude (m) around sea level — C-016 envelope. */
  private tidalAmplitudeMeters = 0;
  /** Global wind components (unit-ish) — C-004 / C-017 force dial. */
  private windUx = 0;
  private windUz = 0;
  /** Phenology-pressure multiplier on the seasonal tick (C-021). 1 = neutral. */
  private seasonPressureMultiplier = 1;
  /** Storminess multiplier on hillslope + coastal erosion (C-022). 1 = neutral. */
  private erosionIntensityMultiplier = 1;
  /** Climate moisture archetype (C-004 / C-020) — no cell targeting. */
  private rainRegimeId: RainRegimeId = "dry";
  /** Atmosphere delivery armed only after setRainRegime (probes may still addRain). */
  private atmosphereArmed = false;
  /** Air temperature (°C) from Heat dial — drives precip phase. */
  private readonly airTempBox: ScalarBox = { value: 16 };
  /** Global precipitable cloud water (m depth-equivalent). */
  private readonly cloudWaterBox: ScalarBox = { value: 0 };
  /** 0 rain · 1 sleet · 2 snow. */
  private readonly precipPhaseBox: ScalarBox = { value: PRECIP_PHASE_RAIN };
  /** Scratch for orographic discharge (atmosphere Process). */
  private readonly atmosphereRainScratch: Float32Array;

  /** Single-source ledgers (registry ScalarBox). */
  private readonly precipBox: ScalarBox = { value: 0 };
  private readonly outflowBox: ScalarBox = { value: 0 };
  private readonly oceanExchangeBox: ScalarBox = { value: 0 };
  private readonly shoreErosionBox: ScalarBox = { value: 0 };
  private readonly infilBox: ScalarBox = { value: 0 };
  private readonly etBox: ScalarBox = { value: 0 };
  private readonly transpirationBox: ScalarBox = { value: 0 };
  private readonly soilEvaporationBox: ScalarBox = { value: 0 };
  private readonly openWaterEvaporationBox: ScalarBox = { value: 0 };
  /** Cumulative fuel consumed by fire (kg/m² summed over cells). */
  private readonly fuelConsumedBox: ScalarBox = { value: 0 };
  /** Band phase — event steps since last daily (§12). */
  private readonly bandPhaseBox: ScalarBox = { value: 0 };
  /** Days since last decadal band (prototype ladder). */
  private readonly decadalPhaseBox: ScalarBox = { value: 0 };
  /** Days since last seasonal band (Slice 12). */
  private readonly seasonalPhaseBox: ScalarBox = { value: 0 };
  /** Days since last annual band (Slice 12). */
  private readonly annualPhaseBox: ScalarBox = { value: 0 };
  /** Integer sim-minute clock (SIMULATION_MODEL §6.1). */
  private readonly simMinutesBox: ScalarBox = { value: 0 };

  private readonly delta: Float32Array;
  private readonly hydrology: HeightfieldHydrology;
  private readonly flowRate: number;
  private readonly maxOutflowFraction: number;
  /** Per-instance GW rates — zeroed for no-GW probe baselines (C-001). */
  private readonly gwRechargeRate: number;
  private readonly gwRecessionAlpha: number;
  private readonly gwFieldCapacityFraction: number;
  private readonly gwChannelBoost: number;
  private structureDirty = false;

  constructor(
    terrain: Grid2D,
    options?: {
      flowRate?: number;
      maxOutflowFraction?: number;
      /** When false, recharge and baseflow are off (paired probe baseline). */
      groundwaterEnabled?: boolean;
      /**
       * When true, map edges are no-flow with no outlets (closed basin).
       * Default false — perimeter pour points drain (SIM §10.2 provisional).
       * Ignored when `seaLevel` is set (ocean is the outlet — C-015).
       */
      closedBoundary?: boolean;
      /**
       * Global sea level in metres on the elevation datum (C-015).
       * Opt-in: absent preserves legacy perimeter / closed behavior and baselines.
       */
      seaLevel?: number;
      /**
       * Tidal half-range amplitude in metres around sea level (C-016).
       * Requires seaLevel; 0 or absent → empty intertidal envelope.
       */
      tidalAmplitude?: number;
      /** Global wind (C-004 / C-017) — no cell targeting. */
      windUx?: number;
      windUz?: number;
      /** Season force dial multiplier (C-021). Default 1 (neutral / "typical"). */
      seasonPressure?: number;
      /** Erosion force dial multiplier (C-022). Default 1 (neutral / "moderate"). */
      erosionIntensity?: number;
      /**
       * Authored island isolation in cells (C-019). Used when seaLevel is set.
       * Larger → lower eligible richness / overseas seed pressure.
       */
      islandIsolation?: number;
    },
  ) {
    this.width = terrain.width;
    this.height = terrain.height;
    this.terrain = terrain;
    this.water = new Grid2D(this.width, this.height);
    this.soilMoisture = new Grid2D(this.width, this.height);
    this.soilSalinity = new Grid2D(this.width, this.height);
    this.soilMaterial = new Grid2D(
      this.width,
      this.height,
      SUBSTRATE_LOAM,
    );
    this.soilDepth = new Grid2D(
      this.width,
      this.height,
      config.defaultSoilDepthMeters,
    );
    this.groundwaterStorage = new Grid2D(this.width, this.height);
    this.habitatSuitability = new Grid2D(this.width, this.height);
    this.habitatLimitingFactor = new Grid2D(this.width, this.height);
    this.habitatLimitingGap = new Grid2D(this.width, this.height);
    this.vegCover = new Grid2D(this.width, this.height);
    this.surfaceRoughness = new Grid2D(
      this.width,
      this.height,
      config.baseRoughness,
    );
    this.infiltrationCapacity = new Grid2D(
      this.width,
      this.height,
      config.infiltrationRate,
    );
    this.vegInfiltrationContribution = new Grid2D(this.width, this.height);
    this.insolation = new Grid2D(this.width, this.height);
    this.leafAreaIndex = new Grid2D(this.width, this.height);
    this.understoryLight = new Grid2D(this.width, this.height);
    this.potentialEt = new Grid2D(this.width, this.height);
    this.actualEt = new Grid2D(this.width, this.height);
    this.fireScar = new Grid2D(this.width, this.height);
    this.fuelLoad = new Grid2D(this.width, this.height);
    this.fireBurning = new Grid2D(this.width, this.height);
    this.fireIntensity = new Grid2D(this.width, this.height);
    this.herbSeedBank = new Grid2D(this.width, this.height);
    this.herbEstablishment = new Grid2D(this.width, this.height);
    this.herbBiomass = new Grid2D(this.width, this.height);
    this.strandSeedBank = new Grid2D(this.width, this.height);
    this.strandEstablishment = new Grid2D(this.width, this.height);
    this.strandBiomass = new Grid2D(this.width, this.height);
    this.binderSeedBank = new Grid2D(this.width, this.height);
    this.binderEstablishment = new Grid2D(this.width, this.height);
    this.binderBiomass = new Grid2D(this.width, this.height);
    this.marshSeedBank = new Grid2D(this.width, this.height);
    this.marshEstablishment = new Grid2D(this.width, this.height);
    this.marshBiomass = new Grid2D(this.width, this.height);
    this.shrubSeedBank = new Grid2D(this.width, this.height);
    this.shrubEstablishment = new Grid2D(this.width, this.height);
    this.shrubBiomass = new Grid2D(this.width, this.height);
    this.crustSeedBank = new Grid2D(this.width, this.height);
    this.crustEstablishment = new Grid2D(this.width, this.height);
    this.crustBiomass = new Grid2D(this.width, this.height);
    this.depressionDepth = new Grid2D(this.width, this.height);
    this.intertidal = new Grid2D(this.width, this.height);
    this.shoreExposure = new Grid2D(this.width, this.height);
    this.shoreLongshore = new Grid2D(this.width, this.height);
    this.delta = new Float32Array(this.width * this.height);
    this.atmosphereRainScratch = new Float32Array(this.width * this.height);
    this.flowRate = options?.flowRate ?? config.flowRate;
    this.maxOutflowFraction =
      options?.maxOutflowFraction ?? config.maxOutflowFraction;
    const gwOn = options?.groundwaterEnabled !== false;
    this.gwRechargeRate = gwOn ? config.gwRechargeRate : 0;
    this.gwRecessionAlpha = gwOn ? config.gwRecessionAlpha : 0;
    this.gwFieldCapacityFraction = config.gwFieldCapacityFraction;
    this.gwChannelBoost = config.gwChannelBoost;
    this.closedBoundary = options?.closedBoundary === true;
    this.seaLevelMeters =
      options?.seaLevel !== undefined && Number.isFinite(options.seaLevel)
        ? options.seaLevel
        : undefined;
    this.tidalAmplitudeMeters =
      options?.tidalAmplitude !== undefined &&
      Number.isFinite(options.tidalAmplitude) &&
      options.tidalAmplitude > 0
        ? options.tidalAmplitude
        : 0;
    this.windUx =
      options?.windUx !== undefined && Number.isFinite(options.windUx)
        ? options.windUx
        : 0;
    this.windUz =
      options?.windUz !== undefined && Number.isFinite(options.windUz)
        ? options.windUz
        : 0;
    this.seasonPressureMultiplier =
      options?.seasonPressure !== undefined &&
      Number.isFinite(options.seasonPressure) &&
      options.seasonPressure > 0
        ? options.seasonPressure
        : 1;
    this.erosionIntensityMultiplier =
      options?.erosionIntensity !== undefined &&
      Number.isFinite(options.erosionIntensity) &&
      options.erosionIntensity >= 0
        ? options.erosionIntensity
        : 1;
    this.isolationCells =
      options?.islandIsolation !== undefined &&
      Number.isFinite(options.islandIsolation) &&
      options.islandIsolation >= 0
        ? options.islandIsolation
        : config.islandIsolationDefaultCells;

    this.registry = new FieldRegistry();
    this.registerFields();

    this.hydrology = new HeightfieldHydrology(this);
    this.scheduler = new SimScheduler([
      atmosphereProcess,
      surfaceWaterProcess,
      soilWaterProcess,
      groundwaterProcess,
      habitatProcess,
      vegetationProcess,
      vegetationSeasonalProcess,
      dispersalProcess,
      geomorphologyProcess,
      fuelProcess,
      fireProcess,
    ]);

    this.recomputeFlowStructure();
    // Fixed perimeter seed pressure available from t=0; annual band refreshes it.
    this.runDispersalStep(1);
  }

  get hydrologyModel(): HydrologyModel {
    return this.hydrology;
  }

  get precipitationLedger(): number {
    return this.precipBox.value;
  }
  set precipitationLedger(v: number) {
    this.precipBox.value = v;
  }

  get boundaryOutflowLedger(): number {
    return this.outflowBox.value;
  }
  set boundaryOutflowLedger(v: number) {
    this.outflowBox.value = v;
  }

  get oceanExchangeLedger(): number {
    return this.oceanExchangeBox.value;
  }
  set oceanExchangeLedger(v: number) {
    this.oceanExchangeBox.value = v;
  }

  /** Cumulative soil depth·cell removed by coastal wave work (C-017). */
  get shoreErosionLedger(): number {
    return this.shoreErosionBox.value;
  }
  set shoreErosionLedger(v: number) {
    this.shoreErosionBox.value = v;
  }

  /** Current sea level (m), or undefined when legacy boundary mode. */
  get seaLevel(): number | undefined {
    return this.seaLevelMeters;
  }

  /** Authored isolation (cells) for overseas eligible richness (C-019). */
  get islandIsolation(): number {
    return this.isolationCells;
  }

  /**
   * Set authored isolation (C-019). No-op on NaN / negative.
   * Recomputes overseas seed pressure when sea level is set.
   */
  setIslandIsolation(cells: number): void {
    if (!Number.isFinite(cells) || cells < 0) return;
    this.isolationCells = cells;
    if (this.seaLevelMeters !== undefined) {
      this.runDispersalStep(1);
    }
  }

  /**
   * Set global sea level (C-015 force dial — no cell targeting).
   * Pass `undefined` to clear and restore legacy perimeter outlets.
   */
  setSeaLevel(level: number | undefined): void {
    this.seaLevelMeters =
      level !== undefined && Number.isFinite(level) ? level : undefined;
    this.markStructureDirty();
    this.ensureStructureFresh();
    this.runDispersalStep(1);
  }

  /** Current tidal half-range amplitude (m). 0 when envelope is off. */
  get tidalAmplitude(): number {
    return this.tidalAmplitudeMeters;
  }

  /** Mean high water (m), or undefined when sea level absent. */
  get meanHighWater(): number | undefined {
    if (this.seaLevelMeters === undefined) return undefined;
    return meanHighWater(this.seaLevelMeters, this.tidalAmplitudeMeters);
  }

  /** Mean low water (m), or undefined when sea level absent. */
  get meanLowWater(): number | undefined {
    if (this.seaLevelMeters === undefined) return undefined;
    return meanLowWater(this.seaLevelMeters, this.tidalAmplitudeMeters);
  }

  /**
   * Set tidal envelope half-range (C-016 — no cell targeting, no phase).
   * Amplitude ≤ 0 clears the intertidal mask. No-op effect without sea level.
   */
  setTidalAmplitude(amplitude: number): void {
    this.tidalAmplitudeMeters =
      Number.isFinite(amplitude) && amplitude > 0 ? amplitude : 0;
    this.markStructureDirty();
    this.ensureStructureFresh();
  }

  /** Current wind components (force dial — no cell targeting). */
  get wind(): { ux: number; uz: number } {
    return { ux: this.windUx, uz: this.windUz };
  }

  /**
   * Set global wind (C-004 / C-017). Refreshes shore fields; does not target cells.
   */
  setWind(ux: number, uz: number): void {
    this.windUx = Number.isFinite(ux) ? ux : 0;
    this.windUz = Number.isFinite(uz) ? uz : 0;
    this.recomputeShoreExposure();
  }

  /** Season force dial multiplier (C-021) — no cell targeting. 1 = neutral. */
  get seasonPressure(): number {
    return this.seasonPressureMultiplier;
  }

  /** Set season pressure multiplier. Non-finite / non-positive is a no-op. */
  setSeasonPressure(multiplier: number): void {
    if (!Number.isFinite(multiplier) || multiplier <= 0) return;
    this.seasonPressureMultiplier = multiplier;
  }

  /** Erosion force dial multiplier (C-022) — no cell targeting. 1 = neutral. */
  get erosionIntensity(): number {
    return this.erosionIntensityMultiplier;
  }

  /** Set erosion intensity multiplier. Non-finite / negative is a no-op. */
  setErosionIntensity(multiplier: number): void {
    if (!Number.isFinite(multiplier) || multiplier < 0) return;
    this.erosionIntensityMultiplier = multiplier;
  }

  /** Climate rainfall archetype (C-004 / C-020) — global only. */
  setRainRegime(id: RainRegimeId): void {
    this.rainRegimeId = id;
    this.atmosphereArmed = true;
  }

  get rainRegime(): RainRegimeId {
    return this.rainRegimeId;
  }

  /** Heat dial → air temperature (°C). Phase follows (C-020). */
  setAirTemperature(tempC: number): void {
    this.airTempBox.value = Number.isFinite(tempC) ? tempC : 16;
  }

  get airTemperature(): number {
    return this.airTempBox.value;
  }

  get cloudWater(): number {
    return this.cloudWaterBox.value;
  }

  get precipPhase(): PrecipPhase {
    const v = this.precipPhaseBox.value;
    if (v >= 2) return 2;
    if (v >= 1) return 1;
    return 0;
  }

  /**
   * Atmosphere Process step (full C-020): charge cloud from climate dial,
   * discharge orographic precip when the storm window opens. No cell args.
   * No-op until setRainRegime arms delivery (legacy probes keep explicit addRain).
   */
  runAtmosphereStep(): void {
    if (!this.atmosphereArmed) return;
    const eventsDone = this.simMinutes / config.eventDtMinutes;
    const dayIndex = Math.floor(eventsDone / config.dailyEventSteps);
    const indexInDay = this.eventStepsSinceDaily;
    const result = stepAtmosphere({
      regime: rainRegimeById(this.rainRegimeId),
      airTempC: this.airTempBox.value,
      cloudWater: this.cloudWaterBox.value,
      dayIndex,
      eventIndexInDay: indexInDay,
      dailyEventSteps: config.dailyEventSteps,
      baseDepthPerEvent: config.rainDepthPerEvent,
    });
    this.cloudWaterBox.value = result.cloudWater;
    this.precipPhaseBox.value = result.precipPhase;
    if (result.dischargeDepth > 0) {
      fillOrographicRainDepths(
        this.atmosphereRainScratch,
        this.terrain.data,
        this.width,
        this.height,
        result.dischargeDepth,
        { ux: this.windUx, uz: this.windUz },
        config.orographicGamma,
        (cell) => this.oceanCells.has(cell),
      );
      this.addRainField(this.atmosphereRainScratch);
    }
  }

  get infiltrationLedger(): number {
    return this.infilBox.value;
  }
  set infiltrationLedger(v: number) {
    this.infilBox.value = v;
  }

  get etLedger(): number {
    return this.etBox.value;
  }
  set etLedger(v: number) {
    this.etBox.value = v;
  }

  get transpirationLedger(): number {
    return this.transpirationBox.value;
  }
  set transpirationLedger(v: number) {
    this.transpirationBox.value = v;
  }

  get soilEvaporationLedger(): number {
    return this.soilEvaporationBox.value;
  }
  set soilEvaporationLedger(v: number) {
    this.soilEvaporationBox.value = v;
  }

  get openWaterEvaporationLedger(): number {
    return this.openWaterEvaporationBox.value;
  }
  set openWaterEvaporationLedger(v: number) {
    this.openWaterEvaporationBox.value = v;
  }

  get fuelConsumedLedger(): number {
    return this.fuelConsumedBox.value;
  }
  set fuelConsumedLedger(v: number) {
    this.fuelConsumedBox.value = v;
  }

  get eventStepsSinceDaily(): number {
    return this.bandPhaseBox.value;
  }
  private set eventStepsSinceDaily(v: number) {
    this.bandPhaseBox.value = v;
  }

  get daysSinceDecadal(): number {
    return this.decadalPhaseBox.value;
  }
  private set daysSinceDecadal(v: number) {
    this.decadalPhaseBox.value = v;
  }

  get daysSinceSeasonal(): number {
    return this.seasonalPhaseBox.value;
  }
  private set daysSinceSeasonal(v: number) {
    this.seasonalPhaseBox.value = v;
  }

  get daysSinceAnnual(): number {
    return this.annualPhaseBox.value;
  }
  private set daysSinceAnnual(v: number) {
    this.annualPhaseBox.value = v;
  }

  get simMinutes(): number {
    return this.simMinutesBox.value;
  }
  private set simMinutes(v: number) {
    this.simMinutesBox.value = v;
  }

  /**
   * Advance one event band tick (config.eventDtMinutes sim-minutes).
   * `dt` is the flux integrator step within the event (defaults to eventFluxDt).
   * Daily band receives dt in sim-days (1 = one full day); seasonal / annual /
   * decadal receive band units (1 = one full compressed commit) — rates scale by dt.
   */
  stepEvent(dt: number = config.eventFluxDt): void {
    if (this.structureDirty) {
      this.recomputeFlowStructure();
      this.structureDirty = false;
    }
    this.scheduler.runBand("event", this, dt);
    this.simMinutes = this.simMinutes + config.eventDtMinutes;
    this.registry.assertBounds("event");

    this.eventStepsSinceDaily = this.eventStepsSinceDaily + 1;
    if (this.eventStepsSinceDaily >= config.dailyEventSteps) {
      this.eventStepsSinceDaily = 0;
      this.scheduler.runBand("daily", this, 1);
      this.decayFireScar(1);
      this.registry.assertBounds("daily");

      this.daysSinceSeasonal = this.daysSinceSeasonal + 1;
      if (this.daysSinceSeasonal >= config.seasonalDailySteps) {
        this.daysSinceSeasonal = 0;
        this.scheduler.runBand("seasonal", this, 1);
        this.registry.assertBounds("seasonal");
      }

      this.daysSinceAnnual = this.daysSinceAnnual + 1;
      if (this.daysSinceAnnual >= config.annualDailySteps) {
        this.daysSinceAnnual = 0;
        this.scheduler.runBand("annual", this, 1);
        this.registry.assertBounds("annual");
      }

      this.daysSinceDecadal = this.daysSinceDecadal + 1;
      if (this.daysSinceDecadal >= config.decadalDailySteps) {
        this.daysSinceDecadal = 0;
        this.scheduler.runBand("decadal", this, 1);
        this.registry.assertBounds("decadal");
      }
    }
  }

  recomputeFlowStructure(): void {
    const elev = this.terrain.data;
    if (this.seaLevelMeters !== undefined) {
      this.oceanCells = computeOceanCells(elev, this.seaLevelMeters);
      this.outletCells = new Set();
      if (this.tidalAmplitudeMeters > 0) {
        const mlw = meanLowWater(this.seaLevelMeters, this.tidalAmplitudeMeters);
        const mhw = meanHighWater(this.seaLevelMeters, this.tidalAmplitudeMeters);
        fillIntertidalMask(this.intertidal.data, elev, mlw, mhw);
      } else {
        this.intertidal.data.fill(0);
      }
    } else {
      this.oceanCells = new Set();
      this.intertidal.data.fill(0);
    }
    this.recomputeShoreExposure();
    const { filled, depressionDepth } = priorityFloodFill(
      this.width,
      this.height,
      elev,
      this.oceanCells.size > 0 ? this.oceanCells : undefined,
    );
    this.filledElevation = filled;
    this.depressionDepth.data.set(depressionDepth);
    // Route on filled surface so pits spill honestly (H-003). Same open set
    // priorityFloodFill was seeded with, so flat resolution agrees with fill.
    this.flowDirection = computeD8FlowDirection(
      this.width,
      this.height,
      filled,
      this.oceanCells.size > 0 ? this.oceanCells : undefined,
    );
    this.flowAccumulation = computeD8Accumulation(
      this.width,
      this.height,
      filled,
      this.flowDirection,
    );
    this.watershedLabel = computeWatershedLabels(
      this.width,
      this.height,
      this.flowDirection,
    );
    if (this.seaLevelMeters === undefined) {
      this.outletCells = this.closedBoundary
        ? new Set()
        : computePerimeterOutlets(this.width, this.height, elev);
    }
  }

  /**
   * Derived shore.exposure + shore.longshore from fetch × wind (C-017).
   * Not a sediment writer — geomorphology integrates retreat / lee deposit.
   */
  recomputeShoreExposure(): void {
    if (this.oceanCells.size === 0) {
      this.shoreExposure.data.fill(0);
      this.shoreLongshore.data.fill(0);
      return;
    }
    const wind = { ux: this.windUx, uz: this.windUz };
    fillShoreExposure(
      this.shoreExposure.data,
      this.width,
      this.height,
      this.terrain.data,
      this.oceanCells,
      wind,
      config.shoreFetchMaxCells,
    );
    fillLongshoreTendency(
      this.shoreLongshore.data,
      this.width,
      this.height,
      this.oceanCells,
      this.shoreExposure.data,
      wind,
    );
  }

  /** Mark structure dirty; recompute at next event step or ensureStructureFresh (§7.2). */
  markStructureDirty(): void {
    this.structureDirty = true;
  }

  ensureStructureFresh(): void {
    if (this.structureDirty) {
      this.recomputeFlowStructure();
      this.structureDirty = false;
    }
  }

  runSurfaceWaterStep(dt: number): void {
    const result = fluxStep(
      this.width,
      this.height,
      this.terrain.data,
      this.water.data,
      this.delta,
      dt,
      this.flowRate,
      this.maxOutflowFraction,
      this.outletCells,
      this.surfaceRoughness.data,
      config.baseRoughness,
      this.oceanCells.size > 0 ? this.oceanCells : undefined,
    );
    this.boundaryOutflowLedger += result.boundaryOutflow;
    this.oceanExchangeLedger += result.oceanExchange;
  }

  /** Daily soil water. `dt` is sim-days (1 = one full daily band). */
  runSoilWaterStep(dt: number): void {
    const scale = Math.max(0, dt);
    const w = this.water.data;
    const m = this.soilMoisture.data;
    const salt = this.soilSalinity.data;
    const mat = this.soilMaterial.data;
    const depth = this.soilDepth.data;
    const cap = this.infiltrationCapacity.data;
    const contrib = this.vegInfiltrationContribution.data;
    const cover = this.vegCover.data;
    const elev = this.terrain.data;
    const petField = this.potentialEt.data;
    const aetField = this.actualEt.data;
    const petAtFullSun = config.etRate * scale;
    const openWaterPet = config.openWaterEtRate * scale;
    const minDepth = 1e-3;
    const oceanMix = Math.min(1, config.salinityOceanMixPerDay * scale);
    const seawater = config.salinitySeawater;
    const shoreline =
      this.oceanCells.size > 0
        ? computeShorelineCells(this.width, this.height, this.oceanCells)
        : null;

    // Per-cell substrate base + veg contribution (C-009 / T-004).
    for (let i = 0; i < cap.length; i++) {
      const base = substrateProps(mat[i]!).infiltrationRate * scale;
      cap[i] = base + contrib[i]! * scale;
    }

    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const i = z * this.width + x;
        const porosity = substrateProps(mat[i]!).porosity;
        const h = Math.max(depth[i]!, minDepth);
        const room = Math.max(0, (porosity - m[i]!) * h);
        const storageBefore = m[i]! * h;
        const infiltrate = Math.min(w[i]!, cap[i]!, room);
        if (infiltrate > 0) {
          w[i]! -= infiltrate;
          m[i]! += infiltrate / h;
          salt[i] = diluteSalinity(salt[i]!, storageBefore, infiltrate);
          this.infiltrationLedger += infiltrate;
        }

        // Ocean-sourced salt on shoreline land (C-018) — not a salt mass ledger.
        if (shoreline?.has(i) && oceanMix > 0) {
          salt[i] = mixTowardSeawater(salt[i]!, oceanMix, seawater);
        }

        const insolation = terrainInsolation(
          elev,
          this.width,
          this.height,
          x,
          z,
        );
        const sample = evaluateEt({
          insolation,
          moisture: m[i]!,
          soilPorosity: porosity,
          wiltingFraction: config.etWiltingFraction,
          fieldCapacityFraction: config.etFieldCapacityFraction,
          cover: cover[i]!,
          surfaceDepth: w[i]!,
          petAtFullSun,
          openWaterPet,
        });

        const openTake = Math.min(w[i]!, sample.openWaterEvaporation);
        w[i]! -= openTake;

        const soilDemand = sample.transpiration + sample.soilEvaporation;
        const storage = m[i]! * h;
        const soilTake = Math.min(storage, soilDemand);
        if (soilTake > 0) {
          salt[i] = concentrateSalinity(salt[i]!, storage, soilTake);
        }
        m[i]! = (storage - soilTake) / h;

        const soilScale = soilDemand > 0 ? soilTake / soilDemand : 0;
        const transpiration = sample.transpiration * soilScale;
        const soilEvaporation = sample.soilEvaporation * soilScale;
        const aet = openTake + transpiration + soilEvaporation;

        petField[i] = sample.pet;
        aetField[i] = aet;
        this.openWaterEvaporationLedger += openTake;
        this.transpirationLedger += transpiration;
        this.soilEvaporationLedger += soilEvaporation;
        this.etLedger += aet;
      }
    }
  }

  /**
   * Cheap GW recharge + channel-preferential baseflow (C-001 / H-001 / H-004).
   * Linear reservoir — not Darcy iterative solve / Richards (EXTERNAL_REFERENCES).
   * `dt` is sim-days (1 = one full daily band).
   */
  runGroundwaterStep(dt: number): void {
    if (this.gwRechargeRate === 0 && this.gwRecessionAlpha === 0) return;
    const scale = Math.max(0, dt);

    this.ensureStructureFresh();
    const m = this.soilMoisture.data;
    const mat = this.soilMaterial.data;
    const depth = this.soilDepth.data;
    const gw = this.groundwaterStorage.data;
    const w = this.water.data;
    const acc = this.flowAccumulation;
    const minDepth = 1e-3;
    const nCells = this.width * this.height;
    const rechargeCap = this.gwRechargeRate * scale;
    // Linear reservoir: 1 − (1−α)^dt ≈ α·dt for small α·dt; clamp fraction ≤ 1.
    const recessionFrac = Math.min(1, this.gwRecessionAlpha * scale);

    for (let i = 0; i < gw.length; i++) {
      const h = Math.max(depth[i]!, minDepth);
      const porosity = substrateProps(mat[i]!).porosity;
      const fc = porosity * this.gwFieldCapacityFraction;

      if (rechargeCap > 0 && m[i]! > fc) {
        const excess = (m[i]! - fc) * h;
        const recharge = Math.min(excess, rechargeCap);
        if (recharge > 0) {
          m[i]! -= recharge / h;
          gw[i]! += recharge;
        }
      }

      if (recessionFrac > 0 && gw[i]! > 0) {
        const a = acc ? acc[i]! : 1;
        const aNorm = Math.min(1, a / nCells);
        const channelFactor = 1 + this.gwChannelBoost * aNorm;
        const q = Math.min(gw[i]!, gw[i]! * recessionFrac * channelFactor);
        gw[i]! -= q;
        w[i]! += q;
      }
    }
  }

  /**
   * Liebig HSI + limiting factor (Slice 9 / NATURAL_PROCESS_MATH §3.3).
   * Composition: docs/slices/9-composition.md — min, not product.
   * Slice 20: soil.salinity is a fourth Liebig arm (C-018).
   * Heat plant gate: climate.airTemperature is a fifth Liebig arm (C-004 / C-020).
   * Spray gate: shore.exposure is a sixth Liebig arm (C-017) — ≠ soil salt.
   * Inundation: tidal envelope hydroperiod is a seventh arm (C-016).
   * Light: open-sky aspect insolation is an eighth arm (C-007 / C-011) — ≠ understory.
   */
  runHabitatStep(_dt: number): void {
    const m = this.soilMoisture.data;
    const mat = this.soilMaterial.data;
    const depth = this.soilDepth.data;
    const gw = this.groundwaterStorage.data;
    const salt = this.soilSalinity.data;
    const exposure = this.shoreExposure.data;
    const elev = this.terrain.data;
    const hsi = this.habitatSuitability.data;
    const lim = this.habitatLimitingFactor.data;
    const gap = this.habitatLimitingGap.data;
    const depthRef = config.hsiDepthRefMeters;
    const gwRef = config.hsiGwRefMeters;
    const airTempC = this.airTemperature;
    const tempKillC = config.herbTempKillC;
    const tempOptC = config.herbTempOptC;
    const hasTide =
      this.seaLevelMeters !== undefined && this.tidalAmplitudeMeters > 0;
    const mlw = hasTide
      ? meanLowWater(this.seaLevelMeters!, this.tidalAmplitudeMeters)
      : undefined;
    const mhw = hasTide
      ? meanHighWater(this.seaLevelMeters!, this.tidalAmplitudeMeters)
      : undefined;

    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const i = z * this.width + x;
        const insolation = terrainInsolation(
          elev,
          this.width,
          this.height,
          x,
          z,
        );
        const sample = evaluateHsi({
          moisture: m[i]!,
          soilDepth: depth[i]!,
          groundwater: gw[i]!,
          porosity: substrateProps(mat[i]!).porosity,
          depthRef,
          gwRef,
          salinity: salt[i]!,
          airTempC,
          tempKillC,
          tempOptC,
          shoreExposure: exposure[i]!,
          elevMeters: hasTide ? elev[i]! : undefined,
          mlwMeters: mlw,
          mhwMeters: mhw,
          insolation,
        });
        hsi[i] = sample.hsi;
        lim[i] = sample.limiting;
        gap[i] = sample.limitingGap;
      }
    }
  }

  /**
   * Decadal soil production + GEO-002 erosion + coastal wave work (C-017).
   * Production everywhere; channel erosion where accumulation earns cost;
   * coastal retreat on exposed shoreline; Slice 19 lee deposit from the
   * retained longshore budget; Exner-lite inland redeposit of hillslope
   * removals into basins/flats (capacity drop) — still this owner (no SWE,
   * no second sediment writer). Elev and depth move together so
   * bedrock = elev − depth is invariant. `dt` is band units
   * (1 = one full compressed decadal commit).
   */
  runGeomorphologyStep(dt: number): void {
    this.ensureStructureFresh();
    const scale = Math.max(0, dt);
    const elev = this.terrain.data;
    const depth = this.soilDepth.data;
    const mat = this.soilMaterial.data;
    const cover = this.vegCover.data;
    const herbBio = this.herbBiomass.data;
    const strandBio = this.strandBiomass.data;
    const binderBio = this.binderBiomass.data;
    const marshBio = this.marshBiomass.data;
    const shrubBio = this.shrubBiomass.data;
    const crustBio = this.crustBiomass.data;
    const exposure = this.shoreExposure.data;
    const depression = this.depressionDepth.data;
    const acc = this.flowAccumulation;
    const filled = this.filledElevation ?? elev;
    const dx = config.cellSizeMeters;
    const zFloor = config.elevationFloor;
    const p0 = config.soilProductionP0 * scale;
    const h0 = config.soilProductionH0;
    // Erosion intensity (C-022) scales disturbance work only — never
    // production (weathering is not a storminess referent, N-004).
    const erosionScale = scale * this.erosionIntensityMultiplier;
    const kCoast = config.shoreErosionK * erosionScale;
    const retain = Math.min(1, Math.max(0, config.longshoreRetainFraction));
    const retainHs = Math.min(
      1,
      Math.max(0, config.hillslopeSedimentRetainFraction),
    );
    const aMin = config.erosionMinAccumulation;
    const minDepth = 1e-3;
    const nCell = this.width * this.height;
    const coastRemoved = new Float32Array(nCell);
    const hillslopeRemoved = new Float32Array(nCell);
    // Snapshot bedrock once per band — elev = bed + depth on every write
    // (recomputing bed mid-step from float32 elev−depth drifts past 1e-6).
    const bedrock = new Float32Array(nCell);
    for (let i = 0; i < nCell; i++) bedrock[i] = elev[i]! - depth[i]!;
    let dirty = false;
    let shoreOcean = 0;

    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const i = z * this.width + x;
        if (this.oceanCells.has(i)) continue;
        const h = depth[i]!;
        const prod = p0 * Math.exp(-h / h0);

        let hillslopeErode = 0;
        const a = acc ? acc[i]! : 0;
        // C-009: living cover stack blunts hillslope + coastal work (not veg.cover alone).
        const physical = physicalCoverFrom(
          cover[i]!,
          herbBio[i]!,
          config.herbBiomassMax,
          strandBio[i]!,
          config.strandBiomassMax,
          binderBio[i]!,
          config.binderBiomassMax,
          marshBio[i]!,
          config.marshBiomassMax,
          shrubBio[i]!,
          config.shrubBiomassMax,
          crustBio[i]!,
          config.crustBiomassMax,
        );
        const cFactor = 1 - physical * 0.85;
        // Ponded cells (Priority-Flood residual): no hillslope incision —
        // water-surface slope is flat; Exner sinks receive load instead.
        if (a >= aMin && depression[i]! <= 1e-6) {
          const slope = neighborSlope(filled, this.width, this.height, x, z, dx);
          const aNorm = Math.min(1, a / (this.width * this.height));
          const kE = substrateProps(mat[i]!).erosionK * erosionScale;
          hillslopeErode =
            kE * Math.sqrt(Math.max(aNorm, 1e-6)) * slope * cFactor;
        }

        // C-017: fetch×wind exposure contributes here — geomorphology integrates.
        // Living mats blunt coastal remobilization (C-009 / thesis payoff #2).
        const coast = kCoast * exposure[i]! * cFactor;
        const erode = hillslopeErode + coast;

        const dh = prod - erode;
        let nextH = Math.min(5, Math.max(0, h + dh));
        let actualDh = nextH - h;
        const bed = bedrock[i]!;
        if (bed + nextH < zFloor) {
          nextH = Math.min(5, Math.max(0, zFloor - bed));
          actualDh = nextH - h;
        }

        if (actualDh !== 0) {
          const oldH = Math.max(h, minDepth);
          const newH = Math.max(nextH, minDepth);
          // Conserve column water; spill past porosity to surface (erosion).
          this.adjustMoistureForDepthChange(i, oldH, newH, nextH);
          depth[i]! = nextH;
          elev[i]! = bedrock[i]! + nextH;
          if (actualDh < 0 && erode > 0) {
            const removed = -actualDh;
            if (coast > 0) coastRemoved[i]! = removed * (coast / erode);
            if (hillslopeErode > 0) {
              hillslopeRemoved[i]! = removed * (hillslopeErode / erode);
            }
          }
          dirty = true;
        }
      }
    }

    // Slice 19: retained coastal mass → lee shore deposit; rest → ocean ledger.
    let mobile = 0;
    for (let i = 0; i < nCell; i++) {
      const c = coastRemoved[i]!;
      if (c <= 0) continue;
      mobile += c * retain;
      shoreOcean += c * (1 - retain);
    }

    if (mobile > 0) {
      const wind = { ux: this.windUx, uz: this.windUz };
      let weightSum = 0;
      const weights = new Float32Array(nCell);
      for (let i = 0; i < nCell; i++) {
        if (this.oceanCells.has(i)) continue;
        const w = leeDepositWeight(
          i,
          this.width,
          this.height,
          this.oceanCells,
          exposure,
          wind,
        );
        if (w <= 0) continue;
        weights[i]! = w;
        weightSum += w;
      }
      if (weightSum > 0) {
        for (let i = 0; i < nCell; i++) {
          const w = weights[i]!;
          if (w <= 0) continue;
          const add = (mobile * w) / weightSum;
          if (add <= 0) continue;
          const h = depth[i]!;
          const nextH = Math.min(5, h + add);
          const actual = nextH - h;
          if (actual <= 0) {
            shoreOcean += add;
            continue;
          }
          // Cap at soil.depth max — leftover of this cell's share → ocean.
          shoreOcean += add - actual;
          const oldH = Math.max(h, minDepth);
          const newH = Math.max(nextH, minDepth);
          this.adjustMoistureForDepthChange(i, oldH, newH, nextH);
          depth[i]! = nextH;
          elev[i]! = bedrock[i]! + nextH;
          dirty = true;
        }
      } else {
        shoreOcean += mobile;
      }
    }

    // Exner-lite: retained hillslope removals → basins / flats / local minima.
    let mobileHs = 0;
    for (let i = 0; i < nCell; i++) {
      const c = hillslopeRemoved[i]!;
      if (c <= 0) continue;
      mobileHs += c * retainHs;
      shoreOcean += c * (1 - retainHs);
    }

    if (mobileHs > 0) {
      let weightSum = 0;
      const weights = new Float32Array(nCell);
      const cellCount = this.width * this.height;
      for (let z = 0; z < this.height; z++) {
        for (let x = 0; x < this.width; x++) {
          const i = z * this.width + x;
          if (this.oceanCells.has(i)) continue;
          const a = acc ? acc[i]! : 0;
          const aNorm = Math.min(1, a / cellCount);
          const slope = neighborSlope(
            filled,
            this.width,
            this.height,
            x,
            z,
            dx,
          );
          const concentrated = a >= aMin && slope > 1e-4;
          const w = hillslopeDepositWeight({
            slope,
            depressionDepth: depression[i]!,
            aNorm,
            isLocalMin: isLocalMinimum(elev, this.width, this.height, x, z),
            concentratedFlow: concentrated,
          });
          if (w <= 0) continue;
          weights[i]! = w;
          weightSum += w;
        }
      }
      if (weightSum > 0) {
        for (let i = 0; i < nCell; i++) {
          const w = weights[i]!;
          if (w <= 0) continue;
          const add = (mobileHs * w) / weightSum;
          if (add <= 0) continue;
          const h = depth[i]!;
          const nextH = Math.min(5, h + add);
          const actual = nextH - h;
          if (actual <= 0) {
            shoreOcean += add;
            continue;
          }
          shoreOcean += add - actual;
          const oldH = Math.max(h, minDepth);
          const newH = Math.max(nextH, minDepth);
          this.adjustMoistureForDepthChange(i, oldH, newH, nextH);
          depth[i]! = nextH;
          elev[i]! = bedrock[i]! + nextH;
          dirty = true;
        }
      } else {
        shoreOcean += mobileHs;
      }
    }

    if (shoreOcean > 0) this.shoreErosionLedger += shoreOcean;
    if (dirty) this.markStructureDirty();
  }

  /** Daily vegetation. `dt` is sim-days (1 = one full daily band). */
  runVegetationStep(dt: number): void {
    const scale = Math.max(0, dt);
    const m = this.soilMoisture.data;
    const c = this.vegCover.data;
    const rough = this.surfaceRoughness.data;
    const infilContrib = this.vegInfiltrationContribution.data;
    const insolation = this.insolation.data;
    const lai = this.leafAreaIndex.data;
    const understory = this.understoryLight.data;
    const elevation = this.terrain.data;
    const growth = config.vegGrowthRate * scale;
    const decay = config.vegDecayRate * scale;
    const thresh = config.vegMoistureThreshold;

    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const i = z * this.width + x;
        const incoming = terrainInsolation(
          elevation,
          this.width,
          this.height,
          x,
          z,
        );
        const light = evaluateLight(incoming, c[i]!);
        const moisture = m[i]!;
        let cover = c[i]!;
        if (moisture > thresh) {
          cover += growth * moisture * light.understoryLight * (1 - cover);
        } else {
          cover -= decay * (1 - moisture / Math.max(thresh, 1e-6));
        }
        cover = Math.min(1, Math.max(0, cover));
        c[i] = cover;
        const committedLight = evaluateLight(incoming, cover);
        insolation[i] = committedLight.insolation;
        lai[i] = committedLight.leafAreaIndex;
        understory[i] = committedLight.understoryLight;
        // Slice 13 / N4 / N5 / N9 / N10 / N11: guild stack → physical writes only (E-005).
        // physicalCover is local — never dual-writes veg.cover.
        const physical = physicalCoverFrom(
          cover,
          this.herbBiomass.data[i]!,
          config.herbBiomassMax,
          this.strandBiomass.data[i]!,
          config.strandBiomassMax,
          this.binderBiomass.data[i]!,
          config.binderBiomassMax,
          this.marshBiomass.data[i]!,
          config.marshBiomassMax,
          this.shrubBiomass.data[i]!,
          config.shrubBiomassMax,
          this.crustBiomass.data[i]!,
          config.crustBiomassMax,
        );
        rough[i] = config.baseRoughness + physical * config.vegRoughnessBonus;
        infilContrib[i] = physical * config.vegInfiltrationBonus;
      }
    }
  }

  /**
   * Annual seed bank (Slice 12 / C-007; Slice 21 / C-019; N4 / C-018; N5 / C-009; N9 / C-016; N10; N11).
   * Mainland: fixed preserve-perimeter source.
   * Island (seaLevel set): overseas shore-biased kernel × S_elig(A,d).
   * One seed schedule fills herb + strand + binder + marsh + shrub + crust banks; establishment uses guild HSI.
   */
  runDispersalStep(_dt: number): void {
    const herbSeed = this.herbSeedBank.data;
    const herbEst = this.herbEstablishment.data;
    const strandSeed = this.strandSeedBank.data;
    const strandEst = this.strandEstablishment.data;
    const binderSeed = this.binderSeedBank.data;
    const binderEst = this.binderEstablishment.data;
    const marshSeed = this.marshSeedBank.data;
    const marshEst = this.marshEstablishment.data;
    const shrubSeed = this.shrubSeedBank.data;
    const shrubEst = this.shrubEstablishment.data;
    const crustSeed = this.crustSeedBank.data;
    const crustEst = this.crustEstablishment.data;
    const herbHsi = this.habitatSuitability.data;
    const herbBio = this.herbBiomass.data;
    const strandBio = this.strandBiomass.data;
    const binderBio = this.binderBiomass.data;
    const marshBio = this.marshBiomass.data;
    const shrubBio = this.shrubBiomass.data;
    const exposure = this.shoreExposure.data;
    const salt = this.soilSalinity.data;
    const moisture = this.soilMoisture.data;
    const mat = this.soilMaterial.data;
    const longshore = this.shoreLongshore.data;
    const elev = this.terrain.data;
    const herbScale = config.herbEstablishmentScale;
    const strandScale = config.strandEstablishmentScale;
    const binderScale = config.binderEstablishmentScale;
    const marshScale = config.marshEstablishmentScale;
    const shrubScale = config.shrubEstablishmentScale;
    const crustScale = config.crustEstablishmentScale;
    const airTempC = this.airTemperature;
    const hasTide =
      this.seaLevelMeters !== undefined && this.tidalAmplitudeMeters > 0;
    const mlw = hasTide
      ? meanLowWater(this.seaLevelMeters!, this.tidalAmplitudeMeters)
      : undefined;
    const mhw = hasTide
      ? meanHighWater(this.seaLevelMeters!, this.tidalAmplitudeMeters)
      : undefined;

    const writeCell = (i: number, pressure: number) => {
      herbSeed[i] = pressure;
      herbEst[i] = establishmentProbability(pressure, herbHsi[i]!, herbScale);
      strandSeed[i] = pressure;
      const strand = evaluateStrandHsi({
        shoreExposure: exposure[i]!,
        salinity: salt[i]!,
        airTempC,
      });
      strandEst[i] = establishmentProbability(
        pressure,
        strand.hsi,
        strandScale,
      );
      binderSeed[i] = pressure;
      const porosity = substrateProps(mat[i]!).porosity;
      const binder = evaluateBinderHsi({
        moisture: moisture[i]!,
        porosity,
        shoreExposure: exposure[i]!,
        materialClassId: mat[i]!,
        longshoreTendency: longshore[i]!,
      });
      binderEst[i] = establishmentProbability(
        pressure,
        binder.hsi,
        binderScale,
      );
      marshSeed[i] = pressure;
      const marsh = evaluateMarshHsi({
        elevMeters: hasTide ? elev[i]! : undefined,
        mlwMeters: mlw,
        mhwMeters: mhw,
        salinity: salt[i]!,
        airTempC,
      });
      marshEst[i] = establishmentProbability(pressure, marsh.hsi, marshScale);
      shrubSeed[i] = pressure;
      const shrub = evaluateShrubHsi({
        airTempC,
        herbBiomass: herbBio[i]!,
        moisture: moisture[i]!,
        porosity,
        salinity: salt[i]!,
        elevMeters: hasTide ? elev[i]! : undefined,
        mlwMeters: mlw,
        mhwMeters: mhw,
      });
      shrubEst[i] = establishmentProbability(pressure, shrub.hsi, shrubScale);
      crustSeed[i] = pressure;
      const crust = evaluateCrustHsi({
        moisture: moisture[i]!,
        porosity,
        herbBiomass: herbBio[i]!,
        strandBiomass: strandBio[i]!,
        binderBiomass: binderBio[i]!,
        marshBiomass: marshBio[i]!,
        shrubBiomass: shrubBio[i]!,
        salinity: salt[i]!,
        elevMeters: hasTide ? elev[i]! : undefined,
        mlwMeters: mlw,
        mhwMeters: mhw,
      });
      crustEst[i] = establishmentProbability(pressure, crust.hsi, crustScale);
    };

    if (this.seaLevelMeters === undefined) {
      const strength = config.seedSourceStrength;
      const mean = config.seedMeanDistanceCells;
      for (let z = 0; z < this.height; z++) {
        for (let x = 0; x < this.width; x++) {
          const i = z * this.width + x;
          writeCell(
            i,
            seedPressureAt(x, z, this.width, this.height, strength, mean),
          );
        }
      }
      return;
    }

    const ocean = this.oceanCells;
    const shore = computeShorelineCells(this.width, this.height, ocean);
    const dist = shoreDistanceField(this.width, this.height, ocean, shore);
    const strength = config.overseasSeedBase * this.eligibleRichness();
    const mean = config.overseasMeanDistanceCells;

    for (let i = 0; i < herbSeed.length; i++) {
      if (ocean.has(i)) {
        herbSeed[i] = 0;
        herbEst[i] = 0;
        strandSeed[i] = 0;
        strandEst[i] = 0;
        binderSeed[i] = 0;
        binderEst[i] = 0;
        marshSeed[i] = 0;
        marshEst[i] = 0;
        shrubSeed[i] = 0;
        shrubEst[i] = 0;
        crustSeed[i] = 0;
        crustEst[i] = 0;
        continue;
      }
      writeCell(i, overseasSeedPressure(dist[i]!, strength, mean));
    }
  }

  /**
   * Seasonal guild establishment — herb + strand + binder + marsh + shrub + crust (Slice N11).
   * Zero guild HSI blocks that guild. Does not write veg.cover
   * (physical contribution via physicalCover in runVegetationStep — Slice 13).
   */
  runHerbEstablishmentStep(dt: number): void {
    // Season pressure (C-021) scales how strongly this tick pushes every
    // guild's establishment — a day-length / growing-season referent
    // distinct from Heat's temperature gate (C-011).
    const scale = Math.max(0, dt) * this.seasonPressureMultiplier;
    const herbSeed = this.herbSeedBank.data;
    const herbHsi = this.habitatSuitability.data;
    const herbBiomass = this.herbBiomass.data;
    const strandSeed = this.strandSeedBank.data;
    const strandBiomass = this.strandBiomass.data;
    const binderSeed = this.binderSeedBank.data;
    const binderBiomass = this.binderBiomass.data;
    const marshSeed = this.marshSeedBank.data;
    const marshBiomass = this.marshBiomass.data;
    const shrubSeed = this.shrubSeedBank.data;
    const shrubBiomass = this.shrubBiomass.data;
    const crustSeed = this.crustSeedBank.data;
    const crustBiomass = this.crustBiomass.data;
    const exposure = this.shoreExposure.data;
    const salt = this.soilSalinity.data;
    const moisture = this.soilMoisture.data;
    const mat = this.soilMaterial.data;
    const longshore = this.shoreLongshore.data;
    const elev = this.terrain.data;
    const airTempC = this.airTemperature;
    const herbEstScale = config.herbEstablishmentScale;
    const herbRate = config.herbEstablishmentRate;
    const herbMax = config.herbBiomassMax;
    const strandEstScale = config.strandEstablishmentScale;
    const strandRate = config.strandEstablishmentRate;
    const strandMax = config.strandBiomassMax;
    const binderEstScale = config.binderEstablishmentScale;
    const binderRate = config.binderEstablishmentRate;
    const binderMax = config.binderBiomassMax;
    const marshEstScale = config.marshEstablishmentScale;
    const marshRate = config.marshEstablishmentRate;
    const marshMax = config.marshBiomassMax;
    const shrubEstScale = config.shrubEstablishmentScale;
    const shrubRate = config.shrubEstablishmentRate;
    const shrubMax = config.shrubBiomassMax;
    const crustEstScale = config.crustEstablishmentScale;
    const crustRate = config.crustEstablishmentRate;
    const crustMax = config.crustBiomassMax;
    const hasTide =
      this.seaLevelMeters !== undefined && this.tidalAmplitudeMeters > 0;
    const mlw = hasTide
      ? meanLowWater(this.seaLevelMeters!, this.tidalAmplitudeMeters)
      : undefined;
    const mhw = hasTide
      ? meanHighWater(this.seaLevelMeters!, this.tidalAmplitudeMeters)
      : undefined;

    for (let i = 0; i < herbBiomass.length; i++) {
      herbBiomass[i] = nextHerbBiomass({
        biomass: herbBiomass[i]!,
        seedBank: herbSeed[i]!,
        habitatSuitability: herbHsi[i]!,
        establishmentScale: herbEstScale,
        establishmentRate: herbRate,
        biomassMax: herbMax,
        dt: scale,
      });
      const strandHsi = evaluateStrandHsi({
        shoreExposure: exposure[i]!,
        salinity: salt[i]!,
        airTempC,
      }).hsi;
      strandBiomass[i] = nextHerbBiomass({
        biomass: strandBiomass[i]!,
        seedBank: strandSeed[i]!,
        habitatSuitability: strandHsi,
        establishmentScale: strandEstScale,
        establishmentRate: strandRate,
        biomassMax: strandMax,
        dt: scale,
      });
      const binderHsi = evaluateBinderHsi({
        moisture: moisture[i]!,
        porosity: substrateProps(mat[i]!).porosity,
        shoreExposure: exposure[i]!,
        materialClassId: mat[i]!,
        longshoreTendency: longshore[i]!,
      }).hsi;
      binderBiomass[i] = nextHerbBiomass({
        biomass: binderBiomass[i]!,
        seedBank: binderSeed[i]!,
        habitatSuitability: binderHsi,
        establishmentScale: binderEstScale,
        establishmentRate: binderRate,
        biomassMax: binderMax,
        dt: scale,
      });
      const marshHsi = evaluateMarshHsi({
        elevMeters: hasTide ? elev[i]! : undefined,
        mlwMeters: mlw,
        mhwMeters: mhw,
        salinity: salt[i]!,
        airTempC,
      }).hsi;
      marshBiomass[i] = nextHerbBiomass({
        biomass: marshBiomass[i]!,
        seedBank: marshSeed[i]!,
        habitatSuitability: marshHsi,
        establishmentScale: marshEstScale,
        establishmentRate: marshRate,
        biomassMax: marshMax,
        dt: scale,
      });
      const shrubHsi = evaluateShrubHsi({
        airTempC,
        herbBiomass: herbBiomass[i]!,
        moisture: moisture[i]!,
        porosity: substrateProps(mat[i]!).porosity,
        salinity: salt[i]!,
        elevMeters: hasTide ? elev[i]! : undefined,
        mlwMeters: mlw,
        mhwMeters: mhw,
      }).hsi;
      shrubBiomass[i] = nextHerbBiomass({
        biomass: shrubBiomass[i]!,
        seedBank: shrubSeed[i]!,
        habitatSuitability: shrubHsi,
        establishmentScale: shrubEstScale,
        establishmentRate: shrubRate,
        biomassMax: shrubMax,
        dt: scale,
      });
      const crustHsi = evaluateCrustHsi({
        moisture: moisture[i]!,
        porosity: substrateProps(mat[i]!).porosity,
        herbBiomass: herbBiomass[i]!,
        strandBiomass: strandBiomass[i]!,
        binderBiomass: binderBiomass[i]!,
        marshBiomass: marshBiomass[i]!,
        shrubBiomass: shrubBiomass[i]!,
        salinity: salt[i]!,
        elevMeters: hasTide ? elev[i]! : undefined,
        mlwMeters: mlw,
        mhwMeters: mhw,
      }).hsi;
      crustBiomass[i] = nextHerbBiomass({
        biomass: crustBiomass[i]!,
        seedBank: crustSeed[i]!,
        habitatSuitability: crustHsi,
        establishmentScale: crustEstScale,
        establishmentRate: crustRate,
        biomassMax: crustMax,
        dt: scale,
      });
    }
  }

  /**
   * Olson litter model (NATURAL_PROCESS_MATH §3.5): dL/dt = I − k·L.
   * Input I proportional to veg.cover; runs on decadal band.
   * `dt` is band units (1 = one full compressed decadal commit).
   */
  runFuelAccumulationStep(dt: number): void {
    const scale = Math.max(0, dt);
    const fuel = this.fuelLoad.data;
    const cover = this.vegCover.data;
    const iMax = config.fuelInputMax * scale;
    const k = Math.min(1, config.fuelDecayK * scale);
    const maxFuel = config.fuelLoadMax;

    for (let i = 0; i < fuel.length; i++) {
      const input = cover[i]! * iMax;
      const decay = k * fuel[i]!;
      fuel[i] = Math.min(maxFuel, Math.max(0, fuel[i]! + input - decay));
    }
  }

  /**
   * BFS fire spread from burning cells (NATURAL_PROCESS_MATH §3.5).
   * Deterministic: sorted queue by index for fixed iteration order (T-001).
   * Gated on fuel load, fuel moisture (from soil.moisture), and slope factor.
   */
  runFireStep(_dt: number): void {
    const burning = this.fireBurning.data;
    const fuel = this.fuelLoad.data;
    const moisture = this.soilMoisture.data;
    const cover = this.vegCover.data;
    const intensity = this.fireIntensity.data;
    const elev = this.terrain.data;
    const w = this.width;
    const h = this.height;
    const threshold = config.fuelSpreadThreshold;
    const extinction = config.fuelMoistureExtinction;
    const slopeA = config.fireSlopeFactorA;
    const consumption = config.fireFuelConsumption;
    const mortality = config.fireVegMortality;
    const dx = config.cellSizeMeters;

    // Collect currently-burning cells as ignition sources (sorted for determinism).
    const sources: number[] = [];
    for (let i = 0; i < burning.length; i++) {
      if (burning[i]! > 0.5) sources.push(i);
    }
    if (sources.length === 0) return;

    // BFS spread — each burning cell attempts to ignite 4-neighbors once.
    const visited = new Uint8Array(w * h);
    const queue: number[] = [];
    for (const s of sources) {
      visited[s] = 1;
      queue.push(s);
    }

    let head = 0;
    while (head < queue.length) {
      const ci = queue[head++]!;
      const cx = ci % w;
      const cz = (ci - cx) / w;
      const cElev = elev[ci]!;

      const neighbors = [
        cz > 0 ? ci - w : -1,
        cz + 1 < h ? ci + w : -1,
        cx > 0 ? ci - 1 : -1,
        cx + 1 < w ? ci + 1 : -1,
      ];

      for (const ni of neighbors) {
        if (ni < 0 || visited[ni]!) continue;
        visited[ni] = 1;

        if (fuel[ni]! < threshold) continue;
        if (moisture[ni]! >= extinction) continue;

        // Slope factor: fire runs uphill.
        const nElev = elev[ni]!;
        const dz = nElev - cElev;
        const tanPhi = dz / dx;
        const slopeFactor = Math.exp(slopeA * tanPhi);

        // Spread probability proportional to fuel availability and slope.
        const fuelFraction = Math.min(1, fuel[ni]! / (threshold * 3));
        const moistureFactor = 1 - moisture[ni]! / extinction;
        const spreadStrength = fuelFraction * moistureFactor * slopeFactor;

        if (spreadStrength > 0.15) {
          burning[ni] = 1;
          queue.push(ni);
        }
      }
    }

    // Post-fire effects: consume fuel, kill vegetation, record intensity.
    for (let i = 0; i < burning.length; i++) {
      if (burning[i]! < 0.5) {
        intensity[i] = 0;
        continue;
      }
      const consumed = fuel[i]! * consumption;
      intensity[i] = Math.min(10, consumed);
      fuel[i] = Math.max(0, fuel[i]! - consumed);
      cover[i] = Math.max(0, cover[i]! * (1 - mortality));
      // Persistent scar for presentation — decays on daily band.
      this.fireScar.data[i] = Math.min(
        1,
        Math.max(this.fireScar.data[i]!, Math.min(1, consumed / 2)),
      );
      this.fuelConsumedLedger += consumed;
      // Clear the burn flag after effects applied.
      burning[i] = 0;
    }
  }

  /** Daily exponential fade of burn scar (presentation + recovery memory). */
  decayFireScar(dt: number): void {
    const scale = Math.max(0, dt);
    const decay = Math.min(1, 0.08 * scale);
    const scar = this.fireScar.data;
    for (let i = 0; i < scar.length; i++) {
      scar[i] = Math.max(0, scar[i]! * (1 - decay));
      if (scar[i]! < 1e-4) scar[i] = 0;
    }
  }

  /**
   * Authored ignition — player sites a burn point (C-003 / A-002 / A-006).
   * Marks cells within brush radius as burning; spread runs on next event step.
   */
  igniteCell(cx: number, cz: number): void {
    const r = config.sitingBrushRadius;
    for (let z = cz - r; z <= cz + r; z++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (!this.fireBurning.inBounds(x, z)) continue;
        const dist = Math.hypot(x - cx, z - cz);
        if (dist > r + 0.01) continue;
        const i = z * this.width + x;
        if (this.fuelLoad.data[i]! >= config.fuelSpreadThreshold) {
          this.fireBurning.data[i] = 1;
        }
      }
    }
  }

  addRain(amountPerCell: number): void {
    if (amountPerCell === 0) return;
    const data = this.water.data;
    let added = 0;
    const ocean = this.oceanCells;
    for (let i = 0; i < data.length; i++) {
      if (ocean.has(i)) {
        // Rain on ocean goes straight to exchange (not a terrestrial store).
        this.oceanExchangeLedger += amountPerCell;
        added += amountPerCell;
        continue;
      }
      data[i]! += amountPerCell;
      added += amountPerCell;
    }
    this.precipitationLedger += added;
  }

  /**
   * Per-cell rain depths (Slice F orographic / C-020 lite). Length must match
   * the grid. Ocean cells contribute to oceanExchange; no cell targeting API —
   * depths are derived from global wind × terrain (C-004).
   */
  addRainField(depths: Float32Array): void {
    if (depths.length !== this.water.data.length) {
      throw new Error("addRainField: depth buffer length mismatch");
    }
    const data = this.water.data;
    let added = 0;
    const ocean = this.oceanCells;
    for (let i = 0; i < data.length; i++) {
      const d = depths[i]!;
      if (d === 0) continue;
      if (ocean.has(i)) {
        this.oceanExchangeLedger += d;
        added += d;
        continue;
      }
      data[i]! += d;
      added += d;
    }
    this.precipitationLedger += added;
  }

  /**
   * Keep soil-column water mass when depth changes. Volumetric moisture is
   * storage/depth; thinning (dig / erosion) can push fraction above porosity —
   * spill the excess to surface so bounds stay honest and mass closes.
   */
  private adjustMoistureForDepthChange(
    i: number,
    oldH: number,
    newH: number,
    nextDepth: number,
  ): void {
    const moisture = this.soilMoisture.data;
    const water = this.water.data;
    const porosity = substrateProps(this.soilMaterial.data[i]!).porosity;
    const storage = moisture[i]! * oldH;
    if (nextDepth <= 0) {
      water[i]! += storage;
      moisture[i]! = 0;
      return;
    }
    const capacity = porosity * newH;
    if (storage > capacity) {
      water[i]! += storage - capacity;
      moisture[i]! = porosity;
    } else {
      moisture[i]! = storage / newH;
    }
  }

  resetWater(): void {
    this.water.fill(0);
    this.soilMoisture.fill(0);
    this.groundwaterStorage.fill(0);
    this.precipitationLedger = 0;
    this.boundaryOutflowLedger = 0;
    this.oceanExchangeLedger = 0;
    this.shoreErosionLedger = 0;
    this.infiltrationLedger = 0;
    this.etLedger = 0;
    this.transpirationLedger = 0;
    this.soilEvaporationLedger = 0;
    this.openWaterEvaporationLedger = 0;
    this.cloudWaterBox.value = 0;
    this.precipPhaseBox.value = PRECIP_PHASE_RAIN;
    this.eventStepsSinceDaily = 0;
    this.daysSinceDecadal = 0;
    this.simMinutes = 0;
  }

  /** Cell area in m² (Δx²). */
  cellAreaMeters2(): number {
    const dx = config.cellSizeMeters;
    return dx * dx;
  }

  /** Soil water storage depth (m) = moisture · soil.depth. */
  soilStorageDepth(i: number): number {
    return this.soilMoisture.data[i]! * this.soilDepth.data[i]!;
  }

  /** Sum of groundwater storage depths (m · cell) — C-001 compartment. */
  groundwaterStorageSum(): number {
    let sum = 0;
    for (let i = 0; i < this.groundwaterStorage.data.length; i++) {
      sum += this.groundwaterStorage.data[i]!;
    }
    return sum;
  }

  waterBalanceResidual(): number {
    let surface = 0;
    let soil = 0;
    let gw = 0;
    for (let i = 0; i < this.water.data.length; i++) {
      surface += this.water.data[i]!;
      soil += this.soilStorageDepth(i);
      gw += this.groundwaterStorage.data[i]!;
    }
    const accounted =
      surface +
      soil +
      gw +
      this.etLedger +
      this.boundaryOutflowLedger +
      this.oceanExchangeLedger;
    return this.precipitationLedger - accounted;
  }

  /** Count of ocean cells under current sea level (0 if unset). */
  oceanCellCount(): number {
    return this.oceanCells.size;
  }

  /** Land cell count (total − ocean). Full grid when sea level absent. */
  landCellCount(): number {
    return this.width * this.height - this.oceanCells.size;
  }

  /**
   * Eligible richness multiplier S_elig = f(A, d) when sea level is set (C-019).
   * Mainland worlds return 1 (perimeter rain is not scaled by biogeography).
   */
  eligibleRichness(): number {
    if (this.seaLevelMeters === undefined) return 1;
    return eligibleRichness({
      landCells: this.landCellCount(),
      isolationCells: this.isolationCells,
      areaRefCells: config.eligibleAreaRefCells,
      isolationMeanCells: config.eligibleIsolationMeanCells,
      sMin: config.eligibleRichnessMin,
      sMax: config.eligibleRichnessMax,
    });
  }

  /** Land cells adjacent to ocean — shoreline length proxy (C-015 / C-012). */
  shorelineCellCount(): number {
    if (this.oceanCells.size === 0) return 0;
    return computeShorelineCells(this.width, this.height, this.oceanCells).size;
  }

  /** Intertidal cell count under current MHW/MLW envelope (C-016). */
  intertidalCellCount(): number {
    return countIntertidal(this.intertidal.data);
  }

  /** True when cell is in the intertidal band (land foreshore or submerged). */
  isIntertidal(x: number, z: number): boolean {
    if (!this.intertidal.inBounds(x, z)) return false;
    return this.intertidal.get(x, z) > 0;
  }

  /**
   * Land foreshore under the envelope (sea ≤ elev < MHW) — default-view tint band.
   */
  isForeshore(x: number, z: number): boolean {
    if (this.seaLevelMeters === undefined || this.tidalAmplitudeMeters <= 0) {
      return false;
    }
    if (!this.terrain.inBounds(x, z)) return false;
    const elev = this.terrain.get(x, z);
    const sea = this.seaLevelMeters;
    const mhw = meanHighWater(sea, this.tidalAmplitudeMeters);
    return elev >= sea && elev < mhw;
  }

  getSoilMoisture(x: number, z: number): number {
    if (!this.soilMoisture.inBounds(x, z)) return 0;
    return this.soilMoisture.get(x, z);
  }

  getSoilMaterial(x: number, z: number): number {
    return this.soilMaterial.get(x, z);
  }

  getSoilSalinity(x: number, z: number): number {
    if (!this.soilSalinity.inBounds(x, z)) return 0;
    return this.soilSalinity.get(x, z);
  }

  getGroundwater(x: number, z: number): number {
    if (!this.groundwaterStorage.inBounds(x, z)) return 0;
    return this.groundwaterStorage.get(x, z);
  }

  getHabitatSuitability(x: number, z: number): number {
    if (!this.habitatSuitability.inBounds(x, z)) return 0;
    return this.habitatSuitability.get(x, z);
  }

  getLimitingFactor(x: number, z: number): number {
    if (!this.habitatLimitingFactor.inBounds(x, z)) return 0;
    return this.habitatLimitingFactor.get(x, z);
  }

  getSoilDepth(x: number, z: number): number {
    if (!this.soilDepth.inBounds(x, z)) return 0;
    return this.soilDepth.get(x, z);
  }

  /** Bedrock elev = terrain − soil.depth (derived; not stored). */
  getBedrockElevation(x: number, z: number): number {
    if (!this.terrain.inBounds(x, z)) return 0;
    return this.terrain.get(x, z) - this.soilDepth.get(x, z);
  }

  getVegCover(x: number, z: number): number {
    if (!this.vegCover.inBounds(x, z)) return 0;
    return this.vegCover.get(x, z);
  }

  getUnderstoryLight(x: number, z: number): number {
    if (!this.understoryLight.inBounds(x, z)) return 0;
    return this.understoryLight.get(x, z);
  }

  getPotentialEt(x: number, z: number): number {
    if (!this.potentialEt.inBounds(x, z)) return 0;
    return this.potentialEt.get(x, z);
  }

  getActualEt(x: number, z: number): number {
    if (!this.actualEt.inBounds(x, z)) return 0;
    return this.actualEt.get(x, z);
  }

  getFireScar(x: number, z: number): number {
    if (!this.fireScar.inBounds(x, z)) return 0;
    return this.fireScar.get(x, z);
  }

  getHerbBiomass(x: number, z: number): number {
    if (!this.herbBiomass.inBounds(x, z)) return 0;
    return this.herbBiomass.get(x, z);
  }

  getHerbSeedBank(x: number, z: number): number {
    if (!this.herbSeedBank.inBounds(x, z)) return 0;
    return this.herbSeedBank.get(x, z);
  }

  getHerbEstablishment(x: number, z: number): number {
    if (!this.herbEstablishment.inBounds(x, z)) return 0;
    return this.herbEstablishment.get(x, z);
  }

  getStrandBiomass(x: number, z: number): number {
    if (!this.strandBiomass.inBounds(x, z)) return 0;
    return this.strandBiomass.get(x, z);
  }

  getStrandSeedBank(x: number, z: number): number {
    if (!this.strandSeedBank.inBounds(x, z)) return 0;
    return this.strandSeedBank.get(x, z);
  }

  getStrandEstablishment(x: number, z: number): number {
    if (!this.strandEstablishment.inBounds(x, z)) return 0;
    return this.strandEstablishment.get(x, z);
  }

  getBinderBiomass(x: number, z: number): number {
    if (!this.binderBiomass.inBounds(x, z)) return 0;
    return this.binderBiomass.get(x, z);
  }

  getBinderSeedBank(x: number, z: number): number {
    if (!this.binderSeedBank.inBounds(x, z)) return 0;
    return this.binderSeedBank.get(x, z);
  }

  getBinderEstablishment(x: number, z: number): number {
    if (!this.binderEstablishment.inBounds(x, z)) return 0;
    return this.binderEstablishment.get(x, z);
  }

  getMarshBiomass(x: number, z: number): number {
    if (!this.marshBiomass.inBounds(x, z)) return 0;
    return this.marshBiomass.get(x, z);
  }

  getMarshSeedBank(x: number, z: number): number {
    if (!this.marshSeedBank.inBounds(x, z)) return 0;
    return this.marshSeedBank.get(x, z);
  }

  getMarshEstablishment(x: number, z: number): number {
    if (!this.marshEstablishment.inBounds(x, z)) return 0;
    return this.marshEstablishment.get(x, z);
  }

  getShrubBiomass(x: number, z: number): number {
    if (!this.shrubBiomass.inBounds(x, z)) return 0;
    return this.shrubBiomass.get(x, z);
  }

  getShrubSeedBank(x: number, z: number): number {
    if (!this.shrubSeedBank.inBounds(x, z)) return 0;
    return this.shrubSeedBank.get(x, z);
  }

  getShrubEstablishment(x: number, z: number): number {
    if (!this.shrubEstablishment.inBounds(x, z)) return 0;
    return this.shrubEstablishment.get(x, z);
  }

  getCrustBiomass(x: number, z: number): number {
    if (!this.crustBiomass.inBounds(x, z)) return 0;
    return this.crustBiomass.get(x, z);
  }

  getCrustSeedBank(x: number, z: number): number {
    if (!this.crustSeedBank.inBounds(x, z)) return 0;
    return this.crustSeedBank.get(x, z);
  }

  getCrustEstablishment(x: number, z: number): number {
    if (!this.crustEstablishment.inBounds(x, z)) return 0;
    return this.crustEstablishment.get(x, z);
  }

  raiseBerm(cx: number, cz: number, amount: number = config.bermRaise): void {
    this.applyTerrainBrush(cx, cz, amount);
  }

  digChannel(cx: number, cz: number, amount: number = config.digLower): void {
    this.applyTerrainBrush(cx, cz, -amount);
  }

  /**
   * Geological deposit (C-009): raise elev+depth like berm and stamp material
   * only where mass actually lands (dh ≠ 0). Berm/dig stay material-agnostic.
   */
  depositSubstrate(
    cx: number,
    cz: number,
    materialId: number,
    amount: number = config.bermRaise,
  ): void {
    this.applyTerrainBrush(cx, cz, amount, materialId);
  }

  private applyTerrainBrush(
    cx: number,
    cz: number,
    delta: number,
    stampMaterial?: number,
  ): void {
    // Berm/dig move mobile soil with the surface so bedrock = elev − depth
    // stays put (THESIS §2.1, snowflow steal / C-002 · GEO-002). Tier-M:
    // per-cell Δelev === Δdepth when clamps do not bind.
    const r = config.sitingBrushRadius;
    const zFloor = config.elevationFloor;
    const minDepth = 1e-3;
    for (let z = cz - r; z <= cz + r; z++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (!this.terrain.inBounds(x, z)) continue;
        const dist = Math.hypot(x - cx, z - cz);
        if (dist > r + 0.01) continue;
        const falloff = 1 - dist / (r + 1);
        const i = z * this.width + x;
        const elev0 = this.terrain.data[i]!;
        const depth0 = this.soilDepth.data[i]!;
        let dh = delta * falloff;

        let nextDepth = depth0 + dh;
        let nextElev = elev0 + dh;
        if (nextDepth < 0) {
          dh = -depth0;
          nextDepth = 0;
          nextElev = elev0 + dh;
        }
        if (nextDepth > 5) {
          dh = 5 - depth0;
          nextDepth = 5;
          nextElev = elev0 + dh;
        }
        if (nextElev < zFloor) {
          dh = zFloor - elev0;
          nextElev = zFloor;
          nextDepth = depth0 + dh;
          if (nextDepth < 0) {
            nextDepth = 0;
            dh = -depth0;
            nextElev = elev0 + dh;
          }
          if (nextDepth > 5) {
            nextDepth = 5;
            dh = 5 - depth0;
            nextElev = elev0 + dh;
          }
        }

        if (dh === 0) continue;

        const oldH = Math.max(depth0, minDepth);
        const newH = Math.max(nextDepth, minDepth);
        // Conserve column water; spill past porosity to surface (dig/berm).
        this.adjustMoistureForDepthChange(i, oldH, newH, nextDepth);
        this.soilDepth.data[i]! = nextDepth;
        this.terrain.data[i]! = nextElev;
        if (stampMaterial !== undefined) {
          this.soilMaterial.data[i]! = stampMaterial;
        }
      }
    }
    this.markStructureDirty();
  }

  stateHash(): string {
    return this.registry.hashState();
  }

  private registerFields(): void {
    const fields = [
      {
        id: "terrain.elevation",
        units: "m",
        shape: "cell" as const,
        owner: "geomorphology",
        band: "decadal" as const,
        legacy: true,
        data: this.terrain.data,
        range: [-500, 9000] as const,
      },
      {
        id: "water.surfaceDepth",
        units: "m",
        shape: "cell" as const,
        owner: "surfaceWater",
        band: "event" as const,
        legacy: false,
        data: this.water.data,
        range: [0, 50] as const,
      },
      {
        id: "soil.moisture",
        units: "m³/m³",
        shape: "cell" as const,
        owner: "soilWater",
        band: "daily" as const,
        legacy: false,
        data: this.soilMoisture.data,
        range: [0, MAX_SUBSTRATE_POROSITY] as const,
      },
      {
        id: "soil.salinity",
        units: "fraction",
        shape: "cell" as const,
        owner: "soilWater",
        band: "daily" as const,
        // T-003 / C-018: porewater salt memory — not reconstructible from rain alone.
        legacy: true,
        data: this.soilSalinity.data,
        range: [0, 1] as const,
      },
      {
        id: "soil.material",
        units: "class",
        shape: "cell" as const,
        owner: "geomorphology",
        band: "decadal" as const,
        // T-003 / C-009: substrate class — not reconstructible from rain alone.
        legacy: true,
        data: this.soilMaterial.data,
        range: [0, SUBSTRATE_ROCK] as const,
      },
      {
        id: "soil.depth",
        units: "m",
        shape: "cell" as const,
        owner: "geomorphology",
        band: "decadal" as const,
        // T-003: hysteresis / recovery memory — not reconstructible from rain alone.
        legacy: true,
        data: this.soilDepth.data,
        range: [0, 5] as const,
      },
      {
        id: "groundwater.storage",
        units: "m",
        shape: "cell" as const,
        owner: "groundwater",
        band: "daily" as const,
        // T-003: slow storage — not reconstructible from current forcing.
        legacy: true,
        data: this.groundwaterStorage.data,
        range: [0, 20] as const,
      },
      {
        id: "habitat.suitability",
        units: "fraction",
        shape: "cell" as const,
        owner: "habitat",
        band: "daily" as const,
        legacy: false,
        data: this.habitatSuitability.data,
        range: [0, 1] as const,
      },
      {
        id: "habitat.limitingFactor",
        units: "id",
        shape: "cell" as const,
        owner: "habitat",
        band: "daily" as const,
        legacy: false,
        data: this.habitatLimitingFactor.data,
        // Liebig arm ids through LIMITING_SPRAY (5) — C-004 temp + C-017 spray.
        range: [0, LIMITING_SPRAY] as const,
      },
      {
        id: "habitat.limitingGap",
        units: "fraction",
        shape: "cell" as const,
        owner: "habitat",
        band: "daily" as const,
        legacy: false,
        data: this.habitatLimitingGap.data,
        range: [0, 1] as const,
      },
      {
        id: "veg.cover",
        units: "fraction",
        shape: "cell" as const,
        owner: "vegetation",
        band: "daily" as const,
        legacy: false,
        data: this.vegCover.data,
        range: [0, 1] as const,
      },
      {
        id: "surface.roughness",
        units: "Manning n",
        shape: "cell" as const,
        owner: "vegetation",
        band: "daily" as const,
        legacy: false,
        data: this.surfaceRoughness.data,
        range: [0.01, 0.3] as const,
      },
      {
        id: "veg.infiltrationContribution",
        units: "m/step",
        shape: "cell" as const,
        owner: "vegetation",
        band: "daily" as const,
        legacy: false,
        data: this.vegInfiltrationContribution.data,
        range: [0, 1] as const,
      },
      {
        id: "light.insolation",
        units: "fraction",
        shape: "cell" as const,
        owner: "vegetation",
        band: "daily" as const,
        legacy: false,
        data: this.insolation.data,
        range: [0, 1] as const,
      },
      {
        id: "veg.leafAreaIndex",
        units: "m²/m²",
        shape: "cell" as const,
        owner: "vegetation",
        band: "daily" as const,
        legacy: false,
        data: this.leafAreaIndex.data,
        range: [0, config.vegMaxLeafAreaIndex] as const,
      },
      {
        id: "light.understory",
        units: "fraction",
        shape: "cell" as const,
        owner: "vegetation",
        band: "daily" as const,
        legacy: false,
        data: this.understoryLight.data,
        range: [0, 1] as const,
      },
      {
        id: "et.potential",
        units: "m",
        shape: "cell" as const,
        owner: "soilWater",
        band: "daily" as const,
        legacy: false,
        data: this.potentialEt.data,
        range: [0, 1] as const,
      },
      {
        id: "et.actual",
        units: "m",
        shape: "cell" as const,
        owner: "soilWater",
        band: "daily" as const,
        legacy: false,
        data: this.actualEt.data,
        range: [0, 1] as const,
      },
      {
        id: "soil.infiltrationCapacity",
        units: "m/step",
        shape: "cell" as const,
        owner: "soilWater",
        band: "daily" as const,
        legacy: true,
        data: this.infiltrationCapacity.data,
        range: [0, 1] as const,
      },
      {
        id: "fire.fuelLoad",
        units: "kg/m²",
        shape: "cell" as const,
        owner: "fuel",
        band: "decadal" as const,
        legacy: false,
        data: this.fuelLoad.data,
        range: [0, config.fuelLoadMax] as const,
      },
      {
        id: "fire.burning",
        units: "flag",
        shape: "cell" as const,
        owner: "fire",
        band: "event" as const,
        legacy: false,
        data: this.fireBurning.data,
        range: [0, 1] as const,
      },
      {
        id: "fire.intensity",
        units: "relative",
        shape: "cell" as const,
        owner: "fire",
        band: "event" as const,
        legacy: false,
        data: this.fireIntensity.data,
        range: [0, 10] as const,
      },
      {
        id: "fire.scar",
        units: "fraction",
        shape: "cell" as const,
        owner: "fire",
        band: "event" as const,
        legacy: true,
        data: this.fireScar.data,
        range: [0, 1] as const,
      },
      {
        id: "veg.seedBank.herb",
        units: "seeds/m²",
        shape: "cell" as const,
        owner: "dispersal",
        band: "annual" as const,
        // T-003: colonization memory — not reconstructible from current forcing.
        legacy: true,
        data: this.herbSeedBank.data,
        range: [0, 1e5] as const,
      },
      {
        id: "veg.establishment.herb",
        units: "fraction",
        shape: "cell" as const,
        owner: "dispersal",
        band: "annual" as const,
        legacy: false,
        data: this.herbEstablishment.data,
        range: [0, 1] as const,
      },
      {
        id: "veg.biomass.herb",
        units: "kg DM/m²",
        shape: "cell" as const,
        owner: "vegetation",
        band: "seasonal" as const,
        legacy: false,
        data: this.herbBiomass.data,
        range: [0, config.herbBiomassMax] as const,
      },
      {
        id: "veg.seedBank.strand",
        units: "seeds/m²",
        shape: "cell" as const,
        owner: "dispersal",
        band: "annual" as const,
        legacy: true,
        data: this.strandSeedBank.data,
        range: [0, 1e5] as const,
      },
      {
        id: "veg.establishment.strand",
        units: "fraction",
        shape: "cell" as const,
        owner: "dispersal",
        band: "annual" as const,
        legacy: false,
        data: this.strandEstablishment.data,
        range: [0, 1] as const,
      },
      {
        id: "veg.biomass.strand",
        units: "kg DM/m²",
        shape: "cell" as const,
        owner: "vegetation",
        band: "seasonal" as const,
        legacy: false,
        data: this.strandBiomass.data,
        range: [0, config.strandBiomassMax] as const,
      },
      {
        id: "veg.seedBank.binder",
        units: "seeds/m²",
        shape: "cell" as const,
        owner: "dispersal",
        band: "annual" as const,
        legacy: true,
        data: this.binderSeedBank.data,
        range: [0, 1e5] as const,
      },
      {
        id: "veg.establishment.binder",
        units: "fraction",
        shape: "cell" as const,
        owner: "dispersal",
        band: "annual" as const,
        legacy: false,
        data: this.binderEstablishment.data,
        range: [0, 1] as const,
      },
      {
        id: "veg.biomass.binder",
        units: "kg DM/m²",
        shape: "cell" as const,
        owner: "vegetation",
        band: "seasonal" as const,
        legacy: false,
        data: this.binderBiomass.data,
        range: [0, config.binderBiomassMax] as const,
      },
      {
        id: "veg.seedBank.marsh",
        units: "seeds/m²",
        shape: "cell" as const,
        owner: "dispersal",
        band: "annual" as const,
        legacy: true,
        data: this.marshSeedBank.data,
        range: [0, 1e5] as const,
      },
      {
        id: "veg.establishment.marsh",
        units: "fraction",
        shape: "cell" as const,
        owner: "dispersal",
        band: "annual" as const,
        legacy: false,
        data: this.marshEstablishment.data,
        range: [0, 1] as const,
      },
      {
        id: "veg.biomass.marsh",
        units: "kg DM/m²",
        shape: "cell" as const,
        owner: "vegetation",
        band: "seasonal" as const,
        legacy: false,
        data: this.marshBiomass.data,
        range: [0, config.marshBiomassMax] as const,
      },
      {
        id: "veg.seedBank.shrub",
        units: "seeds/m²",
        shape: "cell" as const,
        owner: "dispersal",
        band: "annual" as const,
        legacy: true,
        data: this.shrubSeedBank.data,
        range: [0, 1e5] as const,
      },
      {
        id: "veg.establishment.shrub",
        units: "fraction",
        shape: "cell" as const,
        owner: "dispersal",
        band: "annual" as const,
        legacy: false,
        data: this.shrubEstablishment.data,
        range: [0, 1] as const,
      },
      {
        id: "veg.biomass.shrub",
        units: "kg DM/m²",
        shape: "cell" as const,
        owner: "vegetation",
        band: "seasonal" as const,
        legacy: true,
        data: this.shrubBiomass.data,
        range: [0, config.shrubBiomassMax] as const,
      },
      {
        id: "veg.seedBank.crust",
        units: "seeds/m²",
        shape: "cell" as const,
        owner: "dispersal",
        band: "annual" as const,
        legacy: true,
        data: this.crustSeedBank.data,
        range: [0, 1e5] as const,
      },
      {
        id: "veg.establishment.crust",
        units: "fraction",
        shape: "cell" as const,
        owner: "dispersal",
        band: "annual" as const,
        legacy: false,
        data: this.crustEstablishment.data,
        range: [0, 1] as const,
      },
      {
        id: "veg.biomass.crust",
        units: "kg DM/m²",
        shape: "cell" as const,
        owner: "vegetation",
        band: "seasonal" as const,
        legacy: true,
        data: this.crustBiomass.data,
        range: [0, config.crustBiomassMax] as const,
      },
      {
        id: "ledger.fuelConsumed",
        units: "kg/m²",
        shape: "scalar" as const,
        owner: "fire",
        band: "event" as const,
        legacy: false,
        data: this.fuelConsumedBox,
        range: [0, 1e12] as const,
      },
      {
        id: "climate.cloudWater",
        units: "m",
        shape: "scalar" as const,
        owner: "climate",
        band: "event" as const,
        legacy: false,
        data: this.cloudWaterBox,
        range: [0, 50] as const,
      },
      {
        id: "climate.airTemperature",
        units: "°C",
        shape: "scalar" as const,
        owner: "climate",
        band: "event" as const,
        legacy: false,
        data: this.airTempBox,
        range: [-60, 60] as const,
      },
      {
        id: "climate.precipPhase",
        units: "enum",
        shape: "scalar" as const,
        owner: "climate",
        band: "event" as const,
        legacy: false,
        data: this.precipPhaseBox,
        range: [0, 2] as const,
      },
      {
        id: "ledger.precipitation",
        units: "m",
        shape: "scalar" as const,
        owner: "climate",
        band: "event" as const,
        legacy: true,
        data: this.precipBox,
        range: [0, 1e12] as const,
      },
      {
        id: "ledger.boundaryOutflow",
        units: "m",
        shape: "scalar" as const,
        owner: "surfaceWater",
        band: "event" as const,
        legacy: true,
        data: this.outflowBox,
        range: [0, 1e12] as const,
      },
      {
        id: "ledger.oceanExchange",
        units: "m",
        shape: "scalar" as const,
        owner: "surfaceWater",
        band: "event" as const,
        legacy: true,
        data: this.oceanExchangeBox,
        range: [0, 1e12] as const,
      },
      {
        id: "ledger.shoreErosion",
        units: "m",
        shape: "scalar" as const,
        owner: "geomorphology",
        band: "decadal" as const,
        legacy: false,
        data: this.shoreErosionBox,
        range: [0, 1e12] as const,
      },
      {
        id: "ledger.infiltration",
        units: "m",
        shape: "scalar" as const,
        owner: "soilWater",
        band: "daily" as const,
        legacy: true,
        data: this.infilBox,
        range: [0, 1e12] as const,
      },
      {
        id: "ledger.et",
        units: "m",
        shape: "scalar" as const,
        owner: "soilWater",
        band: "daily" as const,
        legacy: true,
        data: this.etBox,
        range: [0, 1e12] as const,
      },
      {
        id: "ledger.transpiration",
        units: "m",
        shape: "scalar" as const,
        owner: "soilWater",
        band: "daily" as const,
        legacy: true,
        data: this.transpirationBox,
        range: [0, 1e12] as const,
      },
      {
        id: "ledger.soilEvaporation",
        units: "m",
        shape: "scalar" as const,
        owner: "soilWater",
        band: "daily" as const,
        legacy: true,
        data: this.soilEvaporationBox,
        range: [0, 1e12] as const,
      },
      {
        id: "ledger.openWaterEvaporation",
        units: "m",
        shape: "scalar" as const,
        owner: "soilWater",
        band: "daily" as const,
        legacy: true,
        data: this.openWaterEvaporationBox,
        range: [0, 1e12] as const,
      },
      {
        id: "depression.depth",
        units: "m",
        shape: "cell" as const,
        owner: "flowStructure",
        band: "decadal" as const,
        legacy: false,
        data: this.depressionDepth.data,
        range: [0, 500] as const,
      },
      {
        id: "shore.intertidal",
        units: "fraction",
        shape: "cell" as const,
        owner: "flowStructure",
        band: "decadal" as const,
        legacy: false,
        data: this.intertidal.data,
        range: [0, 1] as const,
      },
      {
        id: "shore.exposure",
        units: "fraction",
        shape: "cell" as const,
        owner: "flowStructure",
        band: "decadal" as const,
        legacy: false,
        data: this.shoreExposure.data,
        range: [0, 1] as const,
      },
      {
        id: "shore.longshore",
        units: "signed",
        shape: "cell" as const,
        owner: "flowStructure",
        band: "decadal" as const,
        legacy: false,
        data: this.shoreLongshore.data,
        range: [-1, 1] as const,
      },
      {
        id: "clock.eventStepsSinceDaily",
        units: "steps",
        shape: "scalar" as const,
        owner: "world",
        band: "event" as const,
        legacy: true,
        data: this.bandPhaseBox,
        range: [0, config.dailyEventSteps] as const,
      },
      {
        id: "clock.daysSinceDecadal",
        units: "days",
        shape: "scalar" as const,
        owner: "world",
        band: "daily" as const,
        legacy: true,
        data: this.decadalPhaseBox,
        range: [0, config.decadalDailySteps] as const,
      },
      {
        id: "clock.daysSinceSeasonal",
        units: "days",
        shape: "scalar" as const,
        owner: "world",
        band: "daily" as const,
        legacy: true,
        data: this.seasonalPhaseBox,
        range: [0, config.seasonalDailySteps] as const,
      },
      {
        id: "clock.daysSinceAnnual",
        units: "days",
        shape: "scalar" as const,
        owner: "world",
        band: "daily" as const,
        legacy: true,
        data: this.annualPhaseBox,
        range: [0, config.annualDailySteps] as const,
      },
      {
        id: "clock.simMinutes",
        units: "sim-minutes",
        shape: "scalar" as const,
        owner: "world",
        band: "event" as const,
        legacy: false,
        data: this.simMinutesBox,
        range: [0, 1e15] as const,
      },
    ];
    for (const f of fields) this.registry.register(f);
  }
}

/** Max 4-neighbor slope (rise/run) on a heightfield. */
function neighborSlope(
  elev: Float32Array,
  width: number,
  height: number,
  x: number,
  z: number,
  dx: number,
): number {
  const i = z * width + x;
  const c = elev[i]!;
  let maxS = 0;
  if (x > 0) maxS = Math.max(maxS, Math.abs(c - elev[i - 1]!) / dx);
  if (x + 1 < width) maxS = Math.max(maxS, Math.abs(c - elev[i + 1]!) / dx);
  if (z > 0) maxS = Math.max(maxS, Math.abs(c - elev[i - width]!) / dx);
  if (z + 1 < height) maxS = Math.max(maxS, Math.abs(c - elev[i + width]!) / dx);
  return maxS;
}
