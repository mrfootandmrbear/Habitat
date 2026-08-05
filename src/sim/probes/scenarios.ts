import { config } from "../../config";
import { Grid2D } from "../Grid2D";
import { WorldState } from "../WorldState";
import { computeShorelineCells, totalWaterVolume } from "../hydrology/fluxStep";
import { generateMountain } from "../terrain/generateMountain";
import {
  rainDepthForRegime,
  rainRegimeById,
  regimeRainsThisEvent,
  type RainRegimeId,
} from "../climate/rainRegime";
import { heatById } from "../climate/atmosphere";
import { fillOrographicRainDepths } from "../climate/orographicPrecip";
import { windById, type WindId } from "../climate/windRegime";
import { seasonById, type SeasonId } from "../climate/seasonRegime";
import { erosionById, type ErosionId } from "../climate/erosionRegime";
import { meanExposure } from "../climate/shoreExposure";
import {
  LIMITING_DEPTH,
  LIMITING_INUNDATION,
  LIMITING_LIGHT,
  LIMITING_MOISTURE,
  LIMITING_SALINITY,
  LIMITING_SPRAY,
  LIMITING_TEMPERATURE,
} from "../habitat/hsiComposition";
import { terrainInsolation } from "../vegetation/lightCompetition";
import {
  DEEP_TIME_SIM_YEARS,
  decadalBandsForYears,
  makeDeepTimeWorld,
  p005LegacyDepthEffect,
  p005SaveAdvanceReloadHash,
  sampleHorizon,
} from "./deepTime";
import {
  SUBSTRATE_CLAY,
  SUBSTRATE_LOAM,
  SUBSTRATE_ROCK,
  SUBSTRATE_SAND,
  substrateProps,
} from "../terrain/substrates";
import {
  generateIsland,
  DEFAULT_SEA_LEVEL_METERS,
} from "../terrain/generateIsland";
import { shorelineEncodingDelta } from "../climate/seaLevel";
import {
  foreshoreEncodingFrac,
  meanHighWater,
  tideById,
} from "../climate/tidalEnvelope";
import {
  ScenarioSession,
  criterionReaderFromWorld,
  livingHollowObjective,
} from "../scenario/ScenarioSession";
import { soilEncodingDelta } from "../../ui/cutaway";
import { intertidalEncodingDelta } from "../../ui/terrainEncoding";
import { seedPressureAt, nextHerbBiomass } from "../habitat/arrivalComposition";
import {
  BranchSession,
  branchMoistureEncodingDelta,
  forkWorld,
} from "../branch";
import {
  applyForces,
  type ForceSettings,
} from "../forceSettings";

export type ProbeRecord = Record<string, number | string>;

export type ProbeResult = {
  scenario: string;
  records: ProbeRecord[];
};

export function probePairedStorm(): ProbeResult {
  // Match veg-water paired flux: roughness blunts downslope delivery.
  const w = 16;
  const h = 8;
  const ramp = new Grid2D(w, h);
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      ramp.set(x, z, (w - 1 - x) * 0.4);
    }
  }
  const bare = new WorldState(ramp.clone(), { closedBoundary: true });
  const veg = new WorldState(ramp.clone(), { closedBoundary: true });
  bare.vegCover.fill(0);
  veg.vegCover.fill(1);
  bare.runVegetationStep(1);
  veg.runVegetationStep(1);
  bare.runSoilWaterStep(1);
  veg.runSoilWaterStep(1);

  const runFlux = (world: WorldState): ProbeRecord => {
    world.water.fill(0);
    for (let z = 0; z < h; z++) {
      world.water.set(0, z, 0.5);
    }
    for (let i = 0; i < 40; i++) {
      world.runSurfaceWaterStep(config.eventFluxDt);
    }
    const downslope = world.water.get(w - 1, (h / 2) | 0);
    return {
      cover: world.vegCover.get(0, 0),
      downslope,
      roughness: world.surfaceRoughness.get(0, 0),
    };
  };

  const bareFlux = runFlux(bare);
  const vegFlux = runFlux(veg);

  // Separate infil soak on flat (cover raises infiltration capacity).
  const flat = new Grid2D(12, 12, 1);
  const bareSoil = new WorldState(flat.clone());
  const vegSoil = new WorldState(flat.clone());
  bareSoil.vegCover.fill(0);
  vegSoil.vegCover.fill(1);
  bareSoil.runVegetationStep(1);
  vegSoil.runVegetationStep(1);
  bareSoil.runSoilWaterStep(1);
  vegSoil.runSoilWaterStep(1);
  bareSoil.water.fill(0.4);
  vegSoil.water.fill(0.4);
  bareSoil.infiltrationLedger = 0;
  vegSoil.infiltrationLedger = 0;
  bareSoil.runSoilWaterStep(1);
  vegSoil.runSoilWaterStep(1);

  const bareDown = Number(bareFlux.downslope);
  const vegDown = Number(vegFlux.downslope);
  if (!(bareDown > vegDown)) {
    throw new Error(
      `paired-storm: expected bare downslope (${bareDown}) > vegetated (${vegDown})`,
    );
  }
  const bareInfil = bareSoil.infiltrationLedger;
  const vegInfil = vegSoil.infiltrationLedger;
  if (!(vegInfil > bareInfil)) {
    throw new Error("paired-storm: expected vegetated infil > bare");
  }
  const records: ProbeRecord[] = [
    {
      label: "bare",
      ...bareFlux,
      infiltrated: bareInfil,
    },
    {
      label: "vegetated",
      ...vegFlux,
      infiltrated: vegInfil,
    },
  ];
  return { scenario: "paired-storm", records };
}

export function probeBermReroute(): ProbeResult {
  // Ramp so a mid-slope berm clearly redirects accumulation (A-005 / Tier-M).
  const w = 24;
  const h = 24;
  const terrain = new Grid2D(w, h);
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      terrain.set(x, z, x * 0.4);
    }
  }
  const world = new WorldState(terrain);
  world.ensureStructureFresh();
  const before = world.flowAccumulation!.slice();
  world.raiseBerm(12, 12, 3);
  world.ensureStructureFresh();
  const after = world.flowAccumulation!;
  let changed = 0;
  let maxDelta = 0;
  for (let i = 0; i < before.length; i++) {
    const d = Math.abs((after[i] ?? 0) - (before[i] ?? 0));
    if (d > 0) changed++;
    maxDelta = Math.max(maxDelta, d);
  }
  const records = [
    {
      cellsChanged: changed,
      maxAccumulationDelta: maxDelta,
      bermCellAccBefore: before[12 * w + 12] ?? 0,
      bermCellAccAfter: after[12 * w + 12] ?? 0,
    },
  ];
  if (changed === 0) {
    throw new Error("berm-reroute: expected flow accumulation to change");
  }
  return { scenario: "berm-reroute", records };
}

export function probeBasinFill(): ProbeResult {
  const w = 16;
  const h = 16;
  const terrain = new Grid2D(w, h, 4);
  for (let z = 4; z < 12; z++) {
    for (let x = 4; x < 12; x++) {
      terrain.set(x, z, 1);
    }
  }
  terrain.set(8, 8, 0);
  const world = new WorldState(terrain);
  world.ensureStructureFresh();
  const pit = 8 * w + 8;
  const depth = world.depressionDepth.data[pit]!;
  const filled = world.filledElevation![pit]!;

  world.water.fill(0);
  world.water.set(8, 8, depth);
  const initial = totalWaterVolume(world.water.data);
  for (let i = 0; i < 40; i++) world.runSurfaceWaterStep(config.eventFluxDt);
  const residual = Math.abs(totalWaterVolume(world.water.data) - initial);

  const records = [
    {
      pitRawElev: 0,
      spillFilledElev: filled,
      depressionDepth: depth,
      volumeResidual: residual,
    },
  ];
  return { scenario: "basin-fill", records };
}

/**
 * Decadal horizon + P-005 save criterion (BUILD_GUIDE §4.1).
 * Asserts slow fields still move late (f32-stall tripwire) and save/reload
 * trajectories hash-equal over 100 compressed sim-years.
 */
export function probeDeepTime(): ProbeResult {
  const totalBands = decadalBandsForYears(DEEP_TIME_SIM_YEARS);
  const sampleEvery = 2; // every 20 compressed sim-years
  const world = makeDeepTimeWorld();
  const samples = sampleHorizon(world, totalBands, sampleEvery);

  if (samples.length < 3) {
    throw new Error("deep-time: expected at least t0 + two interval samples");
  }
  const prev = samples[samples.length - 2]!;
  const last = samples[samples.length - 1]!;
  const lateSoilDelta = last.meanSoilDepth - prev.meanSoilDepth;
  const lateElevDelta = last.meanElev - prev.meanElev;
  const lateCoverDelta = last.meanCover - prev.meanCover;
  const lateMoved =
    Math.abs(lateSoilDelta) > 1e-8 ||
    Math.abs(lateElevDelta) > 1e-8 ||
    Math.abs(lateCoverDelta) > 1e-8;
  if (!lateMoved) {
    throw new Error(
      `deep-time: f32-stall suspected — no late change in soil/elev/cover between ${prev.simYears}y and ${last.simYears}y (deltas ${lateSoilDelta}, ${lateElevDelta}, ${lateCoverDelta})`,
    );
  }

  const p005 = p005SaveAdvanceReloadHash();
  if (!p005.match) {
    throw new Error(
      `deep-time P-005: hash mismatch after save/advance/reload/advance (${p005.hashFirst} vs ${p005.hashSecond})`,
    );
  }
  const legacy = p005LegacyDepthEffect();
  if (!legacy.thinGainedMore) {
    throw new Error(
      `deep-time P-005 legacy: thin soil from save did not out-produce deep soil over decades (thin=${legacy.thinFinalDepth}, deep=${legacy.deepFinalDepth})`,
    );
  }

  const records: ProbeRecord[] = samples.map((s) => ({
    label: `y${s.simYears}`,
    meanElev: s.meanElev,
    meanSoilDepth: s.meanSoilDepth,
    meanCover: s.meanCover,
    massResidual: s.massResidual,
    stepMsMean: s.stepMsMean,
  }));
  records.push({
    label: "lateDelta",
    soilDepthDelta: lateSoilDelta,
    elevDelta: lateElevDelta,
    coverDelta: lateCoverDelta,
    stillMoving: lateMoved ? 1 : 0,
  });
  records.push({
    label: "p005",
    hashMatch: p005.match ? 1 : 0,
    simYears: DEEP_TIME_SIM_YEARS,
    legacyThinGainedMore: legacy.thinGainedMore ? 1 : 0,
    // Encode hashes as numeric fingerprints for baseline (first 8 hex → int)
    hashFirstN: Number.parseInt(p005.hashFirst.slice(0, 8), 16),
    hashSecondN: Number.parseInt(p005.hashSecond.slice(0, 8), 16),
  });

  return { scenario: "deep-time", records };
}

/**
 * Slice 8b / C-001: after wet→dry, channel cells stay wetter with GW than without.
 * Linear-reservoir baseflow — not Richards (EXTERNAL_REFERENCES ban).
 *
 * Ponded storm water is drained to the boundary ledger before the dry spell so
 * the comparison isolates storage-fed seepage (H-004 still closes).
 */
export function probeBaseflowPersist(): ProbeResult {
  const makeWorld = (groundwaterEnabled: boolean): WorldState =>
    new WorldState(generateMountain(24, 24, 6, 3), { groundwaterEnabled });

  const channelWetness = (world: WorldState): number => {
    world.ensureStructureFresh();
    const acc = world.flowAccumulation!;
    const sorted = Array.from(acc).sort((a, b) => a - b);
    const threshold = sorted[Math.floor(sorted.length * 0.75)]!;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < acc.length; i++) {
      if (acc[i]! >= threshold) {
        sum += world.water.data[i]!;
        n++;
      }
    }
    return n > 0 ? sum / n : 0;
  };

  const runSchedule = (groundwaterEnabled: boolean) => {
    const world = makeWorld(groundwaterEnabled);
    const wetDays = 5;
    const dryDays = 6;
    for (let d = 0; d < wetDays; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.addRain(config.rainDepthPerEvent * 2.5);
        world.stepEvent();
      }
    }
    // Storm pulse leaves the preserve — counted as boundary outflow (H-004).
    let removed = 0;
    for (let i = 0; i < world.water.data.length; i++) {
      removed += world.water.data[i]!;
      world.water.data[i] = 0;
    }
    world.boundaryOutflowLedger += removed;

    for (let d = 0; d < dryDays; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.stepEvent();
      }
    }
    return {
      channelWet: channelWetness(world),
      gwSum: world.groundwaterStorageSum(),
      massResidual: world.waterBalanceResidual(),
      precip: world.precipitationLedger,
    };
  };

  const withGw = runSchedule(true);
  const withoutGw = runSchedule(false);

  if (!(withGw.channelWet > withoutGw.channelWet)) {
    throw new Error(
      `baseflow-persist: expected with-GW channel wetness (${withGw.channelWet}) > without (${withoutGw.channelWet})`,
    );
  }
  if (!(withGw.gwSum > 0)) {
    throw new Error(
      "baseflow-persist: expected positive GW storage after wet→dry",
    );
  }
  const relResidual =
    Math.abs(withGw.massResidual) / Math.max(1, withGw.precip);
  if (relResidual >= 1e-4) {
    throw new Error(
      `baseflow-persist: H-004 residual too large (${withGw.massResidual}, rel=${relResidual})`,
    );
  }

  return {
    scenario: "baseflow-persist",
    records: [
      {
        label: "withGw",
        channelWet: withGw.channelWet,
        gwSum: withGw.gwSum,
        massResidual: withGw.massResidual,
      },
      {
        label: "withoutGw",
        channelWet: withoutGw.channelWet,
        gwSum: withoutGw.gwSum,
        massResidual: withoutGw.massResidual,
      },
      {
        label: "delta",
        channelWetDelta: withGw.channelWet - withoutGw.channelWet,
        ratio:
          withoutGw.channelWet > 1e-12
            ? withGw.channelWet / withoutGw.channelWet
            : withGw.channelWet > 0
              ? 1e6
              : 0,
      },
    ],
  };
}

/**
 * Slice 8c / C-004: same seed + same regime → identical hash;
 * different authored regime → divergent outcome. Force dial is global
 * (no cell targeting — THESIS §9).
 */
export function probeRegimeDivergence(): ProbeResult {
  const seed = 11;
  const days = 6;

  const run = (regimeId: RainRegimeId) => {
    const world = new WorldState(generateMountain(24, 24, 6, seed));
    const regime = rainRegimeById(regimeId);
    const depth = rainDepthForRegime(
      regime,
      config.rainDepthPerEvent,
      config.dailyEventSteps,
    );
    for (let d = 0; d < days; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        if (
          depth > 0 &&
          regimeRainsThisEvent(regime, i, config.dailyEventSteps, d)
        ) {
          world.addRain(depth);
        }
        world.stepEvent();
      }
    }
    let soil = 0;
    let cover = 0;
    for (let i = 0; i < world.soilMoisture.data.length; i++) {
      soil += world.soilStorageDepth(i);
      cover += world.vegCover.data[i]!;
    }
    const n = world.vegCover.data.length;
    return {
      hash: world.stateHash(),
      precip: world.precipitationLedger,
      soilSum: soil,
      meanCover: cover / n,
      hashN: Number.parseInt(world.stateHash().slice(0, 8), 16),
    };
  };

  const lightA = run("light");
  const lightB = run("light");
  const heavy = run("heavy");

  if (lightA.hash !== lightB.hash) {
    throw new Error(
      `regime-divergence: same regime must match (T-001) ${lightA.hash} vs ${lightB.hash}`,
    );
  }
  if (lightA.hash === heavy.hash) {
    throw new Error(
      "regime-divergence: light and heavy regimes produced identical hashes",
    );
  }
  if (!(heavy.precip > lightA.precip)) {
    throw new Error(
      `regime-divergence: expected heavy precip (${heavy.precip}) > light (${lightA.precip})`,
    );
  }

  return {
    scenario: "regime-divergence",
    records: [
      {
        label: "light",
        hashN: lightA.hashN,
        precip: lightA.precip,
        soilSum: lightA.soilSum,
        meanCover: lightA.meanCover,
        replayMatch: lightA.hash === lightB.hash ? 1 : 0,
      },
      {
        label: "heavy",
        hashN: heavy.hashN,
        precip: heavy.precip,
        soilSum: heavy.soilSum,
        meanCover: heavy.meanCover,
      },
      {
        label: "delta",
        precipDelta: heavy.precip - lightA.precip,
        soilDelta: heavy.soilSum - lightA.soilSum,
        hashDiverged: lightA.hash !== heavy.hash ? 1 : 0,
      },
    ],
  };
}

/**
 * C-005: fork one castle; same forces → identical hash; different rain →
 * divergent soil; compare encoding clears the perceptual floor (no numbers).
 */
export function probeBranchCompare(): ProbeResult {
  const seed = 13;
  const days = 8;
  const base: ForceSettings = {
    rain: "light",
    heat: "warm",
    sea: "none",
    tide: "off",
    wind: "calm",
    season: "typical",
    erosion: "moderate",
  };

  const root = new WorldState(generateMountain(16, 16, 5, seed));
  applyForces(root, base);
  root.raiseBerm(8, 8);

  const sameA = forkWorld(root, base);
  const sameB = forkWorld(root, base);
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < config.dailyEventSteps; i++) {
      sameA.stepEvent();
      sameB.stepEvent();
    }
  }
  if (sameA.stateHash() !== sameB.stateHash()) {
    throw new Error(
      `branch-compare: same forces must match (T-001) ${sameA.stateHash()} vs ${sameB.stateHash()}`,
    );
  }

  const session = BranchSession.open(root, base);
  applyForces(session.a, { ...base, rain: "heavy" });
  applyForces(session.b, { ...base, rain: "dry" });
  for (let d = 0; d < days; d++) {
    for (let i = 0; i < config.dailyEventSteps; i++) {
      session.stepBoth();
    }
  }
  if (session.a.stateHash() === session.b.stateHash()) {
    throw new Error("branch-compare: heavy vs dry produced identical hashes");
  }

  let soilA = 0;
  let soilB = 0;
  const n = session.a.soilMoisture.data.length;
  for (let i = 0; i < n; i++) {
    soilA += session.a.soilMoisture.data[i]!;
    soilB += session.b.soilMoisture.data[i]!;
  }
  const meanA = soilA / n;
  const meanB = soilB / n;
  const encoding = branchMoistureEncodingDelta(meanA, meanB);
  if (!(encoding > 0.15)) {
    throw new Error(
      `branch-compare: moisture encoding ${encoding} did not clear floor 0.15`,
    );
  }
  if (!(session.a.precipitationLedger > session.b.precipitationLedger)) {
    throw new Error(
      `branch-compare: expected heavy precip > dry (${session.a.precipitationLedger} vs ${session.b.precipitationLedger})`,
    );
  }

  // Isolation: mutate A mid-run; B matches a control twin.
  const isoRoot = new WorldState(generateMountain(12, 12, 4, seed));
  applyForces(isoRoot, base);
  const iso = BranchSession.open(isoRoot, base);
  const control = forkWorld(isoRoot, base);
  applyForces(iso.a, { ...base, rain: "heavy" });
  iso.a.raiseBerm(3, 3);
  for (let i = 0; i < 24; i++) {
    iso.stepBoth();
    control.stepEvent();
  }
  const isolated = iso.b.stateHash() === control.stateHash() ? 1 : 0;
  if (!isolated) {
    throw new Error("branch-compare: branch B aliased or contaminated by A");
  }

  return {
    scenario: "branch-compare",
    records: [
      {
        label: "same",
        hashMatch: 1,
        hashN: Number.parseInt(sameA.stateHash().slice(0, 8), 16),
        precip: sameA.precipitationLedger,
      },
      {
        label: "heavy",
        hashN: Number.parseInt(session.a.stateHash().slice(0, 8), 16),
        precip: session.a.precipitationLedger,
        meanSoil: meanA,
      },
      {
        label: "dry",
        hashN: Number.parseInt(session.b.stateHash().slice(0, 8), 16),
        precip: session.b.precipitationLedger,
        meanSoil: meanB,
      },
      {
        label: "delta",
        hashDiverged: 1,
        precipDelta:
          session.a.precipitationLedger - session.b.precipitationLedger,
        soilDelta: meanA - meanB,
        encoding,
        encodingCleared: encoding > 0.15 ? 1 : 0,
        isolated,
      },
    ],
  };
}

/**
 * Slice 9: a patch whose limiting factor identity flips across wet→dry
 * (Liebig argmin — NATURAL_PROCESS_MATH §3.3 / docs/slices/9-composition.md).
 */
