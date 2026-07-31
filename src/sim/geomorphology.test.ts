import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { generateMountain } from "./terrain/generateMountain";
import { WorldState } from "./WorldState";
import { geomorphologyProcess } from "./process/geomorphologyProcess";

describe("geomorphology (Slice 8, S-006, GEO-002)", () => {
  it("registers process ownership of elevation and soil.depth", () => {
    expect(geomorphologyProcess.writes).toEqual([
      "terrain.elevation",
      "soil.depth",
      "soil.material",
      "ledger.shoreErosion",
    ]);
    expect(geomorphologyProcess.band).toBe("decadal");
    const world = new WorldState(new Grid2D(4, 4, 2));
    expect(world.registry.get("soil.depth").owner).toBe("geomorphology");
    expect(world.registry.get("terrain.elevation").owner).toBe("geomorphology");
  });

  it("production raises elev and depth together (bedrock invariant)", () => {
    const world = new WorldState(new Grid2D(6, 6, 3));
    world.soilDepth.fill(0.1);
    const i = 2 * 6 + 2;
    const bed0 = world.terrain.data[i]! - world.soilDepth.data[i]!;
    world.runGeomorphologyStep(1);
    const bed1 = world.terrain.data[i]! - world.soilDepth.data[i]!;
    expect(world.soilDepth.data[i]!).toBeGreaterThan(0.1);
    expect(bed1).toBeCloseTo(bed0, 5);
  });

  it("thin soil produces faster than deep soil (Heimsath)", () => {
    const thin = new WorldState(new Grid2D(4, 4, 2));
    const deep = new WorldState(new Grid2D(4, 4, 2));
    thin.soilDepth.fill(0.05);
    deep.soilDepth.fill(2.5);
    const i = 0;
    const thinBefore = thin.soilDepth.data[i]!;
    const deepBefore = deep.soilDepth.data[i]!;
    thin.runGeomorphologyStep(1);
    deep.runGeomorphologyStep(1);
    const dThin = thin.soilDepth.data[i]! - thinBefore;
    const dDeep = deep.soilDepth.data[i]! - deepBefore;
    expect(dThin).toBeGreaterThan(dDeep);
  });

  it("bare channel erodes more than vegetated channel (cover C-factor)", () => {
    const make = (cover: number): WorldState => {
      const terrain = new Grid2D(12, 12);
      for (let z = 0; z < 12; z++) {
        for (let x = 0; x < 12; x++) terrain.set(x, z, x * 0.4);
      }
      const w = new WorldState(terrain);
      w.soilDepth.fill(1.2);
      w.vegCover.fill(cover);
      w.ensureStructureFresh();
      return w;
    };

    const bare = make(0);
    const veg = make(1);
    // Pick a high-accumulation cell on the ramp.
    bare.ensureStructureFresh();
    let bestI = 0;
    let bestA = 0;
    for (let i = 0; i < bare.flowAccumulation!.length; i++) {
      if (bare.flowAccumulation![i]! > bestA) {
        bestA = bare.flowAccumulation![i]!;
        bestI = i;
      }
    }
    expect(bestA).toBeGreaterThanOrEqual(config.erosionMinAccumulation);

    const bareH0 = bare.soilDepth.data[bestI]!;
    const vegH0 = veg.soilDepth.data[bestI]!;
    for (let n = 0; n < 8; n++) {
      bare.runGeomorphologyStep(1);
      veg.runGeomorphologyStep(1);
    }
    const bareLoss = bareH0 - bare.soilDepth.data[bestI]!;
    const vegLoss = vegH0 - veg.soilDepth.data[bestI]!;
    expect(bareLoss).toBeGreaterThan(vegLoss);
  });

  it("fires on the compressed decadal ladder after N daily bands", () => {
    const world = new WorldState(new Grid2D(4, 4, 1));
    world.soilDepth.fill(0.2);
    const before = world.soilDepth.data[0]!;
    const steps =
      config.dailyEventSteps * config.decadalDailySteps;
    for (let i = 0; i < steps; i++) world.stepEvent();
    expect(world.daysSinceDecadal).toBe(0);
    expect(world.soilDepth.data[0]!).toBeGreaterThan(before);
  });

  it("redeposits hillslope removals into a depression (Exner-lite)", () => {
    // Ramp with a closed pit mid-slope: channel cells erode; pit receives.
    const w = 10;
    const h = 8;
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
    expect(world.depressionDepth.get(4, 3)).toBeGreaterThan(0);

    const pit = 3 * w + 4;
    let channelI = 0;
    let bestA = 0;
    for (let i = 0; i < w * h; i++) {
      if (i === pit) continue;
      const a = world.flowAccumulation![i]!;
      if (a > bestA) {
        bestA = a;
        channelI = i;
      }
    }
    expect(bestA).toBeGreaterThanOrEqual(config.erosionMinAccumulation);

    const pitH0 = world.soilDepth.data[pit]!;
    const chH0 = world.soilDepth.data[channelI]!;
    const bedPit0 = world.terrain.data[pit]! - pitH0;
    const bedCh0 = world.terrain.data[channelI]! - chH0;
    let sum0 = 0;
    for (let i = 0; i < w * h; i++) sum0 += world.soilDepth.data[i]!;

    for (let n = 0; n < 24; n++) world.runGeomorphologyStep(1);

    const pitGain = world.soilDepth.data[pit]! - pitH0;
    const chLoss = chH0 - world.soilDepth.data[channelI]!;
    let sum1 = 0;
    for (let i = 0; i < w * h; i++) sum1 += world.soilDepth.data[i]!;

    expect(chLoss).toBeGreaterThan(0);
    expect(pitGain).toBeGreaterThan(0);
    // retain=1, no ocean: relocates sediment; net Σdepth ≥ start (production ≥ 0).
    expect(sum1).toBeGreaterThanOrEqual(sum0 - 1e-6);
    expect(world.terrain.data[pit]! - world.soilDepth.data[pit]!).toBeCloseTo(
      bedPit0,
      5,
    );
    expect(
      world.terrain.data[channelI]! - world.soilDepth.data[channelI]!,
    ).toBeCloseTo(bedCh0, 5);
  });
});

