import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { factorSalinity, factorSalinityTolerant } from "./habitat/salinityComposition";
import {
  evaluateStrandHsi,
  STRAND_LIMITING_SALINITY,
  STRAND_LIMITING_SHORE,
} from "./habitat/strandHsiComposition";
import { LIMITING_SPRAY } from "./habitat/hsiComposition";

describe("Strand splash pioneer (C-018 / Slice N4)", () => {
  it("tolerant salinity stays high where herb f_salinity collapses", () => {
    expect(factorSalinity(0.85)).toBeCloseTo(0.15, 8);
    expect(factorSalinityTolerant(0.85)).toBe(1);
    expect(factorSalinityTolerant(1)).toBe(0);
    expect(factorSalinityTolerant(0)).toBe(1);
  });

  it("strand HSI is shore-limited inland and salt-tolerant on the strand", () => {
    const inland = evaluateStrandHsi({
      shoreExposure: 0,
      salinity: 0,
    });
    expect(inland.limiting).toBe(STRAND_LIMITING_SHORE);
    expect(inland.hsi).toBe(0);

    const strand = evaluateStrandHsi({
      shoreExposure: 1,
      salinity: 0.85,
    });
    expect(strand.hsi).toBe(1);
    expect(strand.limiting).not.toBe(STRAND_LIMITING_SALINITY);

    const hyper = evaluateStrandHsi({
      shoreExposure: 1,
      salinity: 1,
    });
    expect(hyper.limiting).toBe(STRAND_LIMITING_SALINITY);
    expect(hyper.hsi).toBe(0);
  });

  it("improving salinity does not raise shore-limited strand HSI", () => {
    const dryShore = evaluateStrandHsi({
      shoreExposure: 0.2,
      salinity: 0,
    });
    const saltyShore = evaluateStrandHsi({
      shoreExposure: 0.2,
      salinity: 0.5,
    });
    expect(dryShore.limiting).toBe(STRAND_LIMITING_SHORE);
    expect(saltyShore.hsi).toBeCloseTo(dryShore.hsi, 8);
  });

  it("salty shore earns strand; fresh inland earns herb under one seed schedule", () => {
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
      world.soilMoisture.fill(config.soilPorosity);
      world.groundwaterStorage.fill(config.hsiGwRefMeters);
      world.soilSalinity.fill(0);
      world.shoreExposure.fill(0);
      world.shoreExposure.set(shoreX, shoreZ, 1);
      world.soilSalinity.set(shoreX, shoreZ, 0.85);
      world.runHabitatStep(1);
      world.runDispersalStep(1);
      for (let i = 0; i < 8; i++) world.runHerbEstablishmentStep(1);
      return world;
    };

    const a = make();
    const b = make();
    expect(a.stateHash()).toBe(b.stateHash());

    // One seed schedule: both cells share perimeter distance → matched seed.
    expect(a.getHerbSeedBank(shoreX, shoreZ)).toBeCloseTo(
      a.getHerbSeedBank(inlandX, inlandZ),
      8,
    );
    expect(a.getStrandSeedBank(shoreX, shoreZ)).toBeCloseTo(
      a.getHerbSeedBank(shoreX, shoreZ),
      8,
    );

    const shoreStrand = a.getStrandBiomass(shoreX, shoreZ);
    const shoreHerb = a.getHerbBiomass(shoreX, shoreZ);
    const inlandHerb = a.getHerbBiomass(inlandX, inlandZ);
    const inlandStrand = a.getStrandBiomass(inlandX, inlandZ);

    expect(a.getLimitingFactor(shoreX, shoreZ)).toBe(LIMITING_SPRAY);
    expect(shoreStrand).toBeGreaterThan(0.1);
    expect(shoreStrand).toBeGreaterThan(shoreHerb * 4);
    expect(inlandHerb).toBeGreaterThan(0.1);
    expect(inlandHerb).toBeGreaterThan(inlandStrand + 0.05);
    expect(inlandStrand).toBe(0);
  });

  it("registers strand seed / establishment / biomass with owners", () => {
    const world = new WorldState(new Grid2D(4, 4, 1));
    expect(world.registry.get("veg.seedBank.strand").owner).toBe("dispersal");
    expect(world.registry.get("veg.seedBank.strand").legacy).toBe(true);
    expect(world.registry.get("veg.establishment.strand").owner).toBe(
      "dispersal",
    );
    expect(world.registry.get("veg.biomass.strand").owner).toBe("vegetation");
    expect(world.registry.get("veg.biomass.strand").band).toBe("seasonal");
  });
});