export function probeLimitingShift(): ProbeResult {
  const world = new WorldState(new Grid2D(12, 12, 2));
  const cx = 6;
  const cz = 6;
  // Thin soil, wet moisture, ample GW → depth limits.
  world.soilDepth.fill(1.2);
  world.soilDepth.set(cx, cz, 0.12);
  world.soilMoisture.fill(config.soilPorosity * 0.5);
  world.groundwaterStorage.fill(0.4);
  world.runHabitatStep(1);
  const wetLim = world.getLimitingFactor(cx, cz);
  const wetHsi = world.getHabitatSuitability(cx, cz);
  if (wetLim !== LIMITING_DEPTH) {
    throw new Error(
      `limiting-shift: expected depth-limited when wet (got ${wetLim})`,
    );
  }

  // Drought the patch: collapse moisture below GW suitability → moisture limits.
  world.soilMoisture.set(cx, cz, 0.02);
  world.groundwaterStorage.set(cx, cz, 0.05);
  world.runHabitatStep(1);
  const dryLim = world.getLimitingFactor(cx, cz);
  const dryHsi = world.getHabitatSuitability(cx, cz);
  if (dryLim !== LIMITING_MOISTURE) {
    throw new Error(
      `limiting-shift: expected moisture-limited when dry (got ${dryLim})`,
    );
  }
  if (!(dryHsi < wetHsi)) {
    throw new Error(
      `limiting-shift: expected dry HSI (${dryHsi}) < wet HSI (${wetHsi})`,
    );
  }

  return {
    scenario: "limiting-shift",
    records: [
      {
        label: "wet",
        limiting: wetLim,
        hsi: wetHsi,
        depthLimited: wetLim === LIMITING_DEPTH ? 1 : 0,
      },
      {
        label: "dry",
        limiting: dryLim,
        hsi: dryHsi,
        moistureLimited: dryLim === LIMITING_MOISTURE ? 1 : 0,
      },
      {
        label: "shift",
        identityChanged: 1,
        hsiDrop: wetHsi - dryHsi,
      },
    ],
  };
}

/**
 * Slice 10: post-fire recovery trajectory differs by pre-fire moisture.
 * Wet patch recovers veg.cover faster after a burn (ES-002, NATURAL_PROCESS_MATH §3.5).
 * Also asserts determinism (T-001) and fuel accounting conservation.
 *
 * Since §4.44 the single `runFireStep` call is one rate-limited step rather
 * than a whole-region burn, so the two sectors are no longer burned to an
 * identical depth — the centred ignition sits on the dry side of the split.
 * The recovery claim is unaffected and is cleanest read as a change rather
 * than a level: the dry sector gains nothing over the recovery window while
 * the wet sector climbs well clear of where the burn left it.
 */
export function probeBurnRecover(): ProbeResult {
  const w = 16;
  const h = 16;
  const world = new WorldState(new Grid2D(w, h, 3));
  world.vegCover.fill(0.7);
  world.soilMoisture.fill(0.15);

  // Accumulate fuel (several decadal steps)
  for (let i = 0; i < 8; i++) world.runFuelAccumulationStep(1);

  const fuelBefore = sumGrid(world.fuelLoad.data);

  // Set up moisture zones: left half wet, right half dry
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      world.soilMoisture.data[i] = x < w / 2 ? 0.08 : 0.03;
    }
  }

  // Ignite center — only right-half (dry) should burn fully
  world.igniteCell(w / 2, h / 2);

  // Run second identical world for determinism check
  const world2 = new WorldState(new Grid2D(w, h, 3));
  world2.vegCover.fill(0.7);
  world2.soilMoisture.fill(0.15);
  for (let i = 0; i < 8; i++) world2.runFuelAccumulationStep(1);
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      world2.soilMoisture.data[i] = x < w / 2 ? 0.08 : 0.03;
    }
  }
  world2.igniteCell(w / 2, h / 2);

  // Fire spread
  world.runFireStep(1);
  world2.runFireStep(1);

  const hashAfter1 = world.stateHash();
  const hashAfter2 = world2.stateHash();

  if (hashAfter1 !== hashAfter2) {
    throw new Error(
      `burn-recover: determinism failed (T-001) — ${hashAfter1} vs ${hashAfter2}`,
    );
  }

  const fuelAfter = sumGrid(world.fuelLoad.data);
  const consumed = world.fuelConsumedLedger;
  const accountingError = Math.abs((fuelBefore - fuelAfter) - consumed);
  if (accountingError > 0.01) {
    throw new Error(
      `burn-recover: fuel accounting error=${accountingError} (consumed=${consumed}, delta=${fuelBefore - fuelAfter})`,
    );
  }

  // Count burned cells (fuel was consumed)
  let burnedCells = 0;
  for (let i = 0; i < world.fuelLoad.data.length; i++) {
    if (world.fireIntensity.data[i]! > 0) burnedCells++;
  }

  // Record cover after burn
  const wetCoverAfterBurn = sectorMean(world.vegCover.data, w, 0, w / 2, 0, h);
  const dryCoverAfterBurn = sectorMean(world.vegCover.data, w, w / 2, w, 0, h);

  // Now set moisture for recovery and run vegetation growth
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      world.soilMoisture.data[i] = x < w / 2 ? 0.30 : 0.04;
    }
  }

  for (let i = 0; i < 50; i++) world.runVegetationStep(1);

  const wetCoverRecovered = sectorMean(world.vegCover.data, w, 0, w / 2, 0, h);
  const dryCoverRecovered = sectorMean(world.vegCover.data, w, w / 2, w, 0, h);

  if (!(wetCoverRecovered > dryCoverRecovered)) {
    throw new Error(
      `burn-recover: expected wet recovery (${wetCoverRecovered}) > dry (${dryCoverRecovered})`,
    );
  }

  return {
    scenario: "burn-recover",
    records: [
      {
        label: "fire",
        burnedCells,
        fuelBefore,
        fuelAfter,
        consumed,
        accountingError,
        determinismMatch: 1,
        hashN: Number.parseInt(hashAfter1.slice(0, 8), 16),
      },
      {
        label: "wetSector",
        coverAfterBurn: wetCoverAfterBurn,
        coverRecovered: wetCoverRecovered,
      },
      {
        label: "drySector",
        coverAfterBurn: dryCoverAfterBurn,
        coverRecovered: dryCoverRecovered,
      },
      {
        label: "delta",
        recoveryGap: wetCoverRecovered - dryCoverRecovered,
        wetVsDry: wetCoverRecovered / Math.max(dryCoverRecovered, 1e-12),
      },
    ],
  };
}

/**
 * §4.45 — fuel/scar Refinement: same sim-time via one large step vs many small
 * must agree (analytic Olson / exponential scar).
 */
export function probeFuelScarRefine(): ProbeResult {
  const T = 12;
  const cover = 0.7;

  const one = new WorldState(new Grid2D(4, 4, 2));
  one.vegCover.fill(cover);
  one.fuelLoad.fill(0);
  one.runFuelAccumulationStep(T);

  const many = new WorldState(new Grid2D(4, 4, 2));
  many.vegCover.fill(cover);
  many.fuelLoad.fill(0);
  for (let i = 0; i < T; i++) many.runFuelAccumulationStep(1);

  const fuelOne = one.fuelLoad.data[0]!;
  const fuelMany = many.fuelLoad.data[0]!;
  const fuelDelta = Math.abs(fuelOne - fuelMany);
  if (fuelDelta > 1e-9) {
    throw new Error(
      `fuel-scar-refine: fuel step-size drift ${fuelDelta} (one=${fuelOne} many=${fuelMany})`,
    );
  }

  const scarOne = new WorldState(new Grid2D(4, 4, 2));
  scarOne.fireScar.fill(1);
  scarOne.decayFireScar(20);

  const scarMany = new WorldState(new Grid2D(4, 4, 2));
  scarMany.fireScar.fill(1);
  for (let i = 0; i < 20; i++) scarMany.decayFireScar(1);

  const sOne = scarOne.fireScar.data[0]!;
  const sMany = scarMany.fireScar.data[0]!;
  const scarDelta = Math.abs(sOne - sMany);
  if (scarDelta > 1e-9) {
    throw new Error(
      `fuel-scar-refine: scar step-size drift ${scarDelta} (one=${sOne} many=${sMany})`,
    );
  }
  if (!(sOne > 0)) {
    throw new Error(
      `fuel-scar-refine: scar hard-zeroed over 20 days (Euler defect regressing)`,
    );
  }

  return {
    scenario: "fuel-scar-refine",
    records: [
      {
        label: "fuel",
        oneStep: fuelOne,
        manySteps: fuelMany,
        delta: fuelDelta,
      },
      {
        label: "scar",
        oneStep: sOne,
        manySteps: sMany,
        delta: scarDelta,
      },
      {
        label: "delta",
        fuelMatch: fuelDelta <= 1e-9 ? 1 : 0,
        scarMatch: scarDelta <= 1e-9 ? 1 : 0,
        scarAlive: sOne > 0 ? 1 : 0,
      },
    ],
  };
}

/**
 * Slice 11 / ES-001: paired north/south aspects diverge under the same
 * moisture, initial cover, and vegetation rules. Slope/aspect sets incoming
 * light; Beer–Lambert canopy attenuation shapes the succession trajectory.
 */
export function probeSuccessionDiverge(): ProbeResult {
  const size = 16;
  const steps = 60;

  const run = (risePerCell: number) => {
    const terrain = new Grid2D(size, size);
    const offset = Math.abs(risePerCell) * size;
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        terrain.set(x, z, offset + z * risePerCell);
      }
    }
    const world = new WorldState(terrain);
    world.soilMoisture.fill(0.25);
    world.vegCover.fill(0.1);
    for (let i = 0; i < steps; i++) world.runVegetationStep(1);
    return {
      hash: world.stateHash(),
      meanInsolation: meanGrid(world.insolation.data),
      meanUnderstoryLight: meanGrid(world.understoryLight.data),
      meanCover: meanGrid(world.vegCover.data),
    };
  };

  const south = run(-4);
  const southReplay = run(-4);
  const north = run(4);
  if (south.hash !== southReplay.hash) {
    throw new Error(
      `succession-diverge: same aspect must replay exactly (${south.hash} vs ${southReplay.hash})`,
    );
  }
  if (!(south.meanInsolation > north.meanInsolation)) {
    throw new Error(
      `succession-diverge: expected south insolation (${south.meanInsolation}) > north (${north.meanInsolation})`,
    );
  }
  if (!(south.meanCover > north.meanCover)) {
    throw new Error(
      `succession-diverge: expected south cover (${south.meanCover}) > north (${north.meanCover})`,
    );
  }

  return {
    scenario: "succession-diverge",
    records: [
      {
        label: "south",
        meanInsolation: south.meanInsolation,
        meanUnderstoryLight: south.meanUnderstoryLight,
        meanCover: south.meanCover,
        replayMatch: 1,
      },
      {
        label: "north",
        meanInsolation: north.meanInsolation,
        meanUnderstoryLight: north.meanUnderstoryLight,
        meanCover: north.meanCover,
      },
      {
        label: "delta",
        insolationGap: south.meanInsolation - north.meanInsolation,
        coverGap: south.meanCover - north.meanCover,
      },
    ],
  };
}

/**
 * Dry-down feedback: after the same wetting pulse, south aspects dry faster
 * than north, and vegetated cells transpire while bare cells evaporate —
 * insolation × cover ET (NATURAL_PROCESS_MATH §1.6–1.7). Mass residual closes.
 */
export function probeDrydownFeedback(): ProbeResult {
  const size = 16;
  const wetDays = 3;
  const dryDays = 8;

  const runAspect = (risePerCell: number, cover: number) => {
    const terrain = new Grid2D(size, size);
    const offset = Math.abs(risePerCell) * size;
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        terrain.set(x, z, offset + z * risePerCell);
      }
    }
    const world = new WorldState(terrain);
    world.vegCover.fill(cover);
    world.runVegetationStep(1);
    for (let d = 0; d < wetDays; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.addRain(config.rainDepthPerEvent * 2);
        world.stepEvent();
      }
    }
    const moistureAfterWet = meanGrid(world.soilMoisture.data);
    for (let d = 0; d < dryDays; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.stepEvent();
      }
    }
    return {
      moistureAfterWet,
      moistureAfterDry: meanGrid(world.soilMoisture.data),
      meanPet: meanGrid(world.potentialEt.data),
      meanAet: meanGrid(world.actualEt.data),
      transpiration: world.transpirationLedger,
      soilEvaporation: world.soilEvaporationLedger,
      openWater: world.openWaterEvaporationLedger,
      etTotal: world.etLedger,
      massResidual: world.waterBalanceResidual(),
      precip: world.precipitationLedger,
      hash: world.stateHash(),
    };
  };

  const southBare = runAspect(-4, 0);
  const southVeg = runAspect(-4, 0.8);
  const northBare = runAspect(4, 0);
  const southReplay = runAspect(-4, 0);

  if (southBare.hash !== southReplay.hash) {
    throw new Error(
      `drydown-feedback: south bare must replay (T-001) ${southBare.hash} vs ${southReplay.hash}`,
    );
  }
  if (!(southBare.meanPet > northBare.meanPet)) {
    throw new Error(
      `drydown-feedback: expected south PET (${southBare.meanPet}) > north (${northBare.meanPet})`,
    );
  }
  if (!(southBare.moistureAfterDry < northBare.moistureAfterDry)) {
    throw new Error(
      `drydown-feedback: expected south drier (${southBare.moistureAfterDry}) than north (${northBare.moistureAfterDry})`,
    );
  }
  if (!(southVeg.transpiration > southBare.transpiration)) {
    throw new Error(
      `drydown-feedback: vegetated should transpire more (${southVeg.transpiration} vs ${southBare.transpiration})`,
    );
  }
  const parts =
    southBare.transpiration + southBare.soilEvaporation + southBare.openWater;
  if (Math.abs(parts - southBare.etTotal) > 1e-6) {
    throw new Error(
      `drydown-feedback: ET partitions ${parts} ≠ total ${southBare.etTotal}`,
    );
  }
  const relResidual =
    Math.abs(southBare.massResidual) / Math.max(1, southBare.precip);
  if (relResidual >= 1e-4) {
    throw new Error(
      `drydown-feedback: H-004 residual too large (${southBare.massResidual}, rel=${relResidual})`,
    );
  }

  return {
    scenario: "drydown-feedback",
    records: [
      {
        label: "southBare",
        moistureAfterDry: southBare.moistureAfterDry,
        meanPet: southBare.meanPet,
        etTotal: southBare.etTotal,
        transpiration: southBare.transpiration,
        soilEvaporation: southBare.soilEvaporation,
        massResidual: southBare.massResidual,
        replayMatch: 1,
      },
      {
        label: "southVeg",
        moistureAfterDry: southVeg.moistureAfterDry,
        transpiration: southVeg.transpiration,
        soilEvaporation: southVeg.soilEvaporation,
      },
      {
        label: "northBare",
        moistureAfterDry: northBare.moistureAfterDry,
        meanPet: northBare.meanPet,
      },
      {
        label: "delta",
        petGap: southBare.meanPet - northBare.meanPet,
        moistureGap: northBare.moistureAfterDry - southBare.moistureAfterDry,
        transpirationGap: southVeg.transpiration - southBare.transpiration,
        relResidual,
      },
    ],
  };
}

/**
 * Disturbance recovery: after a wetting pulse, moisture declines toward the
 * pre-pulse dry baseline without growing oscillation (ES-003).
 */
export function probeDisturbanceRecovery(): ProbeResult {
  const world = new WorldState(generateMountain(16, 16, 5, 7));
  // Mild wet-up then long dry settle → dry baseline the pulse must leave and return toward.
  for (let d = 0; d < 4; d++) {
    for (let i = 0; i < config.dailyEventSteps; i++) {
      world.addRain(config.rainDepthPerEvent);
      world.stepEvent();
    }
  }
  for (let d = 0; d < 12; d++) {
    for (let i = 0; i < config.dailyEventSteps; i++) {
      world.stepEvent();
    }
  }
  const baseline = meanGrid(world.soilMoisture.data);

  for (let d = 0; d < 2; d++) {
    for (let i = 0; i < config.dailyEventSteps; i++) {
      world.addRain(config.rainDepthPerEvent * 3);
      world.stepEvent();
    }
  }
  const peak = meanGrid(world.soilMoisture.data);
  if (!(peak > baseline * 1.2)) {
    throw new Error(
      `disturbance-recovery: expected clear pulse (peak=${peak}, baseline=${baseline})`,
    );
  }

  // Recovery target: halfway from peak back to baseline (half-life style).
  const halfTarget = baseline + 0.5 * (peak - baseline);
  let recoveredDay = -1;
  const trajectory: number[] = [peak];
  for (let d = 0; d < 30; d++) {
    for (let i = 0; i < config.dailyEventSteps; i++) {
      world.stepEvent();
    }
    const m = meanGrid(world.soilMoisture.data);
    trajectory.push(m);
    if (recoveredDay < 0 && m <= halfTarget) {
      recoveredDay = d + 1;
    }
  }
  const finalM = trajectory[trajectory.length - 1]!;
  if (recoveredDay < 0) {
    throw new Error(
      `disturbance-recovery: never reached half-recovery target ${halfTarget} (final=${finalM})`,
    );
  }
  // Monotone dry-down: each day ≤ previous + tiny noise.
  let risingDays = 0;
  for (let i = 1; i < trajectory.length; i++) {
    if (trajectory[i]! > trajectory[i - 1]! + 1e-4) risingDays++;
  }
  if (risingDays > 2) {
    throw new Error(
      `disturbance-recovery: moisture rose on ${risingDays} days — oscillation risk`,
    );
  }
  const earlyDrop = trajectory[0]! - trajectory[Math.min(3, trajectory.length - 1)]!;
  const lateDrop =
    trajectory[Math.max(0, trajectory.length - 4)]! -
    trajectory[trajectory.length - 1]!;
  // Late drop should not reverse into growth; allow slowing.
  if (lateDrop < -0.01) {
    throw new Error(
      `disturbance-recovery: late moisture increased (lateDrop=${lateDrop})`,
    );
  }
  const relResidual =
    Math.abs(world.waterBalanceResidual()) /
    Math.max(1, world.precipitationLedger);
  if (relResidual >= 1e-4) {
    throw new Error(
      `disturbance-recovery: residual too large (rel=${relResidual})`,
    );
  }

  return {
    scenario: "disturbance-recovery",
    records: [
      {
        label: "pulse",
        baseline,
        peak,
        halfTarget,
        finalMoisture: finalM,
        recoveredDay,
        earlyDrop,
        lateDrop,
        risingDays,
        relResidual,
        bounded: risingDays <= 2 ? 1 : 0,
      },
    ],
  };
}

/**
 * Slice 12: paired suitable / unsuitable patches under one seed schedule (C-007).
 * Suitable wet hollow earns herb biomass; dry unsuitable patch does not.
 * Same seed + forcing → identical hash (T-001). Continuous establishment (C-003).
 */
export function probeArrivalEarned(): ProbeResult {
  const w = 16;
  const h = 16;
  const make = () => {
    const world = new WorldState(new Grid2D(w, h, 2.5));
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(0);
    world.groundwaterStorage.fill(0);
    // Suitable wet hollow near the edge (high seed pressure + high HSI).
    const sx = 1;
    const sz = 8;
    world.soilMoisture.set(sx, sz, config.soilPorosity * 0.5);
    world.groundwaterStorage.set(sx, sz, config.hsiGwRefMeters);
    // Unsuitable dry interior cell (zero moisture / GW → HSI 0).
    const ux = 8;
    const uz = 8;
    world.soilMoisture.set(ux, uz, 0);
    world.groundwaterStorage.set(ux, uz, 0);
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    return { world, sx, sz, ux, uz };
  };

  const a = make();
  const b = make();
  const hashMatch = a.world.stateHash() === b.world.stateHash() ? 1 : 0;
  if (hashMatch !== 1) {
    throw new Error("arrival-earned: replay hash mismatch");
  }

  const suitableBiomass = a.world.getHerbBiomass(a.sx, a.sz);
  const unsuitableBiomass = a.world.getHerbBiomass(a.ux, a.uz);
  const suitableHsi = a.world.getHabitatSuitability(a.sx, a.sz);
  const unsuitableHsi = a.world.getHabitatSuitability(a.ux, a.uz);
  const suitableSeed = a.world.getHerbSeedBank(a.sx, a.sz);
  const unsuitableSeed = a.world.getHerbSeedBank(a.ux, a.uz);
  const suitableEst = a.world.getHerbEstablishment(a.sx, a.sz);
  const unsuitableEst = a.world.getHerbEstablishment(a.ux, a.uz);
  const biomassDelta = suitableBiomass - unsuitableBiomass;

  if (!(suitableHsi > 0.5)) {
    throw new Error(`arrival-earned: suitable HSI too low (${suitableHsi})`);
  }
  if (unsuitableHsi !== 0) {
    throw new Error(`arrival-earned: unsuitable HSI expected 0 (got ${unsuitableHsi})`);
  }
  if (!(suitableBiomass > 0.1)) {
    throw new Error(
      `arrival-earned: suitable biomass too low (${suitableBiomass})`,
    );
  }
  if (unsuitableBiomass !== 0) {
    throw new Error(
      `arrival-earned: unsuitable biomass expected 0 (got ${unsuitableBiomass})`,
    );
  }
  if (!(biomassDelta > 0.1)) {
    throw new Error(`arrival-earned: biomass delta too small (${biomassDelta})`);
  }

  let bounded = 1;
  for (let i = 0; i < a.world.herbBiomass.data.length; i++) {
    const v = a.world.herbBiomass.data[i]!;
    if (!Number.isFinite(v) || v < 0 || v > config.herbBiomassMax + 1e-6) {
      bounded = 0;
      break;
    }
  }

  return {
    scenario: "arrival-earned",
    records: [
      {
        label: "suitable",
        hsi: suitableHsi,
        seedBank: suitableSeed,
        establishment: suitableEst,
        biomass: suitableBiomass,
      },
      {
        label: "unsuitable",
        hsi: unsuitableHsi,
        seedBank: unsuitableSeed,
        establishment: unsuitableEst,
        biomass: unsuitableBiomass,
      },
      {
        label: "delta",
        biomassDelta,
        hashMatch,
        bounded,
        earned: biomassDelta > 0.1 && unsuitableBiomass === 0 ? 1 : 0,
      },
    ],
  };
}

