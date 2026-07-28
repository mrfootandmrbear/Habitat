/**
 * Fixed-timestep accumulator with optional wall-clock time scale (S-009, T-002).
 * timeScale scales wall-clock input only; simDt is unchanged.
 */
export type SimClockOptions = {
  simDt: number;
  maxStepsPerFrame: number;
  timeScale?: number;
};

export type SimClockStepResult = {
  stepsRun: number;
  droppedSteps: number;
};

export class SimClock {
  private readonly simDt: number;
  private readonly maxStepsPerFrame: number;
  private timeScale: number;
  private accumulator = 0;
  private droppedSteps = 0;

  constructor(options: SimClockOptions) {
    this.simDt = options.simDt;
    this.maxStepsPerFrame = options.maxStepsPerFrame;
    this.timeScale = options.timeScale ?? 1;
  }

  setTimeScale(scale: number): void {
    this.timeScale = scale;
  }

  getTimeScale(): number {
    return this.timeScale;
  }

  getDroppedSteps(): number {
    return this.droppedSteps;
  }

  resetDroppedSteps(): void {
    this.droppedSteps = 0;
  }

  /** Advance wall clock; returns how many fixed sim steps to run this frame. */
  tick(wallDt: number): SimClockStepResult {
    if (this.timeScale <= 0) {
      return { stepsRun: 0, droppedSteps: 0 };
    }

    this.accumulator += wallDt * this.timeScale;
    let stepsRun = 0;

    while (
      this.accumulator >= this.simDt &&
      stepsRun < this.maxStepsPerFrame
    ) {
      this.accumulator -= this.simDt;
      stepsRun += 1;
    }

    if (this.accumulator >= this.simDt) {
      const excess = Math.floor(this.accumulator / this.simDt);
      this.droppedSteps += excess;
      this.accumulator -= excess * this.simDt;
    }

    return { stepsRun, droppedSteps: this.droppedSteps };
  }
}
