import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { FieldRegistry } from "./registry/FieldRegistry";
import type { ScalarBox } from "./registry/types";
import { SimScheduler } from "./process/scheduler";
import { surfaceWaterProcess } from "./process/surfaceWaterProcess";
import { soilWaterProcess } from "./process/soilWaterProcess";
import { vegetationProcess } from "./process/vegetationProcess";
import { geomorphologyProcess } from "./process/geomorphologyProcess";
import { fluxStep } from "./hydrology/fluxStep";
import {
  computeD8Accumulation,
  computeD8FlowDirection,
  computeWatershedLabels,
  priorityFloodFill,
  type FlowDirection,
} from "./hydrology/flowRouting";
import type { HydrologyModel } from "./hydrology/HydrologyModel";
import { HeightfieldHydrology } from "./hydrology/HeightfieldHydrology";

/**
 * Owns authoritative world fields and the field registry.
 * Structural flow (3), soil (4), vegetation (5–6), geomorphology (8), hygiene.
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
  private structureDirty = false;

  constructor(
    terrain: Grid2D,
    options?: { flowRate?: number; maxOutflowFraction?: number },
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

    this.registry = new FieldRegistry();
    this.registerFields();

    this.hydrology = new HeightfieldHydrology(this);
    this.scheduler = new SimScheduler([
      surfaceWaterProcess,
      soilWaterProcess,
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
      undefined,
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
   * Decadal soil production + GEO-002 erosion (NATURAL_PROCESS_MATH §3.8).
   * Production everywhere; channel erosion where accumulation earns cost.
   * Elev and depth move together so bedrock = elev − depth is invariant.
   */
  runGeomorphologyStep(_dt: number): void {
    this.ensureStructureFresh();
    const elev = this.terrain.data;
    const depth = this.soilDepth.data;
    const moisture = this.soilMoisture.data;
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
          // Conserve column water when depth changes (new production is dry).
          moisture[i]! = (moisture[i]! * oldH) / newH;
          if (nextH <= 0) moisture[i]! = 0;
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

  resetWater(): void {
    this.water.fill(0);
    this.soilMoisture.fill(0);
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

  waterBalanceResidual(): number {
    let surface = 0;
    let soil = 0;
    for (let i = 0; i < this.water.data.length; i++) {
      surface += this.water.data[i]!;
      soil += this.soilStorageDepth(i);
    }
    const accounted =
      surface + soil + this.etLedger + this.boundaryOutflowLedger;
    return this.precipitationLedger - accounted;
  }

  getSoilMoisture(x: number, z: number): number {
    if (!this.soilMoisture.inBounds(x, z)) return 0;
    return this.soilMoisture.get(x, z);
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
    const r = config.sitingBrushRadius;
    const zFloor = config.elevationFloor;
    for (let z = cz - r; z <= cz + r; z++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (!this.terrain.inBounds(x, z)) continue;
        const dist = Math.hypot(x - cx, z - cz);
        if (dist > r + 0.01) continue;
        const falloff = 1 - dist / (r + 1);
        const next = this.terrain.get(x, z) + delta * falloff;
        this.terrain.set(x, z, Math.max(zFloor, next));
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