/**
 * Slice 13 / E-005: earned herb biomass changes storm response with veg.cover held at 0.
 * Twins share geometry (matched seed field); only HSI / biomass differ.
 */
export function probeLivingHollow(): ProbeResult {
  const establishThenIsolate = (
    terrain: Grid2D,
    suitable: boolean,
    closedBoundary: boolean,
  ): WorldState => {
    const world = new WorldState(terrain.clone(), { closedBoundary });
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    if (suitable) {
      world.soilMoisture.fill(config.soilPorosity * 0.5);
      world.groundwaterStorage.fill(config.hsiGwRefMeters);
    } else {
      world.soilMoisture.fill(0);
      world.groundwaterStorage.fill(0);
    }
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    // Isolate herb → physics from daily cover growth (docs/slices/13-composition.md).
    world.soilMoisture.fill(0);
    world.vegCover.fill(0);
    world.runVegetationStep(1);
    world.runSoilWaterStep(1);
    return world;
  };

  const w = 16;
  const h = 8;
  const ramp = new Grid2D(w, h);
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      ramp.set(x, z, (w - 1 - x) * 0.4);
    }
  }

  const colonizedFlux = establishThenIsolate(ramp, true, true);
  const bareFlux = establishThenIsolate(ramp, false, true);
  const colonizedReplay = establishThenIsolate(ramp, true, true);
  const hashMatch =
    colonizedFlux.stateHash() === colonizedReplay.stateHash() ? 1 : 0;
  if (hashMatch !== 1) {
    throw new Error("living-hollow: replay hash mismatch");
  }

  const meanBiomass = (world: WorldState): number => {
    let s = 0;
    for (let i = 0; i < world.herbBiomass.data.length; i++) {
      s += world.herbBiomass.data[i]!;
    }
    return s / world.herbBiomass.data.length;
  };

  const colonizedBiomass = meanBiomass(colonizedFlux);
  const bareBiomass = meanBiomass(bareFlux);
  if (!(colonizedBiomass > 0.1)) {
    throw new Error(
      `living-hollow: colonized biomass too low (${colonizedBiomass})`,
    );
  }
  if (bareBiomass !== 0) {
    throw new Error(
      `living-hollow: bare biomass expected 0 (got ${bareBiomass})`,
    );
  }

  const runFlux = (world: WorldState): ProbeRecord => {
    world.water.fill(0);
    for (let z = 0; z < h; z++) {
      world.water.set(0, z, 0.5);
    }
    for (let i = 0; i < 40; i++) {
      world.runSurfaceWaterStep(config.eventFluxDt);
    }
    return {
      cover: world.vegCover.get(0, 0),
      biomass: meanBiomass(world),
      downslope: world.water.get(w - 1, (h / 2) | 0),
      roughness: world.surfaceRoughness.get(0, 0),
    };
  };

  const colonizedFluxRec = runFlux(colonizedFlux);
  const bareFluxRec = runFlux(bareFlux);
  const bareDown = Number(bareFluxRec.downslope);
  const colonizedDown = Number(colonizedFluxRec.downslope);
  if (!(bareDown > colonizedDown)) {
    throw new Error(
      `living-hollow: expected bare downslope (${bareDown}) > colonized (${colonizedDown})`,
    );
  }

  const flat = new Grid2D(12, 12, 1);
  const colonizedSoil = establishThenIsolate(flat, true, false);
  const bareSoil = establishThenIsolate(flat, false, false);
  colonizedSoil.water.fill(0.4);
  bareSoil.water.fill(0.4);
  colonizedSoil.infiltrationLedger = 0;
  bareSoil.infiltrationLedger = 0;
  colonizedSoil.runSoilWaterStep(1);
  bareSoil.runSoilWaterStep(1);
  const colonizedInfil = colonizedSoil.infiltrationLedger;
  const bareInfil = bareSoil.infiltrationLedger;
  if (!(colonizedInfil > bareInfil)) {
    throw new Error(
      `living-hollow: expected colonized infil (${colonizedInfil}) > bare (${bareInfil})`,
    );
  }

  let bounded = 1;
  for (let i = 0; i < colonizedFlux.herbBiomass.data.length; i++) {
    const v = colonizedFlux.herbBiomass.data[i]!;
    if (!Number.isFinite(v) || v < 0 || v > config.herbBiomassMax + 1e-6) {
      bounded = 0;
      break;
    }
  }

  const coverHeld =
    Number(colonizedFluxRec.cover) === 0 && Number(bareFluxRec.cover) === 0
      ? 1
      : 0;

  return {
    scenario: "living-hollow",
    records: [
      {
        label: "colonized",
        ...colonizedFluxRec,
        infiltrated: colonizedInfil,
      },
      {
        label: "bare",
        ...bareFluxRec,
        infiltrated: bareInfil,
      },
      {
        label: "delta",
        biomassDelta: colonizedBiomass - bareBiomass,
        downslopeDelta: bareDown - colonizedDown,
        infilDelta: colonizedInfil - bareInfil,
        hashMatch,
        bounded,
        coverHeld,
        earned:
          colonizedBiomass > 0.1 &&
          bareBiomass === 0 &&
          bareDown > colonizedDown &&
          colonizedInfil > bareInfil
            ? 1
            : 0,
      },
    ],
  };
}

/**
 * Slice 14 / G-002 — paired meeting vs failing preserve under one authored
 * criterion window. Evaluator is observer-only (T-006); G-007 shapes stored.
 */
/**
 * Slice 16 / C-015 — island drains to ocean; mass closes; shoreline + habitats readable.
 * Opt-in seaLevel only — does not touch legacy golden hashes.
 */
export function probeIslandDrainage(): ProbeResult {
  const size = 48;
  const sea = DEFAULT_SEA_LEVEL_METERS;
  const seed = 29;

  const run = (seaLevel: number) => {
    const world = new WorldState(generateIsland(size, size, 10, seed), {
      seaLevel,
    });
    const t0 = performance.now();
    for (let d = 0; d < 4; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.addRain(config.rainDepthPerEvent * 2);
        world.stepEvent();
      }
    }
    const stepMsMean = (performance.now() - t0) / (4 * config.dailyEventSteps);
    const relResidual =
      Math.abs(world.waterBalanceResidual()) /
      Math.max(1, world.precipitationLedger);
    const shore = world.shorelineCellCount();
    const ocean = world.oceanCellCount();
    const land = size * size - ocean;
    // Habitat zones proxy: wet hollow (high moisture land) vs dry ridge vs shore band.
    let wetLand = 0;
    let dryLand = 0;
    for (let i = 0; i < world.soilMoisture.data.length; i++) {
      if (world.oceanCells.has(i)) continue;
      const m = world.soilMoisture.data[i]!;
      if (m > 0.2) wetLand++;
      else dryLand++;
    }
    const habitatZones =
      (ocean > 0 ? 1 : 0) + (shore > 0 ? 1 : 0) + (wetLand > 0 ? 1 : 0) + (dryLand > 0 ? 1 : 0);
    return {
      hash: world.stateHash(),
      precip: world.precipitationLedger,
      oceanExchange: world.oceanExchangeLedger,
      massResidual: world.waterBalanceResidual(),
      relResidual,
      oceanCells: ocean,
      shorelineCells: shore,
      landCells: land,
      habitatZones,
      stepMsMean,
      shoreFrac: shorelineEncodingDelta(size, size, world.terrain.data, seaLevel),
    };
  };

  const midA = run(sea);
  const midB = run(sea);
  const high = run(3.5);

  if (midA.hash !== midB.hash) {
    throw new Error(
      `island-drainage: replay hash mismatch (T-001) ${midA.hash} vs ${midB.hash}`,
    );
  }
  if (!(midA.oceanExchange > 0)) {
    throw new Error("island-drainage: expected positive ocean exchange");
  }
  if (midA.relResidual >= 1e-4) {
    throw new Error(
      `island-drainage: H-004 residual too large (rel=${midA.relResidual})`,
    );
  }
  if (!(high.oceanCells > midA.oceanCells)) {
    throw new Error("island-drainage: higher sea should flood more cells");
  }
  if (midA.habitatZones < 3) {
    throw new Error(
      `island-drainage: expected ≥3 habitat zones (got ${midA.habitatZones})`,
    );
  }

  // Optional larger grid timing sample (document, do not fail gate on wall clock).
  const big = new WorldState(generateIsland(64, 64, 10, seed), { seaLevel: sea });
  const tBig = performance.now();
  for (let i = 0; i < 24; i++) {
    big.addRain(config.rainDepthPerEvent);
    big.stepEvent();
  }
  const stepMs64 = (performance.now() - tBig) / 24;

  return {
    scenario: "island-drainage",
    records: [
      {
        label: "mid",
        oceanExchange: midA.oceanExchange,
        precip: midA.precip,
        massResidual: midA.massResidual,
        relResidual: midA.relResidual,
        oceanCells: midA.oceanCells,
        shorelineCells: midA.shorelineCells,
        habitatZones: midA.habitatZones,
        shoreFrac: midA.shoreFrac,
        stepMsMean: midA.stepMsMean,
        replayMatch: 1,
        hashN: Number.parseInt(midA.hash.slice(0, 8), 16),
      },
      {
        label: "high",
        oceanCells: high.oceanCells,
        shorelineCells: high.shorelineCells,
        oceanExchange: high.oceanExchange,
      },
      {
        label: "delta",
        oceanCellDelta: high.oceanCells - midA.oceanCells,
        conserved: midA.relResidual < 1e-4 ? 1 : 0,
        habitatMosaic: midA.habitatZones >= 3 ? 1 : 0,
        stepMs64,
      },
    ],
  };
}

/**
 * Slice 17 / C-016 — MHW/MLW envelope grows intertidal monotonically;
 * same envelope → identical hash; no per-event tidal phase. Sea hydrology unchanged.
 */
export function probeTidalEnvelope(): ProbeResult {
  const size = 48;
  const sea = DEFAULT_SEA_LEVEL_METERS;
  const seed = 31;

  const run = (amplitude: number) => {
    const world = new WorldState(generateIsland(size, size, 10, seed), {
      seaLevel: sea,
      tidalAmplitude: amplitude,
    });
    const before = world.intertidalCellCount();
    for (let i = 0; i < 8; i++) world.stepEvent();
    if (world.intertidalCellCount() !== before) {
      throw new Error("tidal-envelope: intertidal changed across stepEvent (phase leak)");
    }
    const mhw = world.meanHighWater!;
    const mlw = world.meanLowWater!;
    return {
      hash: world.stateHash(),
      intertidalCells: before,
      mhw,
      mlw,
      amplitude,
      foreshoreFrac: foreshoreEncodingFrac(world.terrain.data, sea, mhw),
      oceanCells: world.oceanCellCount(),
      encodingDelta: intertidalEncodingDelta(config.soilPorosity),
    };
  };

  const off = run(0);
  const neap = run(tideById("neap").amplitudeMeters);
  const mean = run(tideById("mean").amplitudeMeters);
  const spring = run(tideById("spring").amplitudeMeters);
  const meanB = run(tideById("mean").amplitudeMeters);

  if (mean.hash !== meanB.hash) {
    throw new Error(
      `tidal-envelope: replay hash mismatch (T-001) ${mean.hash} vs ${meanB.hash}`,
    );
  }
  if (off.intertidalCells !== 0) {
    throw new Error(
      `tidal-envelope: tide off should have 0 intertidal (got ${off.intertidalCells})`,
    );
  }
  if (!(neap.intertidalCells < mean.intertidalCells)) {
    throw new Error(
      `tidal-envelope: neap (${neap.intertidalCells}) should be < mean (${mean.intertidalCells})`,
    );
  }
  if (!(mean.intertidalCells < spring.intertidalCells)) {
    throw new Error(
      `tidal-envelope: mean (${mean.intertidalCells}) should be < spring (${spring.intertidalCells})`,
    );
  }
  if (!(spring.foreshoreFrac > neap.foreshoreFrac)) {
    throw new Error("tidal-envelope: foreshore fraction should grow with amplitude");
  }
  if (!(spring.encodingDelta > 0.08)) {
    throw new Error(
      `tidal-envelope: Tier-P intertidal tint too weak (${spring.encodingDelta})`,
    );
  }
  // Ocean outlet unchanged by tide envelope (C-015).
  if (off.oceanCells !== spring.oceanCells) {
    throw new Error("tidal-envelope: tide must not change ocean cell count");
  }

  return {
    scenario: "tidal-envelope",
    records: [
      {
        label: "off",
        intertidalCells: off.intertidalCells,
        oceanCells: off.oceanCells,
      },
      {
        label: "neap",
        intertidalCells: neap.intertidalCells,
        foreshoreFrac: neap.foreshoreFrac,
        mhw: neap.mhw,
        mlw: neap.mlw,
      },
      {
        label: "mean",
        intertidalCells: mean.intertidalCells,
        foreshoreFrac: mean.foreshoreFrac,
        replayMatch: 1,
        hashN: Number.parseInt(mean.hash.slice(0, 8), 16),
        encodingDelta: mean.encodingDelta,
      },
      {
        label: "spring",
        intertidalCells: spring.intertidalCells,
        foreshoreFrac: spring.foreshoreFrac,
        mhw: spring.mhw,
        mlw: spring.mlw,
      },
      {
        label: "delta",
        neapToMean: mean.intertidalCells - neap.intertidalCells,
        meanToSpring: spring.intertidalCells - mean.intertidalCells,
        foreshoreGrew: spring.foreshoreFrac > neap.foreshoreFrac ? 1 : 0,
        oceanUnchanged: off.oceanCells === spring.oceanCells ? 1 : 0,
        encodingFloor: mean.encodingDelta > 0.08 ? 1 : 0,
      },
    ],
  };
}

/**
 * Slice 18 / C-017 — fetch × wind exposure; coastal retreat inside geomorphology
 * only (no SWE / no second sediment writer). Windward vs leeward diverge.
 */
export function probeShoreExposure(): ProbeResult {
  const size = 40;
  const sea = DEFAULT_SEA_LEVEL_METERS;
  const seed = 19;
  const bands = 12;

  const run = (windId: WindId) => {
    const wind = windById(windId);
    const world = new WorldState(generateIsland(size, size, 10, seed), {
      seaLevel: sea,
      windUx: wind.ux,
      windUz: wind.uz,
    });
    world.soilDepth.fill(1.2);
    world.vegCover.fill(0);
    const elev0 = world.terrain.data.slice();
    const depth0 = world.soilDepth.data.slice();
    const mid = (size / 2) | 0;
    const westShore: number[] = [];
    const eastShore: number[] = [];
    for (let i = 0; i < elev0.length; i++) {
      if (world.oceanCells.has(i)) continue;
      const x = i % size;
      const z = (i / size) | 0;
      const nbs = [
        z > 0 ? i - size : -1,
        z < size - 1 ? i + size : -1,
        x > 0 ? i - 1 : -1,
        x < size - 1 ? i + 1 : -1,
      ];
      if (!nbs.some((ni) => ni >= 0 && world.oceanCells.has(ni))) continue;
      if (x < mid) westShore.push(i);
      else eastShore.push(i);
    }
    const meanExpWest = meanExposure(world.shoreExposure.data, (i) =>
      westShore.includes(i),
    );
    const meanExpEast = meanExposure(world.shoreExposure.data, (i) =>
      eastShore.includes(i),
    );
    for (let n = 0; n < bands; n++) world.runGeomorphologyStep(1);
    const meanLoss = (cells: number[]) => {
      if (cells.length === 0) return 0;
      let s = 0;
      for (const i of cells) s += elev0[i]! - world.terrain.data[i]!;
      return s / cells.length;
    };
    let bedrockOk = 1;
    for (let i = 0; i < elev0.length; i++) {
      if (elev0[i]! < sea) continue;
      const dElev = elev0[i]! - world.terrain.data[i]!;
      const dDepth = depth0[i]! - world.soilDepth.data[i]!;
      // f32 elev/depth over many bands drifts a few ULPs past 1e-6.
      if (Math.abs(dElev - dDepth) > 1e-5) bedrockOk = 0;
    }
    return {
      hash: world.stateHash(),
      westLoss: meanLoss(westShore),
      eastLoss: meanLoss(eastShore),
      meanExpWest,
      meanExpEast,
      shoreErosion: world.shoreErosionLedger,
      bedrockOk,
    };
  };

  const west = run("west");
  const east = run("east");
  const westB = run("west");

  if (west.hash !== westB.hash) {
    throw new Error(
      `shore-exposure: replay hash mismatch (T-001) ${west.hash} vs ${westB.hash}`,
    );
  }
  if (west.hash === east.hash) {
    throw new Error("shore-exposure: opposite winds produced identical hashes");
  }
  if (!(west.westLoss > west.eastLoss)) {
    throw new Error(
      `shore-exposure: west wind should cut west shore more (W=${west.westLoss} E=${west.eastLoss})`,
    );
  }
  if (!(east.eastLoss > east.westLoss)) {
    throw new Error(
      `shore-exposure: east wind should cut east shore more (W=${east.westLoss} E=${east.eastLoss})`,
    );
  }
  if (!(west.meanExpWest > west.meanExpEast)) {
    throw new Error("shore-exposure: west wind should expose west shore more");
  }
  if (west.bedrockOk !== 1) {
    throw new Error("shore-exposure: bedrock invariant failed (Δelev ≠ Δdepth)");
  }
  if (!(west.shoreErosion > 0)) {
    throw new Error("shore-exposure: expected positive shore erosion ledger");
  }

  return {
    scenario: "shore-exposure",
    records: [
      {
        label: "west",
        westLoss: west.westLoss,
        eastLoss: west.eastLoss,
        meanExpWest: west.meanExpWest,
        meanExpEast: west.meanExpEast,
        shoreErosion: west.shoreErosion,
        bedrockOk: west.bedrockOk,
        replayMatch: 1,
        hashN: Number.parseInt(west.hash.slice(0, 8), 16),
      },
      {
        label: "east",
        westLoss: east.westLoss,
        eastLoss: east.eastLoss,
        meanExpWest: east.meanExpWest,
        meanExpEast: east.meanExpEast,
        shoreErosion: east.shoreErosion,
        hashN: Number.parseInt(east.hash.slice(0, 8), 16),
      },
      {
        label: "delta",
        hashDiverged: west.hash !== east.hash ? 1 : 0,
        westWindwardBias: west.westLoss - west.eastLoss,
        eastWindwardBias: east.eastLoss - east.westLoss,
        bedrockClosed: west.bedrockOk,
        noSwe: 1,
      },
    ],
  };
}

/**
 * Slice 19 / C-017 — longshore lee deposit: windward scours, lee receives
 * under one wind; mass closes via bedrock + ocean ledger. No SWE / no second writer.
 */
export function probeLongshoreDrift(): ProbeResult {
  const size = 40;
  const sea = DEFAULT_SEA_LEVEL_METERS;
  const seed = 19;
  const bands = 12;

  const run = (windId: WindId) => {
    const wind = windById(windId);
    const world = new WorldState(generateIsland(size, size, 10, seed), {
      seaLevel: sea,
      windUx: wind.ux,
      windUz: wind.uz,
    });
    world.soilDepth.fill(1.2);
    world.vegCover.fill(0);
    const elev0 = world.terrain.data.slice();
    const depth0 = world.soilDepth.data.slice();
    const mid = (size / 2) | 0;
    const westShore: number[] = [];
    const eastShore: number[] = [];
    for (let i = 0; i < elev0.length; i++) {
      if (world.oceanCells.has(i)) continue;
      const x = i % size;
      const z = (i / size) | 0;
      const nbs = [
        z > 0 ? i - size : -1,
        z < size - 1 ? i + size : -1,
        x > 0 ? i - 1 : -1,
        x < size - 1 ? i + 1 : -1,
      ];
      if (!nbs.some((ni) => ni >= 0 && world.oceanCells.has(ni))) continue;
      if (x < mid) westShore.push(i);
      else eastShore.push(i);
    }
    for (let n = 0; n < bands; n++) world.runGeomorphologyStep(1);
    const meanDelta = (cells: number[]) => {
      if (cells.length === 0) return 0;
      let s = 0;
      for (const i of cells) s += world.terrain.data[i]! - elev0[i]!;
      return s / cells.length;
    };
    let bedrockOk = 1;
    let soil0 = 0;
    let soil1 = 0;
    for (let i = 0; i < elev0.length; i++) {
      if (elev0[i]! < sea) continue;
      soil0 += depth0[i]!;
      soil1 += world.soilDepth.data[i]!;
      const dElev = world.terrain.data[i]! - elev0[i]!;
      const dDepth = world.soilDepth.data[i]! - depth0[i]!;
      // f32 elev/depth over many bands drifts a few ULPs past 1e-6.
      if (Math.abs(dElev - dDepth) > 1e-5) bedrockOk = 0;
    }
    return {
      hash: world.stateHash(),
      westDelta: meanDelta(westShore),
      eastDelta: meanDelta(eastShore),
      shoreErosion: world.shoreErosionLedger,
      bedrockOk,
      soilDelta: soil1 - soil0,
    };
  };

  const west = run("west");
  const east = run("east");
  const calm = run("calm");
  const westB = run("west");

  if (west.hash !== westB.hash) {
    throw new Error(
      `longshore-drift: replay hash mismatch (T-001) ${west.hash} vs ${westB.hash}`,
    );
  }
  if (west.hash === east.hash) {
    throw new Error("longshore-drift: opposite winds produced identical hashes");
  }
  if (!(west.westDelta < calm.westDelta)) {
    throw new Error(
      `longshore-drift: west wind should scour west vs calm (W=${west.westDelta} calm=${calm.westDelta})`,
    );
  }
  if (!(west.eastDelta > calm.eastDelta)) {
    throw new Error(
      `longshore-drift: west wind should feed east vs calm (E=${west.eastDelta} calm=${calm.eastDelta})`,
    );
  }
  if (!(east.westDelta > calm.westDelta)) {
    throw new Error(
      `longshore-drift: east wind should feed west vs calm (W=${east.westDelta} calm=${calm.westDelta})`,
    );
  }
  if (west.bedrockOk !== 1) {
    throw new Error("longshore-drift: bedrock invariant failed (Δelev ≠ Δdepth)");
  }
  if (!(west.shoreErosion > 0)) {
    throw new Error("longshore-drift: expected positive ocean share in shore ledger");
  }

  return {
    scenario: "longshore-drift",
    records: [
      {
        label: "west",
        westDelta: west.westDelta,
        eastDelta: west.eastDelta,
        shoreErosion: west.shoreErosion,
        bedrockOk: west.bedrockOk,
        soilDelta: west.soilDelta,
        replayMatch: 1,
        hashN: Number.parseInt(west.hash.slice(0, 8), 16),
      },
      {
        label: "east",
        westDelta: east.westDelta,
        eastDelta: east.eastDelta,
        shoreErosion: east.shoreErosion,
        hashN: Number.parseInt(east.hash.slice(0, 8), 16),
      },
      {
        label: "calm",
        westDelta: calm.westDelta,
        eastDelta: calm.eastDelta,
        shoreErosion: calm.shoreErosion,
      },
      {
        label: "delta",
        hashDiverged: west.hash !== east.hash ? 1 : 0,
        westLeeGain: west.eastDelta - calm.eastDelta,
        eastLeeGain: east.westDelta - calm.westDelta,
        westWindwardLoss: calm.westDelta - west.westDelta,
        bedrockClosed: west.bedrockOk,
        noSwe: 1,
      },
    ],
  };
}

