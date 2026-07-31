/**
 * Fixed-timestep accumulator with optional wall-clock time scale (S-009, T-002).
 * timeScale scales wall-clock input only; simDt is unchanged.
 *
 * Surplus beyond `maxStepsPerFrame` is **deferred**, not discarded
 * (SIMULATION_MODEL §6.4, Slice L1): it stays in the accumulator as time debt
 * and is paid down on later frames. `maxStepsPerFrame` is the per-frame
 * catch-up ceiling; `maxDebtSteps` is the spiral-of-death guard, and only debt
 * past that guard is abandoned — which is the condition §6.4 wants visible so
 * the player's rate can be lowered rather than ticks silently skipped.
 */
/** Slack for step counts read back out of a floating-point accumulator. */
const STEP_EPSILON = 1e-9;

export type SimClockOptions = {
  simDt: number;
  maxStepsPerFrame: number;
  /** Spiral-of-death guard, in steps. Defaults to 4 frames of catch-up. */
  maxDebtSteps?: number;
  timeScale?: number;
};

export type SimClockStepResult = {
  stepsRun: number;
  /** Steps owed and still payable on a later frame. */
  timeDebt: number;
  /** Steps abandoned past the guard — non-zero means the rate is unsustainable. */
  droppedSteps: number;
};

export class SimClock {
  private readonly simDt: number;
  private readonly maxStepsPerFrame: number;
  private readonly maxDebtSteps: number;
  private timeScale: number;
  private accumulator = 0;
  private droppedSteps = 0;

  constructor(options: SimClockOptions) {
    this.simDt = options.simDt;
    this.maxStepsPerFrame = options.maxStepsPerFrame;
    this.maxDebtSteps = options.maxDebtSteps ?? options.maxStepsPerFrame * 4;
    this.timeScale = options.timeScale ?? 1;
  }

  setTimeScale(scale: number): void {
    this.timeScale = scale;
  }

  getTimeScale(): number {
    return this.timeScale;
  }

  /** Steps abandoned past the guard — never the ordinary deferral path. */
  getDroppedSteps(): number {
    return this.droppedSteps;
  }

  /**
   * SIMULATION_MODEL §6.4 — sim steps owed, awaiting catch-up.
   * The epsilon keeps a debt of exactly n from reading as n−1 after the
   * accumulator has been summed and drained in floating point.
   */
  getTimeDebt(): number {
    return Math.floor(this.accumulator / this.simDt + STEP_EPSILON);
  }

  resetDroppedSteps(): void {
    this.droppedSteps = 0;
  }

  /** Drop carried debt as well — used when the world itself is reset. */
  reset(): void {
    this.accumulator = 0;
    this.droppedSteps = 0;
  }

  /** Advance wall clock; returns how many fixed sim steps to run this frame. */
  tick(wallDt: number): SimClockStepResult {
    if (this.timeScale <= 0) {
      return {
        stepsRun: 0,
        timeDebt: this.getTimeDebt(),
        droppedSteps: this.droppedSteps,
      };
    }

    this.accumulator += wallDt * this.timeScale;
    let stepsRun = 0;

    // Same epsilon as getTimeDebt: an owed step must not be stranded just
    // below the boundary by accumulate-and-drain rounding, or the readout and
    // the run disagree about what is owed.
    const stepThreshold = this.simDt * (1 - STEP_EPSILON);
    while (
      this.accumulator >= stepThreshold &&
      stepsRun < this.maxStepsPerFrame
    ) {
      this.accumulator -= this.simDt;
      stepsRun += 1;
    }

    // Whatever is left is owed, not lost — unless it exceeds the guard, in
    // which case the rate is beyond what this machine can deliver and the
    // overflow is abandoned openly (§6.4).
    const debtCeiling = this.maxDebtSteps * this.simDt;
    if (this.accumulator > debtCeiling) {
      const overflow = Math.floor(
        (this.accumulator - debtCeiling) / this.simDt + STEP_EPSILON,
      );
      if (overflow > 0) {
        this.droppedSteps += overflow;
        this.accumulator -= overflow * this.simDt;
      }
    }

    return {
      stepsRun,
      timeDebt: this.getTimeDebt(),
      droppedSteps: this.droppedSteps,
    };
  }
}
