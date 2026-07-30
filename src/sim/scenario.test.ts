/**
 * Slice 14 — scenario objective scaffold (G-002, G-005, T-006, SIM §12 / G-007).
 */

import { describe, expect, it } from "vitest";
import { config } from "../config";
import { Grid2D } from "./Grid2D";
import { WorldState } from "./WorldState";
import {
  LIVING_HOLLOW_BRIEF,
  ScenarioSession,
  criterionReaderFromWorld,
  livingHollowObjective,
  scenarioObserver,
} from "./scenario/ScenarioSession";
import {
  createWindowEvalState,
  pushSample,
  rollingMet,
} from "./scenario/windowEval";

describe("scenario observer contract (T-006)", () => {
  it("declares reads and empty writes (write isolation)", () => {
    expect(scenarioObserver.writes).toEqual([]);
    expect(scenarioObserver.reads).toContain("veg.biomass.herb");
    expect(scenarioObserver.reads).toContain("clock.simMinutes");
  });
});

describe("G-005 rolling window + hysteresis", () => {
  const window = { lengthDays: 3, entryDays: 1, exitDays: 2 };

  it("rollingMet requires a full ring of true samples", () => {
    expect(rollingMet([true, true], 3)).toBe(false);
    expect(rollingMet([true, true, true], 3)).toBe(true);
    expect(rollingMet([true, false, true], 3)).toBe(false);
  });

  it("entry sets currentlySatisfied and achievedAt; exit needs exitDays", () => {
    const state = createWindowEvalState();
    pushSample(state, true, window, 100);
    pushSample(state, true, window, 200);
    pushSample(state, true, window, 300);
    expect(state.currentlySatisfied).toBe(true);
    expect(state.achievedAtSimMinutes).toBe(300);

    // One failed day — grace (exitDays = 2)
    pushSample(state, false, window, 400);
    expect(state.currentlySatisfied).toBe(true);
    expect(state.achievedAtSimMinutes).toBe(300);

    pushSample(state, false, window, 500);
    expect(state.currentlySatisfied).toBe(false);
    // G-007 store-only: achievedAt is never cleared by the evaluator
    expect(state.achievedAtSimMinutes).toBe(300);
  });
});

describe("ScenarioSession write isolation", () => {
  it("observe does not mutate WorldState hash or herb buffers", () => {
    const world = new WorldState(new Grid2D(8, 8, 1));
    world.herbBiomass.fill(1);
    const session = new ScenarioSession(livingHollowObjective());
    const hashBefore = world.stateHash();
    const herbBefore = world.herbBiomass.data.slice();
    const minutesBefore = world.simMinutes;

    for (let i = 0; i < config.dailyEventSteps; i++) {
      session.observeReader({
        ...criterionReaderFromWorld(world),
        simMinutes: (i + 1) * config.eventDtMinutes,
      });
    }

    expect(world.stateHash()).toBe(hashBefore);
    expect([...world.herbBiomass.data]).toEqual([...herbBefore]);
    expect(world.simMinutes).toBe(minutesBefore);
  });
});

describe("ScenarioSession determinism", () => {
  it("same seed schedule yields identical outcome hash", () => {
    const run = () => {
      const world = new WorldState(new Grid2D(8, 8, 1));
      world.herbBiomass.fill(2);
      const session = new ScenarioSession(
        livingHollowObjective({ lengthDays: 3, entryDays: 1, exitDays: 2 }),
      );
      const reader = criterionReaderFromWorld(world);
      for (let day = 1; day <= 5; day++) {
        session.sampleNow({
          ...reader,
          simMinutes: day * config.dailyEventSteps * config.eventDtMinutes,
        });
      }
      return session.outcomeHash();
    };
    expect(run()).toBe(run());
  });

  it("meeting biomass satisfies; zero biomass fails", () => {
    const meet = new ScenarioSession(
      livingHollowObjective({ lengthDays: 3, entryDays: 1, exitDays: 2 }),
    );
    const fail = new ScenarioSession(
      livingHollowObjective({ lengthDays: 3, entryDays: 1, exitDays: 2 }),
    );
    const wet = new WorldState(new Grid2D(8, 8, 1));
    const dry = new WorldState(new Grid2D(8, 8, 1));
    wet.herbBiomass.fill(2);
    dry.herbBiomass.fill(0);

    for (let day = 1; day <= 4; day++) {
      const t = day * config.dailyEventSteps * config.eventDtMinutes;
      meet.sampleNow({ ...criterionReaderFromWorld(wet), simMinutes: t });
      fail.sampleNow({ ...criterionReaderFromWorld(dry), simMinutes: t });
    }

    expect(meet.completion.currentlySatisfied).toBe(true);
    expect(meet.completion.achievedAtSimMinutes).not.toBeNull();
    expect(fail.completion.currentlySatisfied).toBe(false);
    expect(fail.completion.achievedAtSimMinutes).toBeNull();
    expect(meet.outcomeHash()).not.toBe(fail.outcomeHash());
  });

  it("stores all three G-007 components without clearing achievedAt", () => {
    const session = new ScenarioSession(
      livingHollowObjective({ lengthDays: 2, entryDays: 1, exitDays: 1 }),
    );
    const world = new WorldState(new Grid2D(4, 4, 1));
    world.herbBiomass.fill(2);
    session.sampleNow({ ...criterionReaderFromWorld(world), simMinutes: 100 });
    session.sampleNow({ ...criterionReaderFromWorld(world), simMinutes: 200 });
    expect(session.completion.currentlySatisfied).toBe(true);
    const achieved = session.completion.achievedAtSimMinutes;
    expect(achieved).not.toBeNull();

    world.herbBiomass.fill(0);
    session.sampleNow({ ...criterionReaderFromWorld(world), simMinutes: 300 });
    session.sampleNow({ ...criterionReaderFromWorld(world), simMinutes: 400 });
    expect(session.completion.currentlySatisfied).toBe(false);
    expect(session.completion.achievedAtSimMinutes).toBe(achieved);
    expect(session.completion.windowHistory.length).toBeGreaterThan(0);
  });

  it("brief matches notebook seed", () => {
    expect(livingHollowObjective().brief).toBe(LIVING_HOLLOW_BRIEF);
  });
});