/**
 * Slice F / C-020 lite — climate-mean rain + opposite winds → divergent
 * wet/dry sides; mean precip tracks regime; mass closes. No cell targeting.
 */
export function probeOrographicWind(): ProbeResult {
  const w = 40;
  const h = 24;
  const seedPeak = 12;
  const regime = rainRegimeById("moderate");
  // Real-scale means need more than one cartoon day for wet/dry sides to encode.
  const days = regime.cycleDays * 3;
  const base = rainDepthForRegime(
    regime,
    config.rainDepthPerEvent,
    config.dailyEventSteps,
  );
  const depths = new Float32Array(w * h);

  const ridge = () => {
    const g = new Grid2D(w, h);
    const mid = (w - 1) * 0.5;
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        g.set(
          x,
          z,
          Math.max(0.5, seedPeak - Math.abs(x - mid) * (seedPeak / mid)),
        );
      }
    }
    return g;
  };

  const run = (windId: WindId) => {
    const world = new WorldState(ridge(), { closedBoundary: true });
    const wind = windById(windId);
    for (let d = 0; d < days; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        if (
          base > 0 &&
          regimeRainsThisEvent(regime, i, config.dailyEventSteps, d)
        ) {
          fillOrographicRainDepths(
            depths,
            world.terrain.data,
            w,
            h,
            base,
            wind,
            config.orographicGamma,
            () => false,
          );
          world.addRainField(depths);
        }
        world.stepEvent();
      }
    }
    let leftSoil = 0;
    let rightSoil = 0;
    let nL = 0;
    let nR = 0;
    const half = (w / 2) | 0;
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        const idx = z * w + x;
        const m = world.soilMoisture.data[idx]!;
        if (x < half) {
          leftSoil += m;
          nL++;
        } else {
          rightSoil += m;
          nR++;
        }
      }
    }
    const leftMean = leftSoil / Math.max(1, nL);
    const rightMean = rightSoil / Math.max(1, nR);
    const relResidual =
      Math.abs(world.waterBalanceResidual()) /
      Math.max(1, world.precipitationLedger);
    return {
      hash: world.stateHash(),
      precip: world.precipitationLedger,
      relResidual,
      leftMean,
      rightMean,
      sideEncoding: Math.abs(
        soilEncodingDelta(leftMean, rightMean, config.soilPorosity),
      ),
    };
  };

  const westA = run("west");
  const westB = run("west");
  const east = run("east");
  const calm = run("calm");

  if (westA.hash !== westB.hash) {
    throw new Error(
      `orographic-wind: same wind must match (T-001) ${westA.hash} vs ${westB.hash}`,
    );
  }
  if (westA.hash === east.hash) {
    throw new Error(
      "orographic-wind: opposite winds produced identical hashes",
    );
  }
  if (westA.relResidual >= 1e-4) {
    throw new Error(
      `orographic-wind: H-004 residual too large (rel=${westA.relResidual})`,
    );
  }
  const precipRatio = westA.precip / Math.max(1e-9, calm.precip);
  if (precipRatio < 0.85 || precipRatio > 1.15) {
    throw new Error(
      `orographic-wind: precip should track climate mean (west/calm=${precipRatio})`,
    );
  }
  if (!(westA.leftMean > westA.rightMean)) {
    throw new Error(
      `orographic-wind: west wind should wet west face (L=${westA.leftMean} R=${westA.rightMean})`,
    );
  }
  const encoding = Math.max(westA.sideEncoding, east.sideEncoding);
  if (encoding < 0.05) {
    throw new Error(
      `orographic-wind: wet/dry side soil encoding too weak (${encoding})`,
    );
  }

  return {
    scenario: "orographic-wind",
    records: [
      {
        label: "west",
        precip: westA.precip,
        relResidual: westA.relResidual,
        sideEncoding: westA.sideEncoding,
        replayMatch: 1,
        hashN: Number.parseInt(westA.hash.slice(0, 8), 16),
      },
      {
        label: "east",
        precip: east.precip,
        sideEncoding: east.sideEncoding,
        hashN: Number.parseInt(east.hash.slice(0, 8), 16),
      },
      {
        label: "delta",
        hashDiverged: westA.hash !== east.hash ? 1 : 0,
        precipRatio,
        conserved: westA.relResidual < 1e-4 ? 1 : 0,
        encodingFloor: encoding >= 0.05 ? 1 : 0,
        calmPrecip: calm.precip,
      },
    ],
  };
}

export function probeScenarioWindow(): ProbeResult {
  const def = livingHollowObjective({
    threshold: 0.5,
    lengthDays: 3,
    entryDays: 1,
    exitDays: 2,
  });

  const runTwin = (biomass: number) => {
    const world = new WorldState(new Grid2D(8, 8, 1));
    world.herbBiomass.fill(biomass);
    const hashBefore = world.stateHash();
    const session = new ScenarioSession(def);
    const reader = criterionReaderFromWorld(world);
    for (let day = 1; day <= 5; day++) {
      const t = day * config.dailyEventSteps * config.eventDtMinutes;
      session.sampleNow({ ...reader, simMinutes: t });
    }
    const hashAfter = world.stateHash();
    const o = session.outcome();
    return {
      worldHashMatch: hashBefore === hashAfter ? 1 : 0,
      satisfied: o.currentlySatisfied ? 1 : 0,
      achieved: o.achievedAtSimMinutes !== null ? 1 : 0,
      achievedAt: o.achievedAtSimMinutes ?? -1,
      rollingMet: o.rollingMet ? 1 : 0,
      samples: o.samplesTaken,
      outcomeHash: session.outcomeHash(),
    };
  };

  const meetA = runTwin(2);
  const meetB = runTwin(2);
  const fail = runTwin(0);

  if (meetA.outcomeHash !== meetB.outcomeHash) {
    throw new Error("scenario-window: replay outcome hash mismatch");
  }
  if (!(meetA.satisfied === 1 && meetA.achieved === 1)) {
    throw new Error("scenario-window: meet twin should satisfy window");
  }
  if (!(fail.satisfied === 0 && fail.achieved === 0)) {
    throw new Error("scenario-window: fail twin should not satisfy");
  }
  if (meetA.worldHashMatch !== 1 || fail.worldHashMatch !== 1) {
    throw new Error("scenario-window: evaluator mutated WorldState");
  }

  // Encode outcome hash as stable numeric for baseline (djb2 over chars).
  let hashNum = 5381;
  for (let i = 0; i < meetA.outcomeHash.length; i++) {
    hashNum = ((hashNum << 5) + hashNum + meetA.outcomeHash.charCodeAt(i)) | 0;
  }

  return {
    scenario: "scenario-window",
    records: [
      {
        label: "meet",
        satisfied: meetA.satisfied,
        achieved: meetA.achieved,
        achievedAt: meetA.achievedAt,
        rollingMet: meetA.rollingMet,
        samples: meetA.samples,
        worldHashMatch: meetA.worldHashMatch,
      },
      {
        label: "fail",
        satisfied: fail.satisfied,
        achieved: fail.achieved,
        achievedAt: fail.achievedAt,
        rollingMet: fail.rollingMet,
        samples: fail.samples,
        worldHashMatch: fail.worldHashMatch,
      },
      {
        label: "delta",
        hashMatch: meetA.outcomeHash === meetB.outcomeHash ? 1 : 0,
        pairedDiverge: meetA.outcomeHash !== fail.outcomeHash ? 1 : 0,
        writeIsolated:
          meetA.worldHashMatch === 1 && fail.worldHashMatch === 1 ? 1 : 0,
        outcomeHashNum: hashNum,
      },
    ],
  };
}

function meanGrid(data: Float32Array): number {
  return sumGrid(data) / data.length;
}

function sumGrid(data: Float32Array): number {
  let s = 0;
  for (let i = 0; i < data.length; i++) s += data[i]!;
  return s;
}

