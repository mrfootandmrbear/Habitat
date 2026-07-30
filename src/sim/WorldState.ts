import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { FieldRegistry } from "./registry/FieldRegistry";
import type { ScalarBox } from "./registry/types";
import { SimScheduler } from "./process/scheduler";
import { surfaceWaterProcess } from "./process/surfaceWaterProcess";
import { soilWaterProcess } from "./process/soilWaterProcess";
import { vegetationProcess } from "./process/vegetationProcess";
import { geomorphologyProcess } from "./process/geomorphologyProcess";
import { groundwaterProcess } from "./process/groundwaterProcess";
import { habitatProcess } from "./process/habitatProcess";
import { fluxStep } from "./hydrology/fluxStep";
import { evaluateHsi } from "./habitat/hsiComposition";
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
  /** Limiting factor id: 0 moisture, 1 depth, 2 groundwater. */
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
   */
  outletCells: ReadonlySet<number> = new Set();
  private readonly closedBoundary: boolean;

  /** Single-source ledgers (registry ScalarBox). */
  private readonly precipBox: ScalarBox = { value: 0 };
  private readonly outflowBox: ScalarBox = { value: 0 };
  private readonly infilBox: ScalarBox = { value: 0 };
  private readonly etBox: ScalarBox = { value: 0 };
  /** Band phase — event steps since last daily (§12). */
  private readonly bandPhaseBox: ScalarBox = { value: 0 };
  /** Days since last decadal band (prototype ladder). */
  private readonly decadalPhaseBox: ScalarBox = { value: 0 };
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
       */
      closedBoundary?: boolean;
    },
  ) {
    this.width = terrain.width;
    this.height = terrain.height;
    this.terrain = terrain;
    this.water = new Grid2D(this.width, this.height);
    this.soilMoisture = new Grid2D(this.width, this.height);
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
    this.depressionDepth = new Grid2D(this.width, this.height);
    this.delta = new Float32Array(this.width * this.height);
    this.flowRate = options?.flowRate ?? config.flowRate;
    this.maxOutflowFraction =
      options?.maxOutflowFraction ?? config.maxOutflowFraction;
    const gwOn = options?.groundwaterEnabled !== false;
    this.gwRechargeRate = gwOn ? config.gwRechargeRate : 0;
    this.gwRecessionAlpha = gwOn ? config.gwRecessionAlpha : 0;
    this.gwFieldCapacityFraction = config.gwFieldCapacityFraction;
    this.gwChannelBoost = config.gwChannelBoost;
    this.closedBoundary = options?.closedBoundary === true;

    this.registry = new FieldRegistry();
    this.registerFields();

    this.hydrology = new HeightfieldHydrology(this);
    this.scheduler = new SimScheduler([
      surfaceWaterProcess,
      soilWaterProcess,
      groundwaterProcess,
      habitatProcess,
      vegetationProcess,
      geomorphologyProcess,
    ]);

    this.recomputeFlowStructure();
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

  get simMinutes(): number {
    return this.simMinutesBox.value;
  }
  private set simMinutes(v: number) {
    this.simMinutesBox.value = v;
  }

  /**
   * Advance one event band tick (config.eventDtMinutes sim-minutes).
   * `dt` is the flux integrator step within the event (defaults to eventFluxDt).
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
      this.scheduler.runBand("daily", this, config.minutesPerDay);
      this.registry.assertBounds("daily");

      this.daysSinceDecadal = this.daysSinceDecadal + 1;
      if (this.daysSinceDecadal >= config.decadalDailySteps) {
        this.daysSinceDecadal = 0;
        this.scheduler.runBand("decadal", this, config.decadalDailySteps);
        this.registry.assertBounds("decadal");
      }
    }
  }

  recomputeFlowStructure(): void {
    const elev = this.terrain.data;
    const { filled, depressionDepth } = priorityFloodFill(
      this.width,
      this.height,
      elev,
    );
    this.filledElevation = filled;
    this.depressionDepth.data.set(depressionDepth);
    // Route on filled surface so pits spill honestly (H-003).
    this.flowDirection = computeD8FlowDirection(this.width, this.height, filled);
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
    this.outletCells = this.closedBoundary
      ? new Set()
      : computePerimeterOutlets(this.width, this.height, elev);
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
    );
    this.boundaryOutflowLedger += result.boundaryOutflow;
  }

  runSoilWaterStep(_dt: number): void {
    const w = this.water.data;
    const m = this.soilMoisture.data;
    const depth = this.soilDepth.data;
    const cap = this.infiltrationCapacity.data;
    const contrib = this.vegInfiltrationContribution.data;
    const porosity = config.soilPorosity;
    const et = config.etRate;
    const minDepth = 1e-3;

    for (let i = 0; i < cap.length; i++) {
      cap[i] = config.infiltrationRate + contrib[i]!;
    }

    for (let i = 0; i < w.length; i++) {
      const h = Math.max(depth[i]!, minDepth);
      const surface = w[i]!;
      // soil.moisture is volumetric fraction; storage depth = m · h (§8 / §8.2).
      const room = Math.max(0, (porosity - m[i]!) * h);
      const infiltrate = Math.min(surface, cap[i]!, room);
      if (infiltrate > 0) {
        w[i]! -= infiltrate;
        m[i]! += infiltrate / h;
        this.infiltrationLedger += infiltrate;
      }
      const storage = m[i]! * h;
      if (storage > 0) {
        const evap = Math.min(storage, et);
        m[i]! = (storage - evap) / h;
        this.etLedger += evap;
      }
    }
  }

  /**
   * Cheap GW recharge + channel-preferential baseflow (C-001 / H-001 / H-004).
   * Linear reservoir — not Darcy iterative solve / Richards (EXTERNAL_REFERENCES).
   */
  runGroundwaterStep(_dt: number): void {
    if (this.gwRechargeRate === 0 && this.gwRecessionAlpha === 0) return;

    this.ensureStructureFresh();
    const m = this.soilMoisture.data;
    const depth = this.soilDepth.data;
    const gw = this.groundwaterStorage.data;
    const w = this.water.data;
    const acc = this.flowAccumulation;
    const porosity = config.soilPorosity;
    const fc = porosity * this.gwFieldCapacityFraction;
    const minDepth = 1e-3;
    const nCells = this.width * this.height;

    for (let i = 0; i < gw.length; i++) {
      const h = Math.max(depth[i]!, minDepth);

      if (this.gwRechargeRate > 0 && m[i]! > fc) {
        const excess = (m[i]! - fc) * h;
        const recharge = Math.min(excess, this.gwRechargeRate);
        if (recharge > 0) {
          m[i]! -= recharge / h;
          gw[i]! += recharge;
        }
      }

      if (this.gwRecessionAlpha > 0 && gw[i]! > 0) {
        const a = acc ? acc[i]! : 1;
        const aNorm = Math.min(1, a / nCells);
        const channelFactor = 1 + this.gwChannelBoost * aNorm;
        const q = Math.min(
          gw[i]!,
          gw[i]! * this.gwRecessionAlpha * channelFactor,
        );
        gw[i]! -= q;
        w[i]! += q;
      }
    }
  }

  /**
   * Liebig HSI + limiting factor (Slice 9 / NATURAL_PROCESS_MATH §3.3).
   * Composition: docs/slices/9-composition.md — min, not product.
   */
  runHabitatStep(_dt: number): void {
    const m = this.soilMoisture.data;
    const depth = this.soilDepth.data;
    const gw = this.groundwaterStorage.data;
    const hsi = this.habitatSuitability.data;
    const lim = this.habitatLimitingFactor.data;
    const gap = this.habitatLimitingGap.data;
    const porosity = config.soilPorosity;
    const depthRef = config.hsiDepthRefMeters;
    const gwRef = config.hsiGwRefMeters;

    for (let i = 0; i < hsi.length; i++) {
      const sample = evaluateHsi({
        moisture: m[i]!,
        soilDepth: depth[i]!,
        groundwater: gw[i]!,
        porosity,
        depthRef,
        gwRef,
      });
      hsi[i] = sample.hsi;
      lim[i] = sample.limiting;
      gap[i] = sample.limitingGap;
    }
  }

  /**
   * Decadal soil production + GEO-002 erosion (NATURAL_PROCESS_MATH §3.8).
   * Production everywhere; channel erosion where accumulation earns cost.
   * Elev and depth move together so bedrock = elev − depth is invariant.
   */
  runGeomorphologyStep(_dt: number): void {
    this.ensureStructureFresh();
    const elev = this.terrain.data;
    const depth = this.soilDepth.data;
    const cover = this.vegCover.data;
    const acc = this.flowAccumulation;
    const filled = this.filledElevation ?? elev;
    const dx = config.cellSizeMeters;
    const zFloor = config.elevationFloor;
    const p0 = config.soilProductionP0;
    const h0 = config.soilProductionH0;
    const kE = config.soilErosionK;
    const aMin = config.erosionMinAccumulation;
    const minDepth = 1e-3;
    let dirty = false;

    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const i = z * this.width + x;
        const h = depth[i]!;
        const prod = p0 * Math.exp(-h / h0);

        let erode = 0;
        const a = acc ? acc[i]! : 0;
        if (a >= aMin) {
          const slope = neighborSlope(filled, this.width, this.height, x, z, dx);
          const aNorm = Math.min(1, a / (this.width * this.height));
          const cFactor = 1 - cover[i]! * 0.85;
          erode = kE * Math.sqrt(Math.max(aNorm, 1e-6)) * slope * cFactor;
        }

        let dh = prod - erode;
        let nextH = Math.min(5, Math.max(0, h + dh));
        let actualDh = nextH - h;
        const nextElev = elev[i]! + actualDh;
        if (nextElev < zFloor) {
          actualDh = zFloor - elev[i]!;
          nextH = Math.min(5, Math.max(0, h + actualDh));
          actualDh = nextH - h;
        }

        if (actualDh !== 0) {
          const oldH = Math.max(h, minDepth);
          const newH = Math.max(nextH, minDepth);
          // Conserve column water; spill past porosity to surface (erosion).
          this.adjustMoistureForDepthChange(i, oldH, newH, nextH);
          depth[i]! = nextH;
          elev[i]! = elev[i]! + actualDh;
          dirty = true;
        }
      }
    }

    if (dirty) this.markStructureDirty();
  }

  runVegetationStep(_dt: number): void {
    const m = this.soilMoisture.data;
    const c = this.vegCover.data;
    const rough = this.surfaceRoughness.data;
    const infilContrib = this.vegInfiltrationContribution.data;
    const growth = config.vegGrowthRate;
    const decay = config.vegDecayRate;
    const thresh = config.vegMoistureThreshold;

    for (let i = 0; i < c.length; i++) {
      const moisture = m[i]!;
      let cover = c[i]!;
      if (moisture > thresh) {
        cover += growth * moisture * (1 - cover);
      } else {
        cover -= decay * (1 - moisture / Math.max(thresh, 1e-6));
      }
      cover = Math.min(1, Math.max(0, cover));
      c[i] = cover;
      rough[i] = config.baseRoughness + cover * config.vegRoughnessBonus;
      infilContrib[i] = cover * config.vegInfiltrationBonus;
    }
  }

  addRain(amountPerCell: number): void {
    if (amountPerCell === 0) return;
    const data = this.water.data;
    let added = 0;
    for (let i = 0; i < data.length; i++) {
      data[i]! += amountPerCell;
      added += amountPerCell;
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
    const porosity = config.soilPorosity;
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
    this.infiltrationLedger = 0;
    this.etLedger = 0;
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
      surface + soil + gw + this.etLedger + this.boundaryOutflowLedger;
    return this.precipitationLedger - accounted;
  }

  getSoilMoisture(x: number, z: number): number {
    if (!this.soilMoisture.inBounds(x, z)) return 0;
    return this.soilMoisture.get(x, z);
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

  raiseBerm(cx: number, cz: number, amount: number = config.bermRaise): void {
    this.applyTerrainBrush(cx, cz, amount);
  }

  digChannel(cx: number, cz: number, amount: number = config.digLower): void {
    this.applyTerrainBrush(cx, cz, -amount);
  }

  private applyTerrainBrush(cx: number, cz: number, delta: number): void {
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
        range: [0, config.soilPorosity] as const,
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
        range: [0, 2] as const,
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
