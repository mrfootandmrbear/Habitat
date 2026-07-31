import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import { heatById } from "./climate/atmosphere";
import { seasonById } from "./climate/seasonRegime";

describe("Season force dial (C-021)", () => {
  it("regime table is monotonic short < typical=1 < long", () => {
    const short = seasonById("short");
    const typical = seasonById("typical");
    const long = seasonById("long");
    expect(short.pressure).toBeLessThan(typical.pressure);
    expect(typical.pressure).toBe(1);
    expect(long.pressure).toBeGreaterThan(typical.pressure);
  });

  function makeWorld(): WorldState {
    const world = new WorldState(new Grid2D(8, 8, 2));
    world.setAirTemperature(heatById("warm").airTempC);
    world.vegCover.fill(0);
    world.soilDepth.fill(config.hsiDepthRefMeters);
    world.soilMoisture.fill(config.soilPorosity);
    world.groundwaterStorage.fill(config.hsiGwRefMeters);
    world.soilSalinity.fill(0);
    world.shoreExposure.fill(0);
    world.runHabitatStep(1);
    world.herbSeedBank.fill(config.seedSourceStrength);
    return world;
  }

  it("untouched dial (default 1) matches an explicit typical setting — neutral default", () => {
    const untouched = makeWorld();
    untouched.runHerbEstablishmentStep(1);

    const explicit = makeWorld();
    explicit.setSeasonPressure(seasonById("typical").pressure);
    explicit.runHerbEstablishmentStep(1);

    expect(untouched.getHerbBiomass(4, 4)).toBe(explicit.getHerbBiomass(4, 4));
    expect(untouched.stateHash()).toBe(explicit.stateHash());
  });

  it("long season pressure earns more herb biomass than short under identical seed/HSI", () => {
    const shortWorld = makeWorld();
    shortWorld.setSeasonPressure(seasonById("short").pressure);
    shortWorld.runHerbEstablishmentStep(1);

    const longWorld = makeWorld();
    longWorld.setSeasonPressure(seasonById("long").pressure);
    longWorld.runHerbEstablishmentStep(1);

    const shortBiomass = shortWorld.getHerbBiomass(4, 4);
    const longBiomass = longWorld.getHerbBiomass(4, 4);
    expect(shortBiomass).toBeGreaterThan(0);
    expect(longBiomass).toBeGreaterThan(shortBiomass);
  });

  it("does not gate on temperature — Heat stays the sole limiting-factor axis", () => {
    const cold = makeWorld();
    cold.setAirTemperature(heatById("cold").airTempC);
    cold.runHabitatStep(1);
    cold.setSeasonPressure(seasonById("long").pressure);
    cold.runHerbEstablishmentStep(1);
    // Long season pressure cannot rescue a temperature-limited cell (C-011).
    expect(cold.getHabitatSuitability(4, 4)).toBe(0);
    expect(cold.getHerbBiomass(4, 4)).toBe(0);
  });

  it("never erases existing biomass — additive pressure, not a calendar reset (S-007)", () => {
    const world = makeWorld();
    world.runHerbEstablishmentStep(4);
    const before = world.getHerbBiomass(4, 4);
    expect(before).toBeGreaterThan(0);
    world.setSeasonPressure(seasonById("short").pressure);
    world.runHerbEstablishmentStep(1);
    expect(world.getHerbBiomass(4, 4)).toBeGreaterThanOrEqual(before);
  });

  it("replay determinism under an explicit season dial (T-001)", () => {
    const a = makeWorld();
    a.setSeasonPressure(seasonById("long").pressure);
    a.runHerbEstablishmentStep(1);

    const b = makeWorld();
    b.setSeasonPressure(seasonById("long").pressure);
    b.runHerbEstablishmentStep(1);

    expect(a.stateHash()).toBe(b.stateHash());
  });

  it("no cell targeting — the setter takes only a global multiplier (C-004)", () => {
    expect(WorldState.prototype.setSeasonPressure.length).toBe(1);
  });
});
