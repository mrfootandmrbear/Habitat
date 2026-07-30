/**
 * G-005 rolling window + entry/exit hysteresis — pure (no WorldState).
 * Window lengths are scenario authoring; this module only applies them.
 */

import type { PersistenceWindow } from "./types";

export type WindowEvalState = {
  /** Oldest → newest criterion samples. */
  history: boolean[];
  currentlySatisfied: boolean;
  achievedAtSimMinutes: number | null;
  /** Consecutive samples with rollingMet === true (caps at entryDays). */
  entryStreak: number;
  /** Consecutive samples with rollingMet === false (caps at exitDays). */
  exitStreak: number;
};

export function createWindowEvalState(): WindowEvalState {
  return {
    history: [],
    currentlySatisfied: false,
    achievedAtSimMinutes: null,
    entryStreak: 0,
    exitStreak: 0,
  };
}

/** Ring is full and every sample is true. */
export function rollingMet(
  history: readonly boolean[],
  lengthDays: number,
): boolean {
  if (history.length < lengthDays) return false;
  for (let i = 0; i < history.length; i++) {
    if (!history[i]) return false;
  }
  return true;
}

/**
 * Push one criterion sample; update hysteresis.
 * `achievedAtSimMinutes` is set on first entry and never cleared (G-007 store-only).
 */
export function pushSample(
  state: WindowEvalState,
  sampleMet: boolean,
  window: PersistenceWindow,
  simMinutes: number,
): void {
  const { lengthDays, entryDays, exitDays } = window;
  state.history.push(sampleMet);
  while (state.history.length > lengthDays) {
    state.history.shift();
  }

  const met = rollingMet(state.history, lengthDays);
  if (met) {
    state.entryStreak = Math.min(state.entryStreak + 1, entryDays);
    state.exitStreak = 0;
  } else {
    state.exitStreak = Math.min(state.exitStreak + 1, exitDays);
    state.entryStreak = 0;
  }

  if (!state.currentlySatisfied && state.entryStreak >= entryDays) {
    state.currentlySatisfied = true;
    if (state.achievedAtSimMinutes === null) {
      state.achievedAtSimMinutes = simMinutes;
    }
  } else if (state.currentlySatisfied && state.exitStreak >= exitDays) {
    state.currentlySatisfied = false;
  }
}
