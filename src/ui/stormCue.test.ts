import { describe, expect, it } from "vitest";
import { CloudMesh } from "../render/CloudMesh";
import { RainCueMesh } from "../render/RainCueMesh";
import {
  CLOUD_SPELL_FLOOR,
  releasingCloudCount,
  snowCoverTarget,
  stormCueStrength,
  stormSpellArmed,
  weatherFogRange,
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

describe("weather presentation (C-020 G6–G9)", () => {
  it("G6: releasing-cloud count ladders with regime intensity", () => {
    const total = 7;
    const arid = releasingCloudCount("dry", total);
    const light = releasingCloudCount("light", total);
    const moderate = releasingCloudCount("moderate", total);
    const wet = releasingCloudCount("heavy", total);
    expect(arid).toBeGreaterThanOrEqual(1);
    expect(arid).toBeLessThanOrEqual(light);
    expect(light).toBeLessThanOrEqual(moderate);
    expect(moderate).toBeLessThanOrEqual(wet);
    expect(wet).toBeLessThanOrEqual(total);
    expect(arid).toBeLessThan(wet);
  });

  it("G6: releasing-cloud count never exceeds the pool and floors at zero clouds", () => {
    expect(releasingCloudCount("heavy", 0)).toBe(0);
    expect(releasingCloudCount("heavy", 3)).toBeLessThanOrEqual(3);
  });

  it("G6: CloudMesh reports releasing footprints only up to the armed count", () => {
    const cloud = new CloudMesh(48, 7);
    cloud.setAtmosphere(0.02, 0);
    cloud.setReleasingCount(3);
    for (let i = 0; i < 40; i++) cloud.update(0.05, 0.4, 0);
    const footprints = cloud.getReleasingFootprints();
    expect(footprints.length).toBeLessThanOrEqual(3);
    expect(footprints.length).toBeGreaterThan(0);
    for (const fp of footprints) {
      expect(Number.isFinite(fp.x)).toBe(true);
      expect(Number.isFinite(fp.z)).toBe(true);
      expect(fp.radius).toBeGreaterThan(0);
    }
    cloud.dispose();
  });

  it("G6: RainCueMesh spawns precip under the given cloud footprint, not a uniform veil", () => {
    const cue = new RainCueMesh(48, 300);
    cue.setStorm(true, 1, 0);
    cue.setCloudFootprints([{ x: 10, z: -6, y: 12, radius: 1.5 }]);
    // Cycle enough that every particle has passed through at least one respawn.
    for (let i = 0; i < 400; i++) cue.update(0.5, 0, 0);
    // A uniform veil across worldSize 48 would put ~π·4²/48² ≈ 2% of points
    // within a 4-unit radius of one point; footprint spawning should clear
    // that by far.
    expect(cue.fractionNear(10, -6, 4)).toBeGreaterThan(0.5);
    cue.dispose();
  });

  it("G7: snow falls slower than rain under the same wind and dt", () => {
    const rain = new RainCueMesh(48, 200);
    const snow = new RainCueMesh(48, 200);
    rain.setStorm(true, 1, 0);
    snow.setStorm(true, 1, 2);
    const h0Rain = rain.meanHeight();
    const h0Snow = snow.meanHeight();
    rain.update(0.05, 0, 0);
    snow.update(0.05, 0, 0);
    const dropRain = h0Rain - rain.meanHeight();
    const dropSnow = h0Snow - snow.meanHeight();
    expect(dropSnow).toBeGreaterThan(0);
    expect(dropSnow).toBeLessThan(dropRain);
    rain.dispose();
    snow.dispose();
  });

  it("G9: weather fog pulls in with storm veil and cloud cover, relaxes when clear", () => {
    const base = { near: 70, far: 140 };
    const clear = weatherFogRange(base, 0, 0);
    const stormy = weatherFogRange(base, 1, 1);
    expect(clear.near).toBeCloseTo(base.near, 5);
    expect(clear.far).toBeCloseTo(base.far, 5);
    expect(stormy.near).toBeLessThan(base.near);
    expect(stormy.far).toBeLessThan(base.far);
    // near/far stay in the same ratio — a pull-in, not a re-shape.
    expect(stormy.near / stormy.far).toBeCloseTo(base.near / base.far, 5);
  });
});