describe("soil storage · depth (Slice 8 mass balance)", () => {
  it("thin soil holds less infiltrated water than deep soil", () => {
    const thin = new WorldState(new Grid2D(4, 4, 1));
    const deep = new WorldState(new Grid2D(4, 4, 1));
    thin.soilDepth.fill(0.2);
    deep.soilDepth.fill(2.0);
    thin.water.fill(0.5);
    deep.water.fill(0.5);
    thin.runSoilWaterStep(1);
    deep.runSoilWaterStep(1);
    let thinStore = 0;
    let deepStore = 0;
    for (let i = 0; i < 16; i++) {
      thinStore += thin.soilStorageDepth(i);
      deepStore += deep.soilStorageDepth(i);
    }
    expect(deepStore).toBeGreaterThan(thinStore);
  });

  it("closes water balance with moisture · depth storage", () => {
    const world = new WorldState(generateMountain(12, 12, 4, 3));
    for (let i = 0; i < config.dailyEventSteps * 2; i++) {
      world.addRain(config.rainDepthPerEvent);
      world.stepEvent();
    }
    const residual = world.waterBalanceResidual();
    const scale = Math.max(1, world.precipitationLedger);
    expect(Math.abs(residual) / scale).toBeLessThan(1e-4);
  });

  it("dig into saturated soil spills past porosity to surface (no bounds crash)", () => {
    const world = new WorldState(generateMountain(24, 24, 6, 3));
    world.soilMoisture.fill(config.soilPorosity);
    const precipBefore = world.precipitationLedger;
    let soilBefore = 0;
    let surfBefore = 0;
    for (let i = 0; i < world.soilMoisture.data.length; i++) {
      soilBefore += world.soilStorageDepth(i);
      surfBefore += world.water.data[i]!;
    }
    world.digChannel(12, 12);
    expect(() => world.registry.assertBounds("after dig")).not.toThrow();
    let soilAfter = 0;
    let surfAfter = 0;
    let maxM = 0;
    for (let i = 0; i < world.soilMoisture.data.length; i++) {
      soilAfter += world.soilStorageDepth(i);
      surfAfter += world.water.data[i]!;
      maxM = Math.max(maxM, world.soilMoisture.data[i]!);
    }
    expect(maxM).toBeLessThanOrEqual(config.soilPorosity + 1e-6);
    expect(surfAfter).toBeGreaterThan(surfBefore);
    expect(soilBefore + surfBefore).toBeCloseTo(soilAfter + surfAfter, 5);
    expect(world.precipitationLedger).toBe(precipBefore);
  });
});
