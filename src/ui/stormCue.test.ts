import { describe, expect, it } from "vitest";
import { CloudMesh } from "../render/CloudMesh";
import { RainCueMesh } from "../render/RainCueMesh";
import {
  CLOUD_SPELL_FLOOR,
  snowCoverTarget,
  stormCueStrength,
  stormSpellArmed,
  wrapEdgeFade,
} from "../ui/stormCue";

describe("storm cue presentation (C-020 G1–G5)", () => {
  it("G5: arid cue is weaker than light; wet is strongest", () => {
    const arid = stormCueStrength("dry");
    const light = stormCueStrength("light");
    const moderate = stormCueStrength("moderate");
    const wet = stormCueStrength("heavy");
    expect(arid).toBeLessThan(light);
    expect(light).toBeLessThan(moderate);
    expect(moderate).toBeLessThan(wet);
    expect(arid).toBeLessThan(0.4);
    expect(light - arid).toBeGreaterThan(0.15);
  });

  it("G1: wet-day hold arms the spell without precip this tick", () => {
    expect(
      stormSpellArmed({
        rainingThisTick: false,
        cloudWater: 0,
        wetDay: true,
      }),
    ).toBe(true);
  });

  it("G1: charged cloud holds the front between discharge pulses", () => {
    expect(
      stormSpellArmed({
        rainingThisTick: false,
        cloudWater: CLOUD_SPELL_FLOOR * 10,
        wetDay: false,
      }),
    ).toBe(true);
  });

  it("G1: dry day + empty cloud + no rain clears the arm", () => {
    expect(
      stormSpellArmed({
        rainingThisTick: false,
        cloudWater: 0,
        wetDay: false,
      }),
    ).toBe(false);
  });

  it("G2: wrap edge fade is 0 at the boundary and 1 inland", () => {
    const half = 26.4;
    const pad = 4.8;
    expect(wrapEdgeFade(half, 0, half, pad)).toBe(0);
    expect(wrapEdgeFade(0, 0, half, pad)).toBe(1);
    expect(wrapEdgeFade(half - pad * 0.5, 0, half, pad)).toBeCloseTo(0.5, 5);
  });

  it("G3: snow cover target is only nonzero for snow phase while armed", () => {
    expect(snowCoverTarget(2, true, 1)).toBeGreaterThan(0.4);
    expect(snowCoverTarget(0, true, 1)).toBe(0);
    expect(snowCoverTarget(2, false, 1)).toBe(0);
  });

  it("G3: RainCueMesh ground cover builds under snow and holds after clear", () => {
    const cue = new RainCueMesh(48, 40);
    cue.setStorm(true, 1, 2);
    for (let i = 0; i < 30; i++) cue.update(0.05, 0, 0);
    const peak = cue.getGroundCoverOpacity();
    expect(peak).toBeGreaterThan(0.25);
    cue.setStorm(false, 1, 2);
    cue.update(0.05, 0, 0);
    // Still holding — slow melt presentation.
    expect(cue.getGroundCoverOpacity()).toBeGreaterThan(peak * 0.85);
    cue.dispose();
  });

  it("snow reads distinct from rain: falls slower over the same wall time", () => {
    const rain = new RainCueMesh(48, 1400);
    const snow = new RainCueMesh(48, 1400);
    rain.setStorm(true, 1, 0);
    snow.setStorm(true, 1, 2);
    const rainStart = rain.meanHeight();
    const snowStart = snow.meanHeight();
    for (let i = 0; i < 3; i++) {
      rain.update(0.05, 0, 0);
      snow.update(0.05, 0, 0);
    }
    const rainDrop = rainStart - rain.meanHeight();
    const snowDrop = snowStart - snow.meanHeight();
    expect(rainDrop).toBeGreaterThan(0);
    expect(snowDrop).toBeGreaterThan(0);
    expect(rainDrop).toBeGreaterThan(snowDrop * 2);
    rain.dispose();
    snow.dispose();
  });

  it("G4: windward bias shifts cloud mass toward the arrival side", () => {
    const calm = new CloudMesh(48, 5);
    const windy = new CloudMesh(48, 5);
    calm.setAtmosphere(0.02, 0);
    windy.setAtmosphere(0.02, 0);
    for (let i = 0; i < 40; i++) {
      calm.update(0.05, 0, 0);
      windy.update(0.05, 1, 0); // west wind → mass toward −x (windward)
    }
    expect(windy.weightedCentroidX()).toBeLessThan(
      calm.weightedCentroidX() - 2,
    );
    calm.dispose();
    windy.dispose();
  });
});