function sectorMean(
  data: Float32Array,
  stride: number,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
): number {
  let sum = 0;
  let n = 0;
  for (let z = z0; z < z1; z++) {
    for (let x = x0; x < x1; x++) {
      sum += data[z * stride + x]!;
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

/**
 * Slice 20 / C-018 — paired freshened vs salty hollow under one seed schedule.
 * Salty twin is salt-limited and earns less herb biomass; water residual
 * stays finite (no separate salt ledger). Save-legacy covered in unit tests.
 */
export function probeSalinityArrival(): ProbeResult {
  const w = 16;
  const h = 16;
  const sx = 1;
  const sz = 8;

  const make = (salinity: number) => {
    const world = new WorldState(new Grid2D(w, h, 2.5));
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(salinity);
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    return world;
  };

  const freshA = make(0);
  const freshB = make(0);
  const salty = make(0.85);

  const replayMatch =
    freshA.stateHash() === freshB.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("salinity-arrival: freshened replay hash mismatch");
  }

  const freshHsi = freshA.getHabitatSuitability(sx, sz);
  const saltyHsi = salty.getHabitatSuitability(sx, sz);
  const freshBiomass = freshA.getHerbBiomass(sx, sz);
  const saltyBiomass = salty.getHerbBiomass(sx, sz);
  const freshLim = freshA.getLimitingFactor(sx, sz);
  const saltyLim = salty.getLimitingFactor(sx, sz);
  const biomassDelta = freshBiomass - saltyBiomass;
  // Residual class: salinity must not invent a salt mass term — twins match.
  const residualFresh = freshA.waterBalanceResidual();
  const residualSalty = salty.waterBalanceResidual();
  const residualMatch =
    Math.abs(residualFresh - residualSalty) < 1e-9 ? 1 : 0;

  if (!(freshHsi > saltyHsi)) {
    throw new Error(
      `salinity-arrival: expected fresh HSI (${freshHsi}) > salty (${saltyHsi})`,
    );
  }
  if (saltyLim !== LIMITING_SALINITY) {
    throw new Error(
      `salinity-arrival: expected salty limiting=salinity (got ${saltyLim})`,
    );
  }
  if (!(freshBiomass > 0.1)) {
    throw new Error(
      `salinity-arrival: freshened biomass too low (${freshBiomass})`,
    );
  }
  if (!(biomassDelta > 0.05)) {
    throw new Error(
      `salinity-arrival: biomass delta too small (${biomassDelta})`,
    );
  }
  if (residualMatch !== 1) {
    throw new Error(
      `salinity-arrival: residual diverged fresh=${residualFresh} salty=${residualSalty}`,
    );
  }

  return {
    scenario: "salinity-arrival",
    records: [
      {
        label: "freshened",
        hsi: freshHsi,
        biomass: freshBiomass,
        limiting: freshLim,
        salinity: 0,
      },
      {
        label: "salty",
        hsi: saltyHsi,
        biomass: saltyBiomass,
        limiting: saltyLim,
        salinity: 0.85,
        saltLimited: saltyLim === LIMITING_SALINITY ? 1 : 0,
      },
      {
        label: "delta",
        biomassDelta,
        hsiDelta: freshHsi - saltyHsi,
        replayMatch,
        residualMatch,
        hashN: Number.parseInt(freshA.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * C-004 / C-020 — Heat dial gates herb arrival.
 * Warm twin earns; cold twin is temperature-limited under one seed schedule.
 */
export function probeHeatArrival(): ProbeResult {
  const w = 16;
  const h = 16;
  const sx = 1;
  const sz = 8;

  const make = (heatId: "warm" | "mild" | "cold") => {
    const world = new WorldState(new Grid2D(w, h, 2.5));
    world.setAirTemperature(heatById(heatId).airTempC);
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    return world;
  };

  const warmA = make("warm");
  const warmB = make("warm");
  const cold = make("cold");
  const mild = make("mild");

  const replayMatch =
    warmA.stateHash() === warmB.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("heat-arrival: warm replay hash mismatch");
  }

  const warmHsi = warmA.getHabitatSuitability(sx, sz);
  const coldHsi = cold.getHabitatSuitability(sx, sz);
  const mildHsi = mild.getHabitatSuitability(sx, sz);
  const warmBiomass = warmA.getHerbBiomass(sx, sz);
  const coldBiomass = cold.getHerbBiomass(sx, sz);
  const mildBiomass = mild.getHerbBiomass(sx, sz);
  const coldLim = cold.getLimitingFactor(sx, sz);
  const biomassDelta = warmBiomass - coldBiomass;

  if (!(warmHsi > coldHsi)) {
    throw new Error(
      `heat-arrival: expected warm HSI (${warmHsi}) > cold (${coldHsi})`,
    );
  }
  if (coldLim !== LIMITING_TEMPERATURE) {
    throw new Error(
      `heat-arrival: expected cold limiting=temperature (got ${coldLim})`,
    );
  }
  if (!(warmBiomass > 0.1)) {
    throw new Error(
      `heat-arrival: warm biomass too low (${warmBiomass})`,
    );
  }
  if (!(biomassDelta > 0.05)) {
    throw new Error(
      `heat-arrival: biomass delta too small (${biomassDelta})`,
    );
  }
  if (!(mildHsi > coldHsi && mildHsi < warmHsi + 1e-9)) {
    throw new Error(
      `heat-arrival: mild HSI (${mildHsi}) not between cold and warm`,
    );
  }

  return {
    scenario: "heat-arrival",
    records: [
      {
        label: "warm",
        hsi: warmHsi,
        biomass: warmBiomass,
        limiting: warmA.getLimitingFactor(sx, sz),
        airTempC: heatById("warm").airTempC,
      },
      {
        label: "mild",
        hsi: mildHsi,
        biomass: mildBiomass,
        limiting: mild.getLimitingFactor(sx, sz),
        airTempC: heatById("mild").airTempC,
      },
      {
        label: "cold",
        hsi: coldHsi,
        biomass: coldBiomass,
        limiting: coldLim,
        airTempC: heatById("cold").airTempC,
        tempLimited: coldLim === LIMITING_TEMPERATURE ? 1 : 0,
      },
      {
        label: "delta",
        biomassDelta,
        hsiDelta: warmHsi - coldHsi,
        mildBetween: mildHsi > coldHsi && mildHsi <= warmHsi + 1e-9 ? 1 : 0,
        replayMatch,
        hashN: Number.parseInt(warmA.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * C-017 — onshore spray stress gates herb arrival.
 * Windward (exposed) twin is spray-limited; lee twin earns under one seed
 * schedule and identical fresh soil. Strand holds on the exposed face.
 */
export function probeSprayArrival(): ProbeResult {
  const w = 16;
  const h = 16;
  const sx = 1;
  const sz = 8;

  const make = (exposure: number) => {
    const world = new WorldState(new Grid2D(w, h, 2.5));
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.shoreExposure.fill(0);
    world.shoreExposure.set(sx, sz, exposure);
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    return world;
  };

  const leeA = make(0);
  const leeB = make(0);
  // Mid-crest exposure: herb spray-limited, strand shore-hump at its peak (§4.46).
  const windward = make(0.5);

  const replayMatch = leeA.stateHash() === leeB.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("spray-arrival: lee replay hash mismatch");
  }

  const leeHsi = leeA.getHabitatSuitability(sx, sz);
  const windHsi = windward.getHabitatSuitability(sx, sz);
  const leeHerb = leeA.getHerbBiomass(sx, sz);
  const windHerb = windward.getHerbBiomass(sx, sz);
  const windStrand = windward.getStrandBiomass(sx, sz);
  const leeStrand = leeA.getStrandBiomass(sx, sz);
  const windLim = windward.getLimitingFactor(sx, sz);
  const herbDelta = leeHerb - windHerb;
  const saltMatch =
    Math.abs(
      leeA.soilSalinity.get(sx, sz) - windward.soilSalinity.get(sx, sz),
    ) < 1e-9
      ? 1
      : 0;

  if (saltMatch !== 1) {
    throw new Error("spray-arrival: salinity not matched (must isolate spray)");
  }
  if (!(leeHsi > windHsi)) {
    throw new Error(
      `spray-arrival: expected lee HSI (${leeHsi}) > windward (${windHsi})`,
    );
  }
  if (windLim !== LIMITING_SPRAY) {
    throw new Error(
      `spray-arrival: expected windward limiting=spray (got ${windLim})`,
    );
  }
  if (!(leeHerb > 0.1)) {
    throw new Error(`spray-arrival: lee herb too low (${leeHerb})`);
  }
  if (!(herbDelta > 0.05)) {
    throw new Error(`spray-arrival: herb delta too small (${herbDelta})`);
  }
  if (!(windStrand > 0.1)) {
    throw new Error(
      `spray-arrival: windward strand too low (${windStrand})`,
    );
  }
  if (leeStrand !== 0) {
    throw new Error(
      `spray-arrival: lee strand expected 0 (got ${leeStrand})`,
    );
  }

  return {
    scenario: "spray-arrival",
    records: [
      {
        label: "lee",
        hsi: leeHsi,
        herbBiomass: leeHerb,
        strandBiomass: leeStrand,
        exposure: 0,
        limiting: leeA.getLimitingFactor(sx, sz),
        salinity: 0,
      },
      {
        label: "windward",
        hsi: windHsi,
        herbBiomass: windHerb,
        strandBiomass: windStrand,
        exposure: 0.5,
        limiting: windLim,
        sprayLimited: windLim === LIMITING_SPRAY ? 1 : 0,
        salinity: 0,
      },
      {
        label: "delta",
        herbDelta,
        hsiDelta: leeHsi - windHsi,
        saltMatch,
        replayMatch,
        hashN: Number.parseInt(leeA.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * C-016 — tidal inundation gates upland herb arrival.
 * Tide-off twin earns; spring foreshore is inundation-limited. Salt and spray
 * matched at 0 so the twin isolates hydroperiod from C-018 / C-017.
 */
export function probeInundationArrival(): ProbeResult {
  const w = 16;
  const h = 16;
  const sx = 8;
  const sz = 8;
  const sea = DEFAULT_SEA_LEVEL_METERS;
  const elev = sea + 0.4;
  const springAmp = tideById("spring").amplitudeMeters;

  const make = (amplitude: number) => {
    const world = new WorldState(new Grid2D(w, h, elev), {
      seaLevel: sea,
      tidalAmplitude: amplitude,
    });
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.shoreExposure.fill(0);
    world.runHabitatStep(1);
    // Uniform seed schedule — isolate HSI from overseas shore bias (C-019).
    world.herbSeedBank.fill(config.seedSourceStrength);
    world.strandSeedBank.fill(config.seedSourceStrength);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    return world;
  };

  const dryA = make(0);
  const dryB = make(0);
  const wet = make(springAmp);

  const replayMatch = dryA.stateHash() === dryB.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("inundation-arrival: dry replay hash mismatch");
  }

  const dryHsi = dryA.getHabitatSuitability(sx, sz);
  const wetHsi = wet.getHabitatSuitability(sx, sz);
  const dryHerb = dryA.getHerbBiomass(sx, sz);
  const wetHerb = wet.getHerbBiomass(sx, sz);
  const wetLim = wet.getLimitingFactor(sx, sz);
  const herbDelta = dryHerb - wetHerb;
  const saltMatch =
    Math.abs(
      dryA.soilSalinity.get(sx, sz) - wet.soilSalinity.get(sx, sz),
    ) < 1e-9
      ? 1
      : 0;
  const sprayMatch =
    Math.abs(
      dryA.shoreExposure.get(sx, sz) - wet.shoreExposure.get(sx, sz),
    ) < 1e-9
      ? 1
      : 0;

  if (saltMatch !== 1) {
    throw new Error(
      "inundation-arrival: salinity not matched (must isolate inundation)",
    );
  }
  if (sprayMatch !== 1) {
    throw new Error(
      "inundation-arrival: spray/exposure not matched (must isolate inundation)",
    );
  }
  if (!(dryHsi > wetHsi)) {
    throw new Error(
      `inundation-arrival: expected dry HSI (${dryHsi}) > wet (${wetHsi})`,
    );
  }
  if (wetLim !== LIMITING_INUNDATION) {
    throw new Error(
      `inundation-arrival: expected wet limiting=inundation (got ${wetLim})`,
    );
  }
  if (!(dryHerb > 0.1)) {
    throw new Error(`inundation-arrival: dry herb too low (${dryHerb})`);
  }
  if (!(herbDelta > 0.05)) {
    throw new Error(`inundation-arrival: herb delta too small (${herbDelta})`);
  }
  if (!wet.isIntertidal(sx, sz)) {
    throw new Error("inundation-arrival: spring foreshore should be intertidal");
  }
  if (dryA.isIntertidal(sx, sz)) {
    throw new Error("inundation-arrival: tide-off should not be intertidal");
  }

  return {
    scenario: "inundation-arrival",
    records: [
      {
        label: "dry",
        hsi: dryHsi,
        herbBiomass: dryHerb,
        amplitude: 0,
        intertidal: dryA.isIntertidal(sx, sz) ? 1 : 0,
        limiting: dryA.getLimitingFactor(sx, sz),
        salinity: 0,
        exposure: 0,
      },
      {
        label: "wet",
        hsi: wetHsi,
        herbBiomass: wetHerb,
        amplitude: springAmp,
        intertidal: wet.isIntertidal(sx, sz) ? 1 : 0,
        limiting: wetLim,
        inundationLimited: wetLim === LIMITING_INUNDATION ? 1 : 0,
        salinity: 0,
        exposure: 0,
      },
      {
        label: "delta",
        herbDelta,
        hsiDelta: dryHsi - wetHsi,
        saltMatch,
        sprayMatch,
        replayMatch,
        hashN: Number.parseInt(dryA.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * C-007 / C-011 — open-sky aspect light gates herb arrival.
 * South twin earns; steep north face is light-limited. Moisture matched so
 * the twin isolates insolation from dry-down (Beer–Lambert stays succession-only).
 */
export function probeLightArrival(): ProbeResult {
  const w = 16;
  const sx = 8;
  const sz = 8;
  const rise = 12;

  const planar = (risePerCell: number) => {
    const terrain = new Grid2D(w, w);
    const offset = Math.abs(risePerCell) * w;
    for (let z = 0; z < w; z++) {
      for (let x = 0; x < w; x++) {
        terrain.set(x, z, offset + z * risePerCell);
      }
    }
    return terrain;
  };

  const make = (risePerCell: number) => {
    const world = new WorldState(planar(risePerCell));
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.shoreExposure.fill(0);
    world.runHabitatStep(1);
    world.herbSeedBank.fill(config.seedSourceStrength);
    world.strandSeedBank.fill(config.seedSourceStrength);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    return world;
  };

  const southA = make(-rise);
  const southB = make(-rise);
  const north = make(rise);

  const replayMatch = southA.stateHash() === southB.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("light-arrival: south replay hash mismatch");
  }

  const southHsi = southA.getHabitatSuitability(sx, sz);
  const northHsi = north.getHabitatSuitability(sx, sz);
  const southHerb = southA.getHerbBiomass(sx, sz);
  const northHerb = north.getHerbBiomass(sx, sz);
  const northLim = north.getLimitingFactor(sx, sz);
  const herbDelta = southHerb - northHerb;
  const southI = terrainInsolation(southA.terrain.data, w, w, sx, sz);
  const northI = terrainInsolation(north.terrain.data, w, w, sx, sz);
  const moistureMatch =
    Math.abs(
      southA.soilMoisture.get(sx, sz) - north.soilMoisture.get(sx, sz),
    ) < 1e-9
      ? 1
      : 0;

  if (moistureMatch !== 1) {
    throw new Error(
      "light-arrival: moisture not matched (must isolate aspect light)",
    );
  }
  if (!(southI > northI)) {
    throw new Error(
      `light-arrival: expected south insolation (${southI}) > north (${northI})`,
    );
  }
  if (!(southHsi > northHsi)) {
    throw new Error(
      `light-arrival: expected south HSI (${southHsi}) > north (${northHsi})`,
    );
  }
  if (northLim !== LIMITING_LIGHT) {
    throw new Error(
      `light-arrival: expected north limiting=light (got ${northLim})`,
    );
  }
  if (!(southHerb > 0.1)) {
    throw new Error(`light-arrival: south herb too low (${southHerb})`);
  }
  if (!(herbDelta > 0.05)) {
    throw new Error(`light-arrival: herb delta too small (${herbDelta})`);
  }

  return {
    scenario: "light-arrival",
    records: [
      {
        label: "south",
        hsi: southHsi,
        herbBiomass: southHerb,
        insolation: southI,
        limiting: southA.getLimitingFactor(sx, sz),
        moisture: southA.soilMoisture.get(sx, sz),
      },
      {
        label: "north",
        hsi: northHsi,
        herbBiomass: northHerb,
        insolation: northI,
        limiting: northLim,
        lightLimited: northLim === LIMITING_LIGHT ? 1 : 0,
        moisture: north.soilMoisture.get(sx, sz),
      },
      {
        label: "delta",
        herbDelta,
        hsiDelta: southHsi - northHsi,
        insolationGap: southI - northI,
        moistureMatch,
        replayMatch,
        hashN: Number.parseInt(southA.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * C-018 / Slice N4 — strand vs inland herb under one seed schedule.
 * Salty exposed shore earns strand mats; fresh inland hollow earns herb.
 */
export function probeStrandArrival(): ProbeResult {
  const w = 16;
  const h = 16;
  const shoreX = 1;
  const shoreZ = 4;
  const inlandX = 1;
  const inlandZ = 12;

  const make = () => {
    const world = new WorldState(new Grid2D(w, h, 2.5));
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.shoreExposure.fill(0);
    world.shoreExposure.set(shoreX, shoreZ, 0.5);
    world.soilSalinity.set(shoreX, shoreZ, 0.85);
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    return world;
  };

  const a = make();
  const b = make();
  const replayMatch = a.stateHash() === b.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("strand-arrival: replay hash mismatch");
  }

  const shoreStrand = a.getStrandBiomass(shoreX, shoreZ);
  const shoreHerb = a.getHerbBiomass(shoreX, shoreZ);
  const inlandHerb = a.getHerbBiomass(inlandX, inlandZ);
  const inlandStrand = a.getStrandBiomass(inlandX, inlandZ);
  const seedMatch =
    Math.abs(
      a.getHerbSeedBank(shoreX, shoreZ) - a.getHerbSeedBank(inlandX, inlandZ),
    ) < 1e-9
      ? 1
      : 0;
  const guildSeedMatch =
    Math.abs(
      a.getStrandSeedBank(shoreX, shoreZ) - a.getHerbSeedBank(shoreX, shoreZ),
    ) < 1e-9
      ? 1
      : 0;
  const shoreGuildDelta = shoreStrand - shoreHerb;
  const inlandGuildDelta = inlandHerb - inlandStrand;

  if (seedMatch !== 1 || guildSeedMatch !== 1) {
    throw new Error("strand-arrival: seed schedule not matched");
  }
  if (!(shoreStrand > 0.1)) {
    throw new Error(`strand-arrival: shore strand too low (${shoreStrand})`);
  }
  if (!(shoreGuildDelta > 0.05)) {
    throw new Error(
      `strand-arrival: shore guild delta too small (${shoreGuildDelta})`,
    );
  }
  if (!(inlandHerb > 0.1)) {
    throw new Error(`strand-arrival: inland herb too low (${inlandHerb})`);
  }
  if (!(inlandGuildDelta > 0.05)) {
    throw new Error(
      `strand-arrival: inland guild delta too small (${inlandGuildDelta})`,
    );
  }
  if (inlandStrand !== 0) {
    throw new Error(
      `strand-arrival: inland strand expected 0 (got ${inlandStrand})`,
    );
  }
  if (a.getLimitingFactor(shoreX, shoreZ) !== LIMITING_SALINITY) {
    throw new Error("strand-arrival: shore herb not salinity-limited");
  }

  return {
    scenario: "strand-arrival",
    records: [
      {
        label: "shore",
        strandBiomass: shoreStrand,
        herbBiomass: shoreHerb,
        salinity: 0.85,
        exposure: 0.5,
        herbLimiting: a.getLimitingFactor(shoreX, shoreZ),
      },
      {
        label: "inland",
        strandBiomass: inlandStrand,
        herbBiomass: inlandHerb,
        salinity: 0,
        exposure: 0,
        herbLimiting: a.getLimitingFactor(inlandX, inlandZ),
      },
      {
        label: "delta",
        shoreGuildDelta,
        inlandGuildDelta,
        seedMatch,
        guildSeedMatch,
        replayMatch,
        hashN: Number.parseInt(a.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * C-009 / Slice N5 — sand-binder on dry crest vs herb in wet hollow.
 * One seed schedule; crest sand+exposure+dry earns binder; hollow earns herb.
 */
export function probeBinderArrival(): ProbeResult {
  const w = 16;
  const h = 16;
  const crestX = 1;
  const crestZ = 4;
  const hollowX = 1;
  const hollowZ = 12;

  const make = () => {
    const world = new WorldState(new Grid2D(w, h, 2.5));
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.shoreExposure.fill(0);
    world.shoreLongshore.fill(0);
    world.soilMaterial.fill(SUBSTRATE_LOAM);
    world.soilMaterial.set(crestX, crestZ, SUBSTRATE_SAND);
    world.soilMoisture.set(crestX, crestZ, 0);
    world.shoreExposure.set(crestX, crestZ, 0.5);
    // Moderate longshore convergence at the crest → burial arm at its peak.
    if (crestX > 0) world.shoreLongshore.set(crestX - 1, crestZ, config.binderBurialOptimum);
    if (crestX < w - 1) {
      world.shoreLongshore.set(crestX + 1, crestZ, -config.binderBurialOptimum);
    }
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    return world;
  };

  const a = make();
  const b = make();
  const replayMatch = a.stateHash() === b.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("binder-arrival: replay hash mismatch");
  }

  const crestBinder = a.getBinderBiomass(crestX, crestZ);
  const crestHerb = a.getHerbBiomass(crestX, crestZ);
  const hollowHerb = a.getHerbBiomass(hollowX, hollowZ);
  const hollowBinder = a.getBinderBiomass(hollowX, hollowZ);
  const seedMatch =
    Math.abs(
      a.getHerbSeedBank(crestX, crestZ) - a.getHerbSeedBank(hollowX, hollowZ),
    ) < 1e-9
      ? 1
      : 0;
  const guildSeedMatch =
    Math.abs(
      a.getBinderSeedBank(crestX, crestZ) - a.getHerbSeedBank(crestX, crestZ),
    ) < 1e-9
      ? 1
      : 0;
  const crestGuildDelta = crestBinder - crestHerb;
  const hollowGuildDelta = hollowHerb - hollowBinder;

  if (seedMatch !== 1 || guildSeedMatch !== 1) {
    throw new Error("binder-arrival: seed schedule not matched");
  }
  if (!(crestBinder > 0.1)) {
    throw new Error(`binder-arrival: crest binder too low (${crestBinder})`);
  }
  if (!(crestGuildDelta > 0.05)) {
    throw new Error(
      `binder-arrival: crest guild delta too small (${crestGuildDelta})`,
    );
  }
  if (!(hollowHerb > 0.1)) {
    throw new Error(`binder-arrival: hollow herb too low (${hollowHerb})`);
  }
  if (!(hollowGuildDelta > 0.05)) {
    throw new Error(
      `binder-arrival: hollow guild delta too small (${hollowGuildDelta})`,
    );
  }
  if (hollowBinder !== 0) {
    throw new Error(
      `binder-arrival: hollow binder expected 0 (got ${hollowBinder})`,
    );
  }

  return {
    scenario: "binder-arrival",
    records: [
      {
        label: "crest",
        binderBiomass: crestBinder,
        herbBiomass: crestHerb,
        moisture: a.getSoilMoisture(crestX, crestZ),
        exposure: 1,
        material: SUBSTRATE_SAND,
      },
      {
        label: "hollow",
        binderBiomass: hollowBinder,
        herbBiomass: hollowHerb,
        moisture: a.getSoilMoisture(hollowX, hollowZ),
        exposure: 0,
        material: SUBSTRATE_LOAM,
      },
      {
        label: "delta",
        crestGuildDelta,
        hollowGuildDelta,
        seedMatch,
        guildSeedMatch,
        replayMatch,
        hashN: Number.parseInt(a.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * C-016 / Slice N9 — salt-marsh engineer on mid-foreshore vs herb on dry terrace.
 * One seed schedule; mid-envelope hydroperiod earns marsh; terrace earns herb.
 */
export function probeMarshArrival(): ProbeResult {
  const sea = DEFAULT_SEA_LEVEL_METERS;
  const amp = tideById("spring").amplitudeMeters;
  const mhw = meanHighWater(sea, amp);
  const w = 16;
  const h = 16;
  const foreshoreX = 4;
  const foreshoreZ = 4;
  const terraceX = 12;
  const terraceZ = 12;

  const make = () => {
    const terrain = new Grid2D(w, h, mhw + 0.5);
    terrain.set(foreshoreX, foreshoreZ, sea);
    const world = new WorldState(terrain, {
      seaLevel: sea,
      tidalAmplitude: amp,
    });
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.shoreExposure.fill(0);
    world.runHabitatStep(1);
    // §4.48: marsh HSI is cached by dispersal (annual), not recomputed
    // inside establishment — populate the cache before looping establishment.
    world.runDispersalStep(1);
    world.herbSeedBank.fill(config.seedSourceStrength);
    world.strandSeedBank.fill(config.seedSourceStrength);
    world.binderSeedBank.fill(config.seedSourceStrength);
    world.marshSeedBank.fill(config.seedSourceStrength);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    return world;
  };

  const a = make();
  const b = make();
  const replayMatch = a.stateHash() === b.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("marsh-arrival: replay hash mismatch");
  }

  const foreshoreMarsh = a.getMarshBiomass(foreshoreX, foreshoreZ);
  const foreshoreHerb = a.getHerbBiomass(foreshoreX, foreshoreZ);
  const terraceHerb = a.getHerbBiomass(terraceX, terraceZ);
  const terraceMarsh = a.getMarshBiomass(terraceX, terraceZ);
  const seedMatch =
    Math.abs(
      a.getHerbSeedBank(foreshoreX, foreshoreZ) -
        a.getHerbSeedBank(terraceX, terraceZ),
    ) < 1e-9
      ? 1
      : 0;
  const guildSeedMatch =
    Math.abs(
      a.getMarshSeedBank(foreshoreX, foreshoreZ) -
        a.getHerbSeedBank(foreshoreX, foreshoreZ),
    ) < 1e-9
      ? 1
      : 0;
  const foreshoreGuildDelta = foreshoreMarsh - foreshoreHerb;
  const terraceGuildDelta = terraceHerb - terraceMarsh;
  const saltMatch =
    Math.abs(
      a.soilSalinity.get(foreshoreX, foreshoreZ) -
        a.soilSalinity.get(terraceX, terraceZ),
    ) < 1e-9
      ? 1
      : 0;
  const sprayMatch =
    Math.abs(
      a.shoreExposure.get(foreshoreX, foreshoreZ) -
        a.shoreExposure.get(terraceX, terraceZ),
    ) < 1e-9
      ? 1
      : 0;

  if (seedMatch !== 1 || guildSeedMatch !== 1) {
    throw new Error("marsh-arrival: seed schedule not matched");
  }
  if (saltMatch !== 1 || sprayMatch !== 1) {
    throw new Error("marsh-arrival: salt/spray not matched (must isolate inundation)");
  }
  if (!(foreshoreMarsh > 0.1)) {
    throw new Error(
      `marsh-arrival: foreshore marsh too low (${foreshoreMarsh})`,
    );
  }
  if (!(foreshoreGuildDelta > 0.05)) {
    throw new Error(
      `marsh-arrival: foreshore guild delta too small (${foreshoreGuildDelta})`,
    );
  }
  if (!(terraceHerb > 0.1)) {
    throw new Error(`marsh-arrival: terrace herb too low (${terraceHerb})`);
  }
  if (!(terraceGuildDelta > 0.05)) {
    throw new Error(
      `marsh-arrival: terrace guild delta too small (${terraceGuildDelta})`,
    );
  }
  if (terraceMarsh !== 0) {
    throw new Error(
      `marsh-arrival: terrace marsh expected 0 (got ${terraceMarsh})`,
    );
  }
  if (!a.isIntertidal(foreshoreX, foreshoreZ)) {
    throw new Error("marsh-arrival: foreshore should be intertidal");
  }
  if (a.isIntertidal(terraceX, terraceZ)) {
    throw new Error("marsh-arrival: terrace should not be intertidal");
  }

  return {
    scenario: "marsh-arrival",
    records: [
      {
        label: "foreshore",
        marshBiomass: foreshoreMarsh,
        herbBiomass: foreshoreHerb,
        intertidal: 1,
        elev: sea,
      },
      {
        label: "terrace",
        marshBiomass: terraceMarsh,
        herbBiomass: terraceHerb,
        intertidal: 0,
        elev: mhw + 0.5,
      },
      {
        label: "delta",
        foreshoreGuildDelta,
        terraceGuildDelta,
        seedMatch,
        guildSeedMatch,
        saltMatch,
        sprayMatch,
        replayMatch,
        hashN: Number.parseInt(a.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * Slice N10 — climate-capped woody shrub.
 * Warm inland with herb cover escalates; cold / mild / bare stay empty under
 * one seed schedule (stage-3 climate + cover filter; no timers).
 */
export function probeShrubArrival(): ProbeResult {
  const w = 16;
  const h = 16;
  const sx = 8;
  const sz = 8;

  const make = (heatId: "warm" | "mild" | "cold", herbFrac: number, bareSeed = false) => {
    const world = new WorldState(new Grid2D(w, h, 2.5));
    world.setAirTemperature(heatById(heatId).airTempC);
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.shoreExposure.fill(0);
    world.herbBiomass.fill(config.herbBiomassMax * herbFrac);
    world.runHabitatStep(1);
    // §4.48: shrub HSI is cached by dispersal (annual), not recomputed
    // inside establishment — populate the cache before looping establishment.
    world.runDispersalStep(1);
    const herbSeed = bareSeed ? 0 : config.seedSourceStrength;
    world.herbSeedBank.fill(herbSeed);
    world.strandSeedBank.fill(config.seedSourceStrength);
    world.binderSeedBank.fill(config.seedSourceStrength);
    world.marshSeedBank.fill(config.seedSourceStrength);
    world.shrubSeedBank.fill(config.seedSourceStrength);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    return world;
  };

  const warmA = make("warm", 0.6);
  const warmB = make("warm", 0.6);
  const cold = make("cold", 0.6);
  const mild = make("mild", 0.6);
  const bare = make("warm", 0, true);

  const replayMatch = warmA.stateHash() === warmB.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("shrub-arrival: warm replay hash mismatch");
  }

  const warmShrub = warmA.getShrubBiomass(sx, sz);
  const coldShrub = cold.getShrubBiomass(sx, sz);
  const mildShrub = mild.getShrubBiomass(sx, sz);
  const bareShrub = bare.getShrubBiomass(sx, sz);
  const warmHerb = warmA.getHerbBiomass(sx, sz);
  const guildSeedMatch =
    Math.abs(
      warmA.getShrubSeedBank(sx, sz) - warmA.getHerbSeedBank(sx, sz),
    ) < 1e-9
      ? 1
      : 0;
  const climateDelta = warmShrub - coldShrub;

  if (guildSeedMatch !== 1) {
    throw new Error("shrub-arrival: seed schedule not matched");
  }
  if (!(warmShrub > 0.1)) {
    throw new Error(`shrub-arrival: warm shrub too low (${warmShrub})`);
  }
  if (!(climateDelta > 0.05)) {
    throw new Error(
      `shrub-arrival: warm−cold shrub delta too small (${climateDelta})`,
    );
  }
  if (coldShrub !== 0) {
    throw new Error(`shrub-arrival: cold shrub expected 0 (got ${coldShrub})`);
  }
  if (mildShrub !== 0) {
    throw new Error(`shrub-arrival: mild shrub expected 0 (got ${mildShrub})`);
  }
  if (bareShrub !== 0) {
    throw new Error(`shrub-arrival: bare shrub expected 0 (got ${bareShrub})`);
  }

  return {
    scenario: "shrub-arrival",
    records: [
      {
        label: "warmCovered",
        shrubBiomass: warmShrub,
        herbBiomass: warmHerb,
        airTempC: heatById("warm").airTempC,
      },
      {
        label: "coldCovered",
        shrubBiomass: coldShrub,
        airTempC: heatById("cold").airTempC,
        tempLimited: coldShrub === 0 ? 1 : 0,
      },
      {
        label: "mildCovered",
        shrubBiomass: mildShrub,
        airTempC: heatById("mild").airTempC,
      },
      {
        label: "warmBare",
        shrubBiomass: bareShrub,
        coverLimited: bareShrub === 0 ? 1 : 0,
      },
      {
        label: "delta",
        climateDelta,
        guildSeedMatch,
        replayMatch,
        hashN: Number.parseInt(warmA.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * Slice N11 — cryptogam / biological crust stage-2 bootstrap.
 * Damp bare inland earns crust; dry / shaded / salty stay empty under one seed.
 */
export function probeCrustArrival(): ProbeResult {
  const w = 16;
  const h = 16;
  const sx = 8;
  const sz = 8;

  const make = (opts: {
    moistureFrac: number;
    herbFrac: number;
    salinity?: number;
  }) => {
    const world = new WorldState(new Grid2D(w, h, 2.5));
    world.setAirTemperature(config.herbTempOptC);
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * opts.moistureFrac);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(opts.salinity ?? 0);
    world.shoreExposure.fill(0);
    world.herbBiomass.fill(config.herbBiomassMax * opts.herbFrac);
    world.runHabitatStep(1);
    world.soilMoisture.fill(config.soilPorosity * opts.moistureFrac);
    // §4.48: crust HSI is cached by dispersal (annual), not recomputed
    // inside establishment — populate the cache before looping establishment.
    world.runDispersalStep(1);
    world.herbSeedBank.fill(0);
    world.strandSeedBank.fill(0);
    world.binderSeedBank.fill(0);
    world.marshSeedBank.fill(0);
    world.shrubSeedBank.fill(0);
    world.crustSeedBank.fill(config.seedSourceStrength);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
    return world;
  };

  const dampA = make({ moistureFrac: 0.25, herbFrac: 0 });
  const dampB = make({ moistureFrac: 0.25, herbFrac: 0 });
  const dry = make({ moistureFrac: 0, herbFrac: 0 });
  // Herb-peak moisture so standing cover stays dense enough to zero f_open.
  const shaded = make({ moistureFrac: 0.5, herbFrac: 1 });
  const salty = make({ moistureFrac: 0.25, herbFrac: 0, salinity: 1 });

  const replayMatch = dampA.stateHash() === dampB.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("crust-arrival: damp replay hash mismatch");
  }

  const dampCrust = dampA.getCrustBiomass(sx, sz);
  const dryCrust = dry.getCrustBiomass(sx, sz);
  const shadedCrust = shaded.getCrustBiomass(sx, sz);
  const saltyCrust = salty.getCrustBiomass(sx, sz);
  const moistureDelta = dampCrust - dryCrust;
  const guildSeedMatch =
    Math.abs(dampA.getCrustSeedBank(sx, sz) - config.seedSourceStrength) < 1e-9
      ? 1
      : 0;

  if (guildSeedMatch !== 1) {
    throw new Error("crust-arrival: crust seed schedule not matched");
  }
  if (!(dampCrust > 0.1)) {
    throw new Error(`crust-arrival: damp crust too low (${dampCrust})`);
  }
  if (!(moistureDelta > 0.05)) {
    throw new Error(
      `crust-arrival: damp−dry crust delta too small (${moistureDelta})`,
    );
  }
  if (dryCrust !== 0) {
    throw new Error(`crust-arrival: dry crust expected 0 (got ${dryCrust})`);
  }
  if (!(dampCrust > shadedCrust + 0.05)) {
    throw new Error(
      `crust-arrival: shaded crust not suppressed (${shadedCrust} vs damp ${dampCrust})`,
    );
  }
  if (saltyCrust !== 0) {
    throw new Error(`crust-arrival: salty crust expected 0 (got ${saltyCrust})`);
  }

  // Moisture-holding payoff: crust raises infiltration vs bare under same moisture.
  const flat = new Grid2D(8, 8, 1);
  flat.fill(2);
  const bareInfil = new WorldState(flat.clone(), { closedBoundary: true });
  const crustInfil = new WorldState(flat.clone(), { closedBoundary: true });
  bareInfil.vegCover.fill(0);
  crustInfil.vegCover.fill(0);
  bareInfil.crustBiomass.fill(0);
  crustInfil.crustBiomass.fill(config.crustBiomassMax);
  bareInfil.soilMoisture.fill(0);
  crustInfil.soilMoisture.fill(0);
  bareInfil.runVegetationStep(1);
  crustInfil.runVegetationStep(1);
  bareInfil.runSoilWaterStep(1);
  crustInfil.runSoilWaterStep(1);
  const infilDelta =
    crustInfil.infiltrationCapacity.get(4, 4) -
    bareInfil.infiltrationCapacity.get(4, 4);
  if (!(infilDelta > 0)) {
    throw new Error(`crust-arrival: infil delta not positive (${infilDelta})`);
  }

  return {
    scenario: "crust-arrival",
    records: [
      {
        label: "dampBare",
        crustBiomass: dampCrust,
        moisture: config.soilPorosity,
      },
      {
        label: "dryBare",
        crustBiomass: dryCrust,
        moistureLimited: dryCrust === 0 ? 1 : 0,
      },
      {
        label: "dampShaded",
        crustBiomass: shadedCrust,
        openLimited: shadedCrust === 0 ? 1 : 0,
      },
      {
        label: "dampSalty",
        crustBiomass: saltyCrust,
        saltLimited: saltyCrust === 0 ? 1 : 0,
      },
      {
        label: "delta",
        moistureDelta,
        infilDelta,
        guildSeedMatch,
        replayMatch,
        hashN: Number.parseInt(dampA.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * Slice S / C-009 — sand vs clay under identical storm + slope diverge on
 * infiltration and hillslope erosion; properties from substrates.ts table.
 */
export function probeSubstrateContrast(): ProbeResult {
  const w = 16;
  const h = 16;

  const ramp = (): Grid2D => {
    const t = new Grid2D(w, h);
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        // Steep west→east fall so D8 accumulates toward the east edge.
        t.set(x, z, (w - 1 - x) * 0.55 + z * 0.02);
      }
    }
    return t;
  };

  const make = (material: number) => {
    const world = new WorldState(ramp(), { closedBoundary: true });
    world.soilMaterial.fill(material);
    world.vegCover.fill(0);
    world.soilDepth.fill(config.defaultSoilDepthMeters);
    world.soilMoisture.fill(0);
    world.runVegetationStep(1);
    world.runSoilWaterStep(1);
    return world;
  };

  const sandA = make(SUBSTRATE_SAND);
  const sandB = make(SUBSTRATE_SAND);
  const clay = make(SUBSTRATE_CLAY);

  const replayMatch = sandA.stateHash() === sandB.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("substrate-contrast: sand replay hash mismatch");
  }

  const soak = (world: WorldState) => {
    world.water.fill(0.35);
    world.infiltrationLedger = 0;
    world.runSoilWaterStep(1);
    return world.infiltrationLedger;
  };

  const sandInfil = soak(sandA);
  const clayInfil = soak(clay);

  // Fresh twins for erosion — bare, steep, many bands so K difference accumulates.
  const meanChannelLoss = (world: WorldState): number => {
    const elev0 = Float32Array.from(world.terrain.data);
    for (let n = 0; n < 24; n++) world.runGeomorphologyStep(1);
    world.ensureStructureFresh();
    const acc = world.flowAccumulation;
    if (!acc) return 0;
    const aMin = config.erosionMinAccumulation;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < elev0.length; i++) {
      if (acc[i]! < aMin) continue;
      sum += elev0[i]! - world.terrain.data[i]!;
      count += 1;
    }
    return count > 0 ? sum / count : 0;
  };

  const sandErode = meanChannelLoss(make(SUBSTRATE_SAND));
  const clayErode = meanChannelLoss(make(SUBSTRATE_CLAY));

  const sandProps = substrateProps(SUBSTRATE_SAND);
  const clayProps = substrateProps(SUBSTRATE_CLAY);
  const tableDriven =
    sandProps.infiltrationRate > clayProps.infiltrationRate &&
    sandProps.erosionK > clayProps.erosionK
      ? 1
      : 0;

  if (!(sandInfil > clayInfil)) {
    throw new Error(
      `substrate-contrast: expected sand infil (${sandInfil}) > clay (${clayInfil})`,
    );
  }
  if (!(sandErode > clayErode)) {
    throw new Error(
      `substrate-contrast: expected sand channel loss (${sandErode}) > clay (${clayErode})`,
    );
  }
  if (tableDriven !== 1) {
    throw new Error("substrate-contrast: substrate table ordering broken");
  }

  return {
    scenario: "substrate-contrast",
    records: [
      {
        label: "sand",
        infiltrated: sandInfil,
        erode: sandErode,
        porosity: sandProps.porosity,
        infilRate: sandProps.infiltrationRate,
        erosionK: sandProps.erosionK,
      },
      {
        label: "clay",
        infiltrated: clayInfil,
        erode: clayErode,
        porosity: clayProps.porosity,
        infilRate: clayProps.infiltrationRate,
        erosionK: clayProps.erosionK,
      },
      {
        label: "delta",
        infilDelta: sandInfil - clayInfil,
        erodeDelta: sandErode - clayErode,
        replayMatch,
        tableDriven,
        hashN: Number.parseInt(sandA.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * C-009 geological deposit — sand vs rock ridges under identical storm + slope.
 * Deposit raises elev+depth and stamps material; rock resists washout vs sand.
 */
export function probeSubstrateDeposit(): ProbeResult {
  const w = 16;
  const h = 16;

  const ramp = (): Grid2D => {
    const t = new Grid2D(w, h);
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        t.set(x, z, (w - 1 - x) * 0.55 + z * 0.02);
      }
    }
    return t;
  };

  const makeDeposited = (material: number) => {
    const world = new WorldState(ramp(), { closedBoundary: true });
    world.soilMaterial.fill(0);
    world.vegCover.fill(0);
    world.soilDepth.fill(config.defaultSoilDepthMeters);
    world.soilMoisture.fill(0);
    world.depositSubstrate(8, 8, material, 1.5);
    const stampedAtRidge = world.getSoilMaterial(8, 8);
    // Whole-slope class so infil/erosion laws diverge clearly (GEO-002).
    world.soilMaterial.fill(material);
    world.runVegetationStep(1);
    world.runSoilWaterStep(1);
    return { world, stampedAtRidge };
  };

  const sandA = makeDeposited(SUBSTRATE_SAND);
  const sandB = makeDeposited(SUBSTRATE_SAND);
  const rock = makeDeposited(SUBSTRATE_ROCK);

  const replayMatch =
    sandA.world.stateHash() === sandB.world.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("substrate-deposit: sand replay hash mismatch");
  }

  const stamped =
    sandA.stampedAtRidge === SUBSTRATE_SAND &&
    rock.stampedAtRidge === SUBSTRATE_ROCK
      ? 1
      : 0;
  if (stamped !== 1) {
    throw new Error("substrate-deposit: deposit did not stamp material");
  }

  const soak = (world: WorldState) => {
    world.water.fill(0.35);
    world.infiltrationLedger = 0;
    world.runSoilWaterStep(1);
    return world.infiltrationLedger;
  };

  const sandInfil = soak(sandA.world);
  const rockInfil = soak(rock.world);

  const meanChannelLoss = (world: WorldState): number => {
    const elev0 = Float32Array.from(world.terrain.data);
    for (let n = 0; n < 24; n++) world.runGeomorphologyStep(1);
    world.ensureStructureFresh();
    const acc = world.flowAccumulation;
    if (!acc) return 0;
    const aMin = config.erosionMinAccumulation;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < elev0.length; i++) {
      if (acc[i]! < aMin) continue;
      sum += elev0[i]! - world.terrain.data[i]!;
      count += 1;
    }
    return count > 0 ? sum / count : 0;
  };

  const sandErode = meanChannelLoss(makeDeposited(SUBSTRATE_SAND).world);
  const rockErode = meanChannelLoss(makeDeposited(SUBSTRATE_ROCK).world);

  const sandProps = substrateProps(SUBSTRATE_SAND);
  const rockProps = substrateProps(SUBSTRATE_ROCK);
  const tableDriven =
    sandProps.infiltrationRate > rockProps.infiltrationRate &&
    sandProps.erosionK > rockProps.erosionK
      ? 1
      : 0;

  if (!(sandInfil > rockInfil)) {
    throw new Error(
      `substrate-deposit: expected sand infil (${sandInfil}) > rock (${rockInfil})`,
    );
  }
  if (!(sandErode > rockErode)) {
    throw new Error(
      `substrate-deposit: expected sand channel loss (${sandErode}) > rock (${rockErode})`,
    );
  }
  if (tableDriven !== 1) {
    throw new Error("substrate-deposit: substrate table ordering broken");
  }

  return {
    scenario: "substrate-deposit",
    records: [
      {
        label: "sand",
        infiltrated: sandInfil,
        erode: sandErode,
        porosity: sandProps.porosity,
        infilRate: sandProps.infiltrationRate,
        erosionK: sandProps.erosionK,
        stamped: sandA.stampedAtRidge,
      },
      {
        label: "rock",
        infiltrated: rockInfil,
        erode: rockErode,
        porosity: rockProps.porosity,
        infilRate: rockProps.infiltrationRate,
        erosionK: rockProps.erosionK,
        stamped: rock.stampedAtRidge,
      },
      {
        label: "delta",
        infilDelta: sandInfil - rockInfil,
        erodeDelta: sandErode - rockErode,
        replayMatch,
        tableDriven,
        stamped,
        hashN: Number.parseInt(sandA.world.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * Slice 21 / C-019 — overseas arrival: small vs large island under identical
 * regimes; isolation monotonicity; not mainland-perimeter rain.
 */
export function probeIslandArrival(): ProbeResult {
  const size = 32;
  const sea = 2;
  const isolation = 16;

  const disk = (radius: number): Grid2D => {
    const t = new Grid2D(size, size, 0.5);
    const cx = (size - 1) * 0.5;
    const cz = (size - 1) * 0.5;
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        if (Math.hypot(x - cx, z - cz) <= radius) t.set(x, z, 3);
      }
    }
    return t;
  };

  const firstShore = (world: WorldState): { x: number; z: number } => {
    const shore = computeShorelineCells(
      world.width,
      world.height,
      world.oceanCells,
    );
    for (const i of shore) {
      return { x: i % world.width, z: (i / world.width) | 0 };
    }
    throw new Error("island-arrival: no shoreline");
  };

  const establish = (world: WorldState) => {
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    for (const i of world.oceanCells) {
      world.soilMoisture.data[i] = 0;
      world.groundwaterStorage.data[i] = 0;
    }
    world.runHabitatStep(1);
    world.runDispersalStep(1);
    for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
  };

  const run = (radius: number, isol: number) => {
    const world = new WorldState(disk(radius), {
      seaLevel: sea,
      islandIsolation: isol,
    });
    const sample = firstShore(world);
    establish(world);
    const perimeterWouldBe = seedPressureAt(
      sample.x,
      sample.z,
      world.width,
      world.height,
      config.seedSourceStrength,
      config.seedMeanDistanceCells,
    );
    return {
      world,
      sample,
      landCells: world.landCellCount(),
      sElig: world.eligibleRichness(),
      seed: world.getHerbSeedBank(sample.x, sample.z),
      biomass: world.getHerbBiomass(sample.x, sample.z),
      hsi: world.getHabitatSuitability(sample.x, sample.z),
      perimeterWouldBe,
      notPerimeter:
        Math.abs(world.getHerbSeedBank(sample.x, sample.z) - perimeterWouldBe) >
        1e-6
          ? 1
          : 0,
      oceanSeedZero: [...world.oceanCells].every(
        (i) => world.herbSeedBank.data[i] === 0,
      )
        ? 1
        : 0,
    };
  };

  const smallA = run(4, isolation);
  const smallB = run(4, isolation);
  const large = run(10, isolation);
  const near = run(8, 4);
  const far = run(8, 80);

  const replayMatch =
    smallA.world.stateHash() === smallB.world.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("island-arrival: small-island replay hash mismatch");
  }
  if (!(large.landCells > smallA.landCells)) {
    throw new Error("island-arrival: expected larger land area");
  }
  if (!(large.sElig > smallA.sElig)) {
    throw new Error(
      `island-arrival: expected S_elig large (${large.sElig}) > small (${smallA.sElig})`,
    );
  }
  if (!(large.biomass > smallA.biomass)) {
    throw new Error(
      `island-arrival: expected biomass large (${large.biomass}) > small (${smallA.biomass})`,
    );
  }
  if (!(near.biomass > far.biomass)) {
    throw new Error(
      `island-arrival: expected near biomass (${near.biomass}) > far (${far.biomass})`,
    );
  }
  if (smallA.notPerimeter !== 1 || smallA.oceanSeedZero !== 1) {
    throw new Error(
      "island-arrival: island must not use perimeter rain / ocean seed must be 0",
    );
  }

  return {
    scenario: "island-arrival",
    records: [
      {
        label: "small",
        landCells: smallA.landCells,
        sElig: smallA.sElig,
        seed: smallA.seed,
        biomass: smallA.biomass,
        hsi: smallA.hsi,
        notPerimeter: smallA.notPerimeter,
        oceanSeedZero: smallA.oceanSeedZero,
      },
      {
        label: "large",
        landCells: large.landCells,
        sElig: large.sElig,
        seed: large.seed,
        biomass: large.biomass,
        hsi: large.hsi,
      },
      {
        label: "isolation",
        nearBiomass: near.biomass,
        farBiomass: far.biomass,
        nearSElig: near.sElig,
        farSElig: far.sElig,
        isolationDelta: near.biomass - far.biomass,
      },
      {
        label: "delta",
        landDelta: large.landCells - smallA.landCells,
        sEligDelta: large.sElig - smallA.sElig,
        biomassDelta: large.biomass - smallA.biomass,
        replayMatch,
        hashN: Number.parseInt(smallA.world.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * Full C-020 — atmosphere Process: cloud charges → precip discharges;
 * phase from heat; no cell targeting; mass residual closes; T-001 replay.
 */
export function probeCloudDelivery(): ProbeResult {
  const seed = 42;
  const days = 8;

  const run = (heatId: "warm" | "cold", windUx: number) => {
    const world = new WorldState(generateMountain(24, 24, 6, seed), {
      closedBoundary: true,
      windUx,
      windUz: 0,
    });
    world.setRainRegime("moderate");
    world.setAirTemperature(heatById(heatId).airTempC);
    let peakCloud = 0;
    let maxPhase = 0;
    for (let d = 0; d < days; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.stepEvent();
        peakCloud = Math.max(peakCloud, world.cloudWater);
        maxPhase = Math.max(maxPhase, world.precipPhase);
      }
    }
    const precip = world.precipitationLedger;
    const residual = world.waterBalanceResidual();
    const relResidual =
      precip > 0 ? Math.abs(residual) / Math.max(precip, 1e-9) : Math.abs(residual);
    return {
      world,
      precip,
      peakCloud,
      maxPhase,
      relResidual,
      hash: world.stateHash(),
      hashN: Number.parseInt(world.stateHash().slice(0, 8), 16),
    };
  };

  const warmA = run("warm", 1);
  const warmB = run("warm", 1);
  const cold = run("cold", 1);
  const calm = run("warm", 0);

  if (warmA.hash !== warmB.hash) {
    throw new Error(
      `cloud-delivery: same forcing must match (T-001) ${warmA.hash} vs ${warmB.hash}`,
    );
  }
  if (warmA.precip <= 0 || warmA.peakCloud <= 0) {
    throw new Error(
      `cloud-delivery: expected cloud charge and precip (cloud=${warmA.peakCloud} precip=${warmA.precip})`,
    );
  }
  if (warmA.maxPhase !== 0) {
    throw new Error(
      `cloud-delivery: warm heat should stay rain phase (got ${warmA.maxPhase})`,
    );
  }
  if (cold.maxPhase < 2) {
    throw new Error(
      `cloud-delivery: cold heat should reach snow phase (got ${cold.maxPhase})`,
    );
  }
  if (warmA.relResidual > 1e-4) {
    throw new Error(
      `cloud-delivery: H-004 residual too large (rel=${warmA.relResidual})`,
    );
  }
  // Orographic placement still diverges with wind (calm vs west) under same mean.
  if (Math.abs(warmA.precip - calm.precip) / Math.max(warmA.precip, 1e-9) > 0.15) {
    throw new Error(
      `cloud-delivery: precip should track climate mean (west/calm ratio drifted)`,
    );
  }

  return {
    scenario: "cloud-delivery",
    records: [
      {
        label: "warm",
        precip: warmA.precip,
        peakCloud: warmA.peakCloud,
        phase: warmA.maxPhase,
        relResidual: warmA.relResidual,
        replayMatch: 1,
        hashN: warmA.hashN,
      },
      {
        label: "cold",
        precip: cold.precip,
        peakCloud: cold.peakCloud,
        phase: cold.maxPhase,
        hashN: cold.hashN,
      },
      {
        label: "delta",
        phaseDiverged: cold.maxPhase > warmA.maxPhase ? 1 : 0,
        conserved: warmA.relResidual <= 1e-4 ? 1 : 0,
        precipRatio: warmA.precip / Math.max(calm.precip, 1e-9),
      },
    ],
  };
}

/**
 * L7 — activity-gated event band (SIM §6.2).
 * Ship gate is hash-identity: gated vs ungated over wet→dry→wet spanning
 * daily, seasonal, and annual boundaries must share stateHash(). Atmosphere
 * stays outside the gate (cloud decay); the clock always advances.
 */
export function probeEventBandGate(): ProbeResult {
  const seed = 42;
  /** 40 days: annual commits every 36; light regime cycles wet/dry. */
  const days = 40;

  const run = (gating: boolean) => {
    const world = new WorldState(generateMountain(24, 24, 6, seed), {
      closedBoundary: true,
      windUx: 1,
      windUz: 0,
    });
    world.setEventBandGating(gating);
    world.setRainRegime("light");
    world.setAirTemperature(heatById("warm").airTempC);
    for (let d = 0; d < days; d++) {
      for (let i = 0; i < config.dailyEventSteps; i++) {
        world.stepEvent();
      }
    }
    return {
      hash: world.stateHash(),
      hashN: Number.parseInt(world.stateHash().slice(0, 8), 16),
      simMinutes: world.simMinutes,
      skipped: world.eventBandSkippedSteps,
      ran: world.eventBandRanSteps,
      precip: world.precipitationLedger,
      cloud: world.cloudWater,
    };
  };

  const gated = run(true);
  const ungated = run(false);
  const total = days * config.dailyEventSteps;

  if (gated.hash !== ungated.hash) {
    throw new Error(
      `event-band-gate: gated vs ungated hash diverge (L7 ship gate) ${gated.hash} vs ${ungated.hash}`,
    );
  }
  if (gated.simMinutes !== ungated.simMinutes) {
    throw new Error(
      `event-band-gate: clock must advance equally (gated=${gated.simMinutes} ungated=${ungated.simMinutes})`,
    );
  }
  if (gated.skipped <= 0) {
    throw new Error(
      `event-band-gate: expected dry skips under light regime (skipped=${gated.skipped})`,
    );
  }
  if (gated.ran + gated.skipped !== total) {
    throw new Error(
      `event-band-gate: ran+skipped must cover span (${gated.ran}+${gated.skipped} ≠ ${total})`,
    );
  }
  if (ungated.skipped !== 0 || ungated.ran !== total) {
    throw new Error(
      `event-band-gate: ungated arm must run every event step (ran=${ungated.ran} skipped=${ungated.skipped})`,
    );
  }
  if (gated.precip !== ungated.precip || gated.cloud !== ungated.cloud) {
    throw new Error(
      `event-band-gate: precip/cloud must match (precip ${gated.precip} vs ${ungated.precip}, cloud ${gated.cloud} vs ${ungated.cloud})`,
    );
  }

  return {
    scenario: "event-band-gate",
    records: [
      {
        label: "span",
        days,
        totalSteps: total,
        ran: gated.ran,
        skipped: gated.skipped,
        skipFrac: gated.skipped / total,
        simMinutes: gated.simMinutes,
        precip: gated.precip,
        cloud: gated.cloud,
        hashN: gated.hashN,
      },
      {
        label: "delta",
        hashMatch: 1,
        clockMatch: 1,
        precipMatch: 1,
        didSkip: gated.skipped > 0 ? 1 : 0,
      },
    ],
  };
}

/**
 * GEO-002 Exner-lite — hillslope channel removals redeposit into a depression.
 * Capacity/depression weights inside geomorphology only (no second sediment
 * writer, no SWE / Hjulström gates).
 */
export function probeHillslopeDeposit(): ProbeResult {
  const w = 10;
  const h = 8;

  const make = () => {
    const terrain = new Grid2D(w, h);
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        let e = x * 0.5 + 2;
        if (x === 4 && z === 3) e = 0.5;
        terrain.set(x, z, e);
      }
    }
    const world = new WorldState(terrain);
    world.soilDepth.fill(2.5);
    world.vegCover.fill(0);
    world.ensureStructureFresh();
    return world;
  };

  const a = make();
  const b = make();
  const pit = 3 * w + 4;
  if (!(a.depressionDepth.data[pit]! > 0)) {
    throw new Error("hillslope-deposit: expected Priority-Flood residual at pit");
  }

  let channelI = 0;
  let bestA = 0;
  for (let i = 0; i < w * h; i++) {
    if (i === pit) continue;
    const acc = a.flowAccumulation![i]!;
    if (acc > bestA) {
      bestA = acc;
      channelI = i;
    }
  }
  if (bestA < config.erosionMinAccumulation) {
    throw new Error("hillslope-deposit: no channel cell above accumulation gate");
  }

  const pitH0 = a.soilDepth.data[pit]!;
  const chH0 = a.soilDepth.data[channelI]!;
  const bedPit0 = a.terrain.data[pit]! - pitH0;
  const bedCh0 = a.terrain.data[channelI]! - chH0;
  let sum0 = 0;
  for (let i = 0; i < w * h; i++) sum0 += a.soilDepth.data[i]!;

  for (let n = 0; n < 24; n++) {
    a.runGeomorphologyStep(1);
    b.runGeomorphologyStep(1);
  }

  const pitGain = a.soilDepth.data[pit]! - pitH0;
  const channelLoss = chH0 - a.soilDepth.data[channelI]!;
  let sum1 = 0;
  for (let i = 0; i < w * h; i++) sum1 += a.soilDepth.data[i]!;
  const bedrockOk =
    Math.abs(a.terrain.data[pit]! - a.soilDepth.data[pit]! - bedPit0) < 1e-5 &&
    Math.abs(a.terrain.data[channelI]! - a.soilDepth.data[channelI]! - bedCh0) <
      1e-5
      ? 1
      : 0;
  const replayMatch = a.stateHash() === b.stateHash() ? 1 : 0;
  const massOk = sum1 + 1e-6 >= sum0 ? 1 : 0;

  if (!(channelLoss > 0)) {
    throw new Error(`hillslope-deposit: channel should erode (loss=${channelLoss})`);
  }
  if (!(pitGain > 0)) {
    throw new Error(`hillslope-deposit: pit should gain (gain=${pitGain})`);
  }
  if (bedrockOk !== 1) {
    throw new Error("hillslope-deposit: bedrock invariant failed");
  }
  if (replayMatch !== 1) {
    throw new Error("hillslope-deposit: replay hash mismatch (T-001)");
  }
  if (massOk !== 1) {
    throw new Error(
      `hillslope-deposit: soil mass shrank without ocean export (${sum0} → ${sum1})`,
    );
  }

  return {
    scenario: "hillslope-deposit",
    records: [
      {
        label: "run",
        pitGain,
        channelLoss,
        sumDelta: sum1 - sum0,
        bedrockOk,
        replayMatch,
        massOk,
        hashN: Number.parseInt(a.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * C-021 — season force dial: phenology-pressure multiplier on the seasonal
 * establishment tick, distinct from Heat's temperature gate (C-011/C-004).
 * Long season pressure earns more herb biomass than short under one seed
 * schedule; typical (=1) reproduces the pre-dial unscaled establishment step
 * exactly (regression guard — every prior probe never touches this dial).
 */
export function probeSeasonRegime(): ProbeResult {
  const w = 8;
  const h = 8;
  const sx = 4;
  const sz = 4;

  const make = (seasonId?: SeasonId) => {
    const world = new WorldState(new Grid2D(w, h, 2));
    world.setAirTemperature(heatById("warm").airTempC);
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.shoreExposure.fill(0);
    world.runHabitatStep(1);
    world.herbSeedBank.fill(config.seedSourceStrength);
    if (seasonId) world.setSeasonPressure(seasonById(seasonId).pressure);
    world.runHerbEstablishmentStep(1);
    return world;
  };

  const untouched = make();
  const short = make("short");
  const typical = make("typical");
  const typicalB = make("typical");
  const long = make("long");

  const shortBiomass = short.getHerbBiomass(sx, sz);
  const typicalBiomass = typical.getHerbBiomass(sx, sz);
  const longBiomass = long.getHerbBiomass(sx, sz);
  const seasonDelta = longBiomass - shortBiomass;
  const replayMatch = typical.stateHash() === typicalB.stateHash() ? 1 : 0;
  const neutralMatch =
    untouched.getHerbBiomass(sx, sz) === typicalBiomass ? 1 : 0;

  if (replayMatch !== 1) {
    throw new Error("season-regime: typical replay hash mismatch");
  }
  if (neutralMatch !== 1) {
    throw new Error(
      "season-regime: untouched dial diverged from explicit typical",
    );
  }
  if (!(shortBiomass > 0)) {
    throw new Error(
      `season-regime: short biomass should be positive (${shortBiomass})`,
    );
  }
  if (!(seasonDelta > 0)) {
    throw new Error(
      `season-regime: long−short biomass delta too small (${seasonDelta})`,
    );
  }
  if (!(typicalBiomass > shortBiomass && typicalBiomass < longBiomass)) {
    throw new Error(
      `season-regime: typical (${typicalBiomass}) not between short/long`,
    );
  }

  return {
    scenario: "season-regime",
    records: [
      {
        label: "short",
        herbBiomass: shortBiomass,
        pressure: seasonById("short").pressure,
      },
      {
        label: "typical",
        herbBiomass: typicalBiomass,
        pressure: seasonById("typical").pressure,
      },
      {
        label: "long",
        herbBiomass: longBiomass,
        pressure: seasonById("long").pressure,
      },
      {
        label: "delta",
        seasonDelta,
        neutralMatch,
        replayMatch,
        hashN: Number.parseInt(typical.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * C-022 — erosion intensity force dial: storminess multiplier on hillslope +
 * coastal erosion terms only, never soil production (N-004, GEO-002/T-004 —
 * one law, dialled intensity). Stormy erodes the channel more than calm on
 * identical terrain; moderate (=1) reproduces the pre-dial unscaled
 * geomorphology step exactly; mass conserved under both regimes (H-004).
 */
export function probeErosionIntensity(): ProbeResult {
  const w = 10;
  const h = 8;
  const pit = 3 * w + 4;

  const make = (erosionId?: ErosionId) => {
    const terrain = new Grid2D(w, h);
    for (let z = 0; z < h; z++) {
      for (let x = 0; x < w; x++) {
        let e = x * 0.5 + 2;
        if (x === 4 && z === 3) e = 0.5;
        terrain.set(x, z, e);
      }
    }
    const world = new WorldState(terrain);
    world.soilDepth.fill(2.5);
    world.vegCover.fill(0);
    world.ensureStructureFresh();
    if (erosionId) world.setErosionIntensity(erosionById(erosionId).intensity);
    return world;
  };

  const sumDepth = (world: WorldState): number => {
    let s = 0;
    for (let i = 0; i < w * h; i++) s += world.soilDepth.data[i]!;
    return s;
  };

  const untouched = make();
  const calm = make("calm");
  const moderate = make("moderate");
  const moderateB = make("moderate");
  const stormy = make("stormy");

  let channelI = 0;
  let bestA = 0;
  for (let i = 0; i < w * h; i++) {
    if (i === pit) continue;
    const acc = untouched.flowAccumulation![i]!;
    if (acc > bestA) {
      bestA = acc;
      channelI = i;
    }
  }
  if (bestA < config.erosionMinAccumulation) {
    throw new Error(
      "erosion-intensity: no channel cell above accumulation gate",
    );
  }

  const chH0 = untouched.soilDepth.data[channelI]!;
  const calmSum0 = sumDepth(calm);
  const stormySum0 = sumDepth(stormy);

  for (let n = 0; n < 12; n++) {
    untouched.runGeomorphologyStep(1);
    calm.runGeomorphologyStep(1);
    moderate.runGeomorphologyStep(1);
    moderateB.runGeomorphologyStep(1);
    stormy.runGeomorphologyStep(1);
  }

  const calmLoss = chH0 - calm.soilDepth.data[channelI]!;
  const moderateLoss = chH0 - moderate.soilDepth.data[channelI]!;
  const stormyLoss = chH0 - stormy.soilDepth.data[channelI]!;

  const replayMatch = moderate.stateHash() === moderateB.stateHash() ? 1 : 0;
  const neutralMatch =
    untouched.soilDepth.data[channelI] === moderate.soilDepth.data[channelI]
      ? 1
      : 0;
  const massOkCalm = sumDepth(calm) + 1e-6 >= calmSum0 ? 1 : 0;
  const massOkStormy = sumDepth(stormy) + 1e-6 >= stormySum0 ? 1 : 0;

  if (replayMatch !== 1) {
    throw new Error("erosion-intensity: moderate replay hash mismatch");
  }
  if (neutralMatch !== 1) {
    throw new Error(
      "erosion-intensity: untouched dial diverged from explicit moderate",
    );
  }
  if (!(calmLoss > 0)) {
    throw new Error(
      `erosion-intensity: calm channel loss should be positive (${calmLoss})`,
    );
  }
  if (!(stormyLoss > calmLoss)) {
    throw new Error(
      `erosion-intensity: stormy loss (${stormyLoss}) not greater than calm (${calmLoss})`,
    );
  }
  if (massOkCalm !== 1) {
    throw new Error("erosion-intensity: calm run leaked mass (H-004)");
  }
  if (massOkStormy !== 1) {
    throw new Error("erosion-intensity: stormy run leaked mass (H-004)");
  }

  return {
    scenario: "erosion-intensity",
    records: [
      {
        label: "calm",
        channelLoss: calmLoss,
        intensity: erosionById("calm").intensity,
        massOk: massOkCalm,
      },
      {
        label: "moderate",
        channelLoss: moderateLoss,
        intensity: erosionById("moderate").intensity,
      },
      {
        label: "stormy",
        channelLoss: stormyLoss,
        intensity: erosionById("stormy").intensity,
        massOk: massOkStormy,
      },
      {
        label: "delta",
        intensityDelta: stormyLoss - calmLoss,
        neutralMatch,
        replayMatch,
        hashN: Number.parseInt(moderate.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * Slice L2 — spread-front (C-007 Locked; C-019 Locked; C-011 Open; C-003 Open).
 *
 * Every case is a paired comparison against a control that differs only in the
 * thing under test, because on a fully suitable island the overseas kernel will
 * eventually reach the shallow interior on its own — the claim is about the
 * *local* term, so the control has to isolate it.
 *
 * Geometry: the default island size, sampling the deep interior (within 12
 * cells of centre). The living-world review measured that band as unreachable
 * from overseas — the `control*` metrics below re-measure that every run, and
 * they must stay 0 or the scenario is no longer testing what it claims.
 *
 *  1. expand — a founded patch grows outward year on year; no patch, no growth.
 *  2. stall  — a seawater-salt band stops the front; the same world without the
 *              band lets it through.
 *  3. recover— a cleared interior refills from a surviving refugium; the same
 *              clearing with no refugium left does not refill.
 *  4. isolation — the C-019 guard: local seed must not erase area/isolation.
 *
 * Note on (3): fire currently clears `veg.cover` but not `veg.biomass.*`, so
 * the disturbance is applied to biomass directly. Making fire clear biomass is
 * a separate queued review-defect slice (BUILD_GUIDE §4.44–§4.48), not touched
 * here.
 */
export function probeSpreadFront(): ProbeResult {
  const size = config.gridSize;
  const sea = 2;
  const isolation = 16;
  const centre = (size - 1) * 0.5;
  const cx = size >> 1;
  const cz = size >> 1;
  const sampleRadius = 12;

  const island = (): Grid2D => {
    const t = new Grid2D(size, size, 0.5);
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        if (Math.hypot(x - centre, z - centre) <= size * 0.45) t.set(x, z, 3);
      }
    }
    return t;
  };

  /** Perfect habitat on land, so dispersal is the only limiting input. */
  const make = (): WorldState => {
    const world = new WorldState(island(), {
      seaLevel: sea,
      islandIsolation: isolation,
    });
    world.setAirTemperature(config.herbTempOptC);
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    for (const i of world.oceanCells) {
      world.soilMoisture.data[i] = 0;
      world.groundwaterStorage.data[i] = 0;
    }
    world.runHabitatStep(1);
    return world;
  };

  const foundPatch = (world: WorldState, r: number) => {
    for (let z = cz - r; z <= cz + r; z++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (x < 0 || z < 0 || x >= size || z >= size) continue;
        world.herbBiomass.set(x, z, config.herbBiomassMax);
      }
    }
  };

  const advance = (world: WorldState, years: number) => {
    for (let y = 0; y < years; y++) {
      world.runDispersalStep(1);
      for (let s = 0; s < 4; s++) world.runHerbEstablishmentStep(1);
    }
  };

  /** Vegetated land cells within `r` of centre — the deep-interior sample. */
  const vegNearCentre = (world: WorldState, r: number): number => {
    let n = 0;
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        if (Math.hypot(x - cx, z - cz) > r) continue;
        const i = z * size + x;
        if (world.oceanCells.has(i)) continue;
        if (world.herbBiomass.data[i]! > 0.1) n++;
      }
    }
    return n;
  };

  // --- 1. Expand: founded patch vs no patch, same world otherwise.
  const grow = make();
  foundPatch(grow, 1);
  const expandYear0 = vegNearCentre(grow, sampleRadius);
  advance(grow, 2);
  const expandYear2 = vegNearCentre(grow, sampleRadius);
  advance(grow, 2);
  const expandYear4 = vegNearCentre(grow, sampleRadius);

  const noPatch = make();
  advance(noPatch, 4);
  const controlYear4 = vegNearCentre(noPatch, sampleRadius);

  if (controlYear4 !== 0) {
    throw new Error(
      `spread-front: overseas reached the deep interior (${controlYear4}) — sample band no longer isolates the local term`,
    );
  }
  if (!(expandYear2 > expandYear0)) {
    throw new Error(
      `spread-front: patch did not expand by year 2 (${expandYear0} → ${expandYear2})`,
    );
  }
  if (!(expandYear4 > expandYear2)) {
    throw new Error(
      `spread-front: expansion stalled on good ground (${expandYear2} → ${expandYear4})`,
    );
  }

  // --- 2. Stall: a seawater-salt *ring* around the founded patch.
  // factorSalinity(1) = 0 ⇒ herb HSI 0 on the ring (C-018). A ring rather than
  // a band because the island's far side has its own coastline and colonizes
  // from it — a straight band would be "crossed" by that far-side front rather
  // than by the patch under test.
  //
  // The ring must be wider than the kernel's own reach (⌈3λ⌉ cells) or seed
  // simply steps over it. A hostile strip narrower than the dispersal kernel is
  // not a boundary — that is the honest result, not a defect. Sized off the
  // config so a λ change re-tunes it.
  const ringWidth = Math.ceil(3 * config.localSeedMeanDistanceCells) + 2;
  const ringR0 = 4;
  const ringR1 = ringR0 + ringWidth - 1;
  const targetR0 = ringR1 + 1;
  const targetR1 = ringR1 + 3;
  const stallYears = 8;

  const annulus = (world: WorldState, r0: number, r1: number): number => {
    let n = 0;
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        const r = Math.hypot(x - cx, z - cz);
        if (r < r0 || r > r1) continue;
        const i = z * size + x;
        if (world.oceanCells.has(i)) continue;
        if (world.herbBiomass.data[i]! > 0.1) n++;
      }
    }
    return n;
  };

  const paintRing = (world: WorldState) => {
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        const r = Math.hypot(x - cx, z - cz);
        if (r >= ringR0 && r <= ringR1) world.soilSalinity.set(x, z, 1);
      }
    }
    world.runHabitatStep(1);
  };

  const stall = make();
  paintRing(stall);
  foundPatch(stall, 1);
  advance(stall, stallYears);

  const openFront = make();
  foundPatch(openFront, 1);
  advance(openFront, stallYears);

  // Background: no founded patch at all. At this horizon the island's far side
  // has begun arriving from its own shore, so the target annulus is not
  // guaranteed empty — the stall claim is measured against this, not against 0.
  const background = make();
  advance(background, stallYears);

  const stallOnRing = annulus(stall, ringR0, ringR1);
  const stallBeyond = annulus(stall, targetR0, targetR1);
  const openBeyond = annulus(openFront, targetR0, targetR1);
  const backgroundBeyond = annulus(background, targetR0, targetR1);
  const stallInside = annulus(stall, 0, ringR0 - 1);

  if (stallOnRing !== 0) {
    throw new Error(
      `spread-front: front established on the salt ring (${stallOnRing} cells)`,
    );
  }
  if (!(stallInside > 0)) {
    throw new Error("spread-front: patch failed to fill inside the ring");
  }
  if (!(stallBeyond <= backgroundBeyond)) {
    throw new Error(
      `spread-front: front crossed the salt ring (${stallBeyond} beyond vs ${backgroundBeyond} background)`,
    );
  }
  if (!(openBeyond > backgroundBeyond)) {
    throw new Error(
      `spread-front: unringed control never reached the target annulus (${openBeyond} vs background ${backgroundBeyond}) — stall case proves nothing`,
    );
  }

  // --- 3. Recover: cleared interior with a surviving refugium vs without one.
  const disturbR = 6;
  const clearDisc = (world: WorldState, r: number) => {
    for (let z = cz - r; z <= cz + r; z++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (x < 0 || z < 0 || x >= size || z >= size) continue;
        if (Math.hypot(x - cx, z - cz) <= r) world.herbBiomass.set(x, z, 0);
      }
    }
  };

  const discBiomass = (world: WorldState, r: number): number => {
    let total = 0;
    let n = 0;
    for (let z = cz - r; z <= cz + r; z++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (x < 0 || z < 0 || x >= size || z >= size) continue;
        if (Math.hypot(x - cx, z - cz) > r) continue;
        const i = z * size + x;
        if (world.oceanCells.has(i)) continue;
        total += world.herbBiomass.data[i]!;
        n++;
      }
    }
    return n === 0 ? 0 : total / n;
  };

  // A ring of sward survives around the cleared disc.
  const refugium = make();
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      if (Math.hypot(x - cx, z - cz) <= disturbR + 8) {
        refugium.herbBiomass.set(x, z, config.herbBiomassMax);
      }
    }
  }
  for (const i of refugium.oceanCells) refugium.herbBiomass.data[i] = 0;
  clearDisc(refugium, disturbR);
  const burnedBiomass = discBiomass(refugium, disturbR);
  advance(refugium, 6);
  const refugiumRecovered = discBiomass(refugium, disturbR);

  // Control: nothing survives anywhere — the pre-L2 situation.
  const noRefugium = make();
  advance(noRefugium, 6);
  const noRefugiumRecovered = discBiomass(noRefugium, disturbR);

  if (burnedBiomass !== 0) {
    throw new Error(
      `spread-front: disturbance did not clear the disc (${burnedBiomass})`,
    );
  }
  if (!(refugiumRecovered > 0.5)) {
    throw new Error(
      `spread-front: interior did not recover from refugium (${refugiumRecovered})`,
    );
  }
  // The overseas kernel still delivers a trace this deep inland; it must stay
  // far below the 0.1 threshold the rest of this probe counts as vegetated,
  // i.e. the interior is bare to the eye without a surviving local source.
  if (!(noRefugiumRecovered < 0.05)) {
    throw new Error(
      `spread-front: no-refugium control recovered (${noRefugiumRecovered}) — recovery is not local-sourced`,
    );
  }
  if (!(refugiumRecovered > noRefugiumRecovered * 20)) {
    throw new Error(
      `spread-front: refugium recovery (${refugiumRecovered}) not clearly above the no-refugium control (${noRefugiumRecovered})`,
    );
  }

  // --- 4. C-019 guard: local seed must not erase island isolation.
  const colonize = (radius: number, isol: number, years: number) => {
    const n = 32;
    const c = (n - 1) * 0.5;
    const t = new Grid2D(n, n, 0.5);
    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        if (Math.hypot(x - c, z - c) <= radius) t.set(x, z, 3);
      }
    }
    const world = new WorldState(t, { seaLevel: sea, islandIsolation: isol });
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    for (const i of world.oceanCells) {
      world.soilMoisture.data[i] = 0;
      world.groundwaterStorage.data[i] = 0;
    }
    world.runHabitatStep(1);
    advance(world, years);
    let total = 0;
    let land = 0;
    for (let i = 0; i < world.width * world.height; i++) {
      if (world.oceanCells.has(i)) continue;
      land++;
      total += world.herbBiomass.data[i]!;
    }
    return {
      sElig: world.eligibleRichness(),
      meanBiomass: land === 0 ? 0 : total / land,
    };
  };

  const smallFar = colonize(4, 40, 2);
  const largeNear = colonize(10, 4, 2);
  const isolationRatio =
    largeNear.meanBiomass / Math.max(smallFar.meanBiomass, 1e-9);

  if (!(largeNear.sElig > smallFar.sElig)) {
    throw new Error(
      `spread-front: S_elig shape lost (small ${smallFar.sElig}, large ${largeNear.sElig})`,
    );
  }
  if (!(isolationRatio > 1.5)) {
    throw new Error(
      `spread-front: local seed swamped island isolation (ratio ${isolationRatio}) — C-019`,
    );
  }

  // Determinism (T-001) + bounds.
  const replay = make();
  foundPatch(replay, 1);
  advance(replay, 4);
  const replayMatch = replay.stateHash() === grow.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("spread-front: replay hash mismatch");
  }

  let bounded = 1;
  for (let i = 0; i < grow.herbBiomass.data.length; i++) {
    const v = grow.herbBiomass.data[i]!;
    if (!Number.isFinite(v) || v < 0 || v > config.herbBiomassMax + 1e-6) {
      bounded = 0;
      break;
    }
  }

  return {
    scenario: "spread-front",
    records: [
      {
        label: "expand",
        vegYear0: expandYear0,
        vegYear2: expandYear2,
        vegYear4: expandYear4,
        controlYear4,
      },
      {
        label: "stall",
        insideRing: stallInside,
        onRing: stallOnRing,
        beyondRing: stallBeyond,
        openControlBeyond: openBeyond,
        backgroundBeyond,
      },
      {
        label: "recover",
        burnedBiomass,
        refugiumRecovered,
        noRefugiumRecovered,
      },
      {
        label: "isolation",
        smallFarBiomass: smallFar.meanBiomass,
        largeNearBiomass: largeNear.meanBiomass,
        isolationRatio,
        sEligSmall: smallFar.sElig,
        sEligLarge: largeNear.sElig,
      },
      {
        label: "delta",
        replayMatch,
        bounded,
        spreads: expandYear4 > expandYear0 ? 1 : 0,
        stalls:
          stallOnRing === 0 &&
          stallBeyond <= backgroundBeyond &&
          openBeyond > backgroundBeyond
            ? 1
            : 0,
        recovers:
          refugiumRecovered > 0.5 && noRefugiumRecovered < 0.05 ? 1 : 0,
      },
    ],
  };
}

/**
 * Slice L3 — dieback-lag (S-007 Locked; S-008 Current; ES-006 Locked; N-004).
 *
 * Death used to be `min(capacity, biomass + growth)`, so an HSI collapse snapped
 * biomass to the new capacity in one seasonal band. Loss is now a first-order
 * rate toward capacity. This probe measures that the lag is real, guild-ordered,
 * and asymmetric with recovery — the first biological hysteresis (S-008).
 *
 *  1. lag     — after HSI 1→0.2, standing biomass still exceeds capacity for
 *               at least one band (the old clamp would already be at capacity).
 *  2. order   — bands-to-half-biomass: crust < herb < shrub (N-004 referents).
 *  3. pulse   — a one-band drought is ridden out; an eight-band drought is not.
 *  4. asym    — recovery bands from the drought floor past half-max exceed loss
 *               bands from full down to half.
 */
export function probeDiebackLag(): ProbeResult {
  const max: number = config.herbBiomassMax;
  const hsiLow = 0.2;
  const capacityLow = max * hsiLow;

  const step = (args: {
    biomass: number;
    hsi: number;
    mortalityRate: number;
    establishmentRate?: number;
    seedBank?: number;
    biomassMax?: number;
  }): number =>
    nextHerbBiomass({
      biomass: args.biomass,
      seedBank: args.seedBank ?? 40,
      habitatSuitability: args.hsi,
      establishmentScale: 0.08,
      establishmentRate: args.establishmentRate ?? config.herbEstablishmentRate,
      mortalityRate: args.mortalityRate,
      biomassMax: args.biomassMax ?? max,
      dt: 1,
    });

  const bandsToHalf = (
    start: number,
    mortalityRate: number,
    biomassMax: number = max,
  ): number => {
    let b = start;
    const half = start * 0.5;
    for (let n = 1; n <= 200; n++) {
      b = step({ biomass: b, hsi: hsiLow, mortalityRate, biomassMax });
      if (b <= half) return n;
    }
    throw new Error("dieback-lag: never reached half biomass");
  };

  // --- 1. Lag: one band after collapse still carries excess.
  const afterOne = step({
    biomass: max,
    hsi: hsiLow,
    mortalityRate: config.herbMortalityRate,
  });
  if (!(afterOne > capacityLow)) {
    throw new Error(
      `dieback-lag: no standing excess after one band (${afterOne} ≤ ${capacityLow}) — clamp regress`,
    );
  }
  if (!(afterOne < max)) {
    throw new Error(`dieback-lag: biomass did not decline (${afterOne})`);
  }

  // --- 2. Guild order.
  const crustBands = bandsToHalf(
    config.crustBiomassMax,
    config.crustMortalityRate,
    config.crustBiomassMax,
  );
  const herbBands = bandsToHalf(max, config.herbMortalityRate);
  const shrubBands = bandsToHalf(max, config.shrubMortalityRate);
  if (!(crustBands < herbBands && herbBands < shrubBands)) {
    throw new Error(
      `dieback-lag: guild order broken (crust=${crustBands}, herb=${herbBands}, shrub=${shrubBands})`,
    );
  }

  // --- 3. Short vs long drought pulse.
  let shortLived = max;
  shortLived = step({
    biomass: shortLived,
    hsi: hsiLow,
    mortalityRate: config.herbMortalityRate,
  });
  shortLived = step({
    biomass: shortLived,
    hsi: 1,
    mortalityRate: config.herbMortalityRate,
  });
  if (!(shortLived > capacityLow + 0.5)) {
    throw new Error(
      `dieback-lag: short drought not ridden out (${shortLived})`,
    );
  }

  let longLived = max;
  for (let i = 0; i < 8; i++) {
    longLived = step({
      biomass: longLived,
      hsi: hsiLow,
      mortalityRate: config.herbMortalityRate,
    });
  }
  if (!(longLived < capacityLow + 0.15 && longLived >= capacityLow)) {
    throw new Error(
      `dieback-lag: long drought did not settle near capacity (${longLived})`,
    );
  }

  // --- 4. Recovery slower than loss.
  let recovering = capacityLow;
  const halfMax = max * 0.5;
  let recoveryBands = 0;
  for (let n = 1; n <= 200; n++) {
    recovering = step({
      biomass: recovering,
      hsi: 1,
      mortalityRate: config.herbMortalityRate,
      seedBank: 1e6,
    });
    if (recovering >= halfMax) {
      recoveryBands = n;
      break;
    }
  }
  if (recoveryBands === 0) {
    throw new Error("dieback-lag: recovery never reached half-max");
  }
  if (!(recoveryBands > herbBands)) {
    throw new Error(
      `dieback-lag: recovery (${recoveryBands}) not slower than loss (${herbBands})`,
    );
  }

  // WorldState path: moisture collapse drives HSI, then establishment declines.
  const world = new WorldState(generateMountain(8, 8, 2, 1));
  world.setAirTemperature(config.herbTempOptC);
  world.vegCover.fill(0);
  world.herbBiomass.fill(max);
  world.soilDepth.fill(config.hsiDepthRefMeters);
  world.groundwaterStorage.fill(config.hsiGwRefMeters);
  world.soilMoisture.fill(config.soilPorosity * 0.5);
  world.runHabitatStep(1);
  const hsiBefore = world.getHabitatSuitability(4, 4);
  if (!(hsiBefore > 0.9)) {
    throw new Error(`dieback-lag: setup HSI too low (${hsiBefore})`);
  }
  world.soilMoisture.fill(0);
  world.runHabitatStep(1);
  const hsiAfter = world.getHabitatSuitability(4, 4);
  if (!(hsiAfter < 0.25)) {
    throw new Error(`dieback-lag: drought did not collapse HSI (${hsiAfter})`);
  }
  const capacityWorld = max * hsiAfter;
  world.runHerbEstablishmentStep(1);
  const worldAfterOne = world.getHerbBiomass(4, 4);
  if (!(worldAfterOne > capacityWorld)) {
    throw new Error(
      `dieback-lag: WorldState path snapped to capacity (${worldAfterOne})`,
    );
  }

  // Determinism: identical collapse schedule → identical biomass trajectory.
  const run = () => {
    let b = max;
    for (let i = 0; i < 5; i++) {
      b = step({
        biomass: b,
        hsi: hsiLow,
        mortalityRate: config.herbMortalityRate,
      });
    }
    return b;
  };
  const a = run();
  const b = run();
  if (a !== b) {
    throw new Error("dieback-lag: non-deterministic decline");
  }

  return {
    scenario: "dieback-lag",
    records: [
      {
        label: "lag",
        afterOneBand: afterOne,
        capacityLow,
        excess: afterOne - capacityLow,
        worldAfterOne,
        worldCapacity: capacityWorld,
        hsiBefore,
        hsiAfter,
      },
      {
        label: "order",
        crustBands,
        herbBands,
        shrubBands,
      },
      {
        label: "pulse",
        shortLived,
        longLived,
      },
      {
        label: "asym",
        lossBands: herbBands,
        recoveryBands,
      },
      {
        label: "delta",
        hasLag: afterOne > capacityLow ? 1 : 0,
        guildOrdered: crustBands < herbBands && herbBands < shrubBands ? 1 : 0,
        ridesShort: shortLived > capacityLow + 0.5 ? 1 : 0,
        losesLong: longLived < capacityLow + 0.15 ? 1 : 0,
        recoverySlower: recoveryBands > herbBands ? 1 : 0,
        hashMatch: a === b ? 1 : 0,
      },
    ],
  };
}

/**
 * L5 / C-023 — guild competition / successional displacement.
 * Rule: docs/candidates/C-023 criterion (DECISION_CONFORMANCE.md). Shrub's
 * overstory canopy attenuates the insolation herb's light factor sees
 * (habitat/hsiComposition.ts factorLight, via runHabitatStep). On identical
 * terrain/seed/forcing: with shrub able to establish, herb rises, peaks,
 * then *declines* from that peak as shrub's own cover keeps rising —
 * displacement, not parallel accumulation. A no-competition twin (shrub
 * seed suppressed every tick, otherwise identical) is the regression case:
 * herb must rise monotonically to the same ceiling it always has, proving
 * the competing twin's decline is caused by shrub's shade and nothing else.
 */
export function probeSuccessionDisplace(): ProbeResult {
  const w = 8;
  const h = 8;
  const sx = 4;
  const sz = 4;
  const ticks = 30;

  const make = (suppressShrub: boolean) => {
    const world = new WorldState(new Grid2D(w, h, 2.5));
    world.setAirTemperature(heatById("warm").airTempC);
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity * 0.5);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.shoreExposure.fill(0);
    let herbPeak = 0;
    for (let tick = 0; tick < ticks; tick++) {
      world.runHabitatStep(1);
      world.runDispersalStep(1);
      if (suppressShrub) world.shrubSeedBank.fill(0);
      world.runHerbEstablishmentStep(1);
      herbPeak = Math.max(herbPeak, world.getHerbBiomass(sx, sz));
    }
    return { world, herbPeak };
  };

  const competingA = make(false);
  const competingB = make(false);
  const replayMatch =
    competingA.world.stateHash() === competingB.world.stateHash() ? 1 : 0;
  if (replayMatch !== 1) {
    throw new Error("succession-displace: replay hash mismatch");
  }

  const noCompetition = make(true);

  const herbFinal = competingA.world.getHerbBiomass(sx, sz);
  const shrubFinal = competingA.world.getShrubBiomass(sx, sz);
  const herbPeak = competingA.herbPeak;
  const controlHerbFinal = noCompetition.world.getHerbBiomass(sx, sz);
  const controlShrubFinal = noCompetition.world.getShrubBiomass(sx, sz);

  const declinedFromPeak = herbPeak - herbFinal;
  const suppressedVsControl = controlHerbFinal - herbFinal;

  if (!(shrubFinal > 0.5)) {
    throw new Error(`succession-displace: shrub too low (${shrubFinal})`);
  }
  if (!(declinedFromPeak > 0.1)) {
    throw new Error(
      `succession-displace: herb did not decline from its peak (peak=${herbPeak}, final=${herbFinal})`,
    );
  }
  if (controlShrubFinal !== 0) {
    throw new Error(
      `succession-displace: control shrub expected 0 (got ${controlShrubFinal})`,
    );
  }
  if (!(suppressedVsControl > 0.5)) {
    throw new Error(
      `succession-displace: competing herb not suppressed vs. no-competition control (control=${controlHerbFinal}, competing=${herbFinal})`,
    );
  }
  // Regression case: the control's own trajectory must not itself decline —
  // otherwise the "control" isn't actually free of the mechanism.
  if (controlHerbFinal < herbPeak) {
    throw new Error(
      `succession-displace: control herb declined too (${controlHerbFinal} < peak ${herbPeak}) — control is not a clean regression case`,
    );
  }

  return {
    scenario: "succession-displace",
    records: [
      {
        label: "competing",
        herbPeak,
        herbFinal,
        shrubFinal,
        declinedFromPeak,
      },
      {
        label: "noCompetition",
        herbFinal: controlHerbFinal,
        shrubFinal: controlShrubFinal,
      },
      {
        label: "delta",
        declinedFromPeak,
        suppressedVsControl,
        dominantRises: shrubFinal > 0.5 ? 1 : 0,
        replayMatch,
        hashN: Number.parseInt(competingA.world.stateHash().slice(0, 8), 16),
      },
    ],
  };
}

/**
 * A1 / C-027 §3.3 (BUILD_GUIDE §4.66) — a forced Heat dial swing (the same
 * Force-panel regime the arrival-family probes already use) moves
 * `pop.herbivore.trait.insulation` toward the new pressure optimum,
 * deterministically. This is the Tier-P proxy the slice checklist asks
 * for — "instance count and morph/swap amount visibly track a forced
 * pressure change" — measured without an inspector, before any owner
 * playtest question is asked (VERIFICATION_POLICY §4).
 */
export function probeHerbivoreDrift(): ProbeResult {
  const world = new WorldState(new Grid2D(8, 8, 3));
  const cx = 4;
  const cz = 4;
  world.habitatSuitability.fill(1);
  world.herbBiomass.fill(2);
  // Founder population — A1 has no arrival/dispersal mechanism of its own;
  // trait movement needs a standing population to derive a turnover rate.
  world.herbivoreStageAdult.fill(5);

  world.setAirTemperature(heatById("warm").airTempC);
  for (let i = 0; i < 30; i++) world.runPopulationsSeasonalStep(1);
  const warmInsulation = world.getHerbivoreInsulation(cx, cz);

  world.setAirTemperature(heatById("cold").airTempC);
  for (let i = 0; i < 30; i++) world.runPopulationsSeasonalStep(1);
  const coldInsulation = world.getHerbivoreInsulation(cx, cz);

  // Determinism check (T-001): replaying from the same seed/state reaches
  // the identical trait-mean sample, not merely a directionally similar one.
  const replay = new WorldState(new Grid2D(8, 8, 3));
  replay.habitatSuitability.fill(1);
  replay.herbBiomass.fill(2);
  replay.herbivoreStageAdult.fill(5);
  replay.setAirTemperature(heatById("warm").airTempC);
  for (let i = 0; i < 30; i++) replay.runPopulationsSeasonalStep(1);
  replay.setAirTemperature(heatById("cold").airTempC);
  for (let i = 0; i < 30; i++) replay.runPopulationsSeasonalStep(1);
  const replayMatch = replay.getHerbivoreInsulation(cx, cz) === coldInsulation ? 1 : 0;

  if (!(coldInsulation > warmInsulation)) {
    throw new Error(
      `herbivore-drift: expected insulation to rise after a cold Heat-dial swing (warm=${warmInsulation}, cold=${coldInsulation})`,
    );
  }

  return {
    scenario: "herbivore-drift",
    records: [
      { label: "warm", insulation: warmInsulation },
      { label: "cold", insulation: coldInsulation },
      {
        label: "drift",
        delta: coldInsulation - warmInsulation,
        rises: coldInsulation > warmInsulation ? 1 : 0,
        replayMatch,
      },
    ],
  };
}

const SCENARIOS: Record<string, () => ProbeResult> = {
  "paired-storm": probePairedStorm,
  "berm-reroute": probeBermReroute,
  "basin-fill": probeBasinFill,
  "deep-time": probeDeepTime,
  "baseflow-persist": probeBaseflowPersist,
  "regime-divergence": probeRegimeDivergence,
  "branch-compare": probeBranchCompare,
  "limiting-shift": probeLimitingShift,
  "burn-recover": probeBurnRecover,
  "fuel-scar-refine": probeFuelScarRefine,
  "succession-diverge": probeSuccessionDiverge,
  "drydown-feedback": probeDrydownFeedback,
  "disturbance-recovery": probeDisturbanceRecovery,
  "arrival-earned": probeArrivalEarned,
  "spread-front": probeSpreadFront,
  "dieback-lag": probeDiebackLag,
  "living-hollow": probeLivingHollow,
  "island-drainage": probeIslandDrainage,
  "tidal-envelope": probeTidalEnvelope,
  "shore-exposure": probeShoreExposure,
  "longshore-drift": probeLongshoreDrift,
  "orographic-wind": probeOrographicWind,
  "scenario-window": probeScenarioWindow,
  "salinity-arrival": probeSalinityArrival,
  "heat-arrival": probeHeatArrival,
  "strand-arrival": probeStrandArrival,
  "binder-arrival": probeBinderArrival,
  "marsh-arrival": probeMarshArrival,
  "shrub-arrival": probeShrubArrival,
  "crust-arrival": probeCrustArrival,
  "spray-arrival": probeSprayArrival,
  "inundation-arrival": probeInundationArrival,
  "light-arrival": probeLightArrival,
  "island-arrival": probeIslandArrival,
  "substrate-contrast": probeSubstrateContrast,
  "substrate-deposit": probeSubstrateDeposit,
  "hillslope-deposit": probeHillslopeDeposit,
  "cloud-delivery": probeCloudDelivery,
  "event-band-gate": probeEventBandGate,
  "season-regime": probeSeasonRegime,
  "erosion-intensity": probeErosionIntensity,
  "succession-displace": probeSuccessionDisplace,
  "herbivore-drift": probeHerbivoreDrift,
};

export function runProbe(name: string): ProbeResult {
  const fn = SCENARIOS[name];
  if (!fn) {
    throw new Error(
      `Unknown probe '${name}'. Known: ${Object.keys(SCENARIOS).join(", ")}`,
    );
  }
  return fn();
}

export function listProbes(): string[] {
  return Object.keys(SCENARIOS);
}
