/**
 * Hitch / rate / skip-aware presentation LOD (L8 companion).
 *
 * T-002 / U-002 / T-006: render may sample or abstract at high speed; sim
 * outcomes must not change. Shed theatre (streaks, sway, cloud spin) while
 * keeping water depth, terrain, and snow ground-hold truthful.
 */
import type { TimeRateId } from "./timeRates";

export type PresentationLodTier = 0 | 1 | 2 | 3 | 4;

export type PresentationLod = {
  tier: PresentationLodTier;
  /** Rain particle Points — false at P2+. */
  showStreaks: boolean;
  /** Occupant wind sway animation — frozen at P1+. */
  animateSway: boolean;
  /** Cloud sprite spin / drift — throttled/off at P1+. */
  animateClouds: boolean;
  /** Weather fog pull from storm veil — off at P2+. */
  weatherFog: boolean;
  /** OccupantMesh.updateFrom this frame — false under P3 hitch. */
  rebuildOccupants: boolean;
  /** Snow affinity rebake interval (wall seconds). */
  snowAffinityIntervalS: number;
  /** Freeze all weather theatre (L8 skip in flight). */
  freezeWeatherTheatre: boolean;
};

export type PresentationLodInput = {
  timeRate: TimeRateId;
  timeDebt: number;
  droppedSteps: number;
  trueWallDt: number;
  /** True while WorldState.applySkipPreset is running, or just after. */
  skipActive: boolean;
  /** Prior frame droppedSteps — rising abandonment. */
  prevDroppedSteps?: number;
  /** stepsRun hit the per-frame ceiling this frame. */
  hitMaxSteps?: boolean;
};

const FAST_RATES = new Set<TimeRateId>(["day", "week", "month"]);

/**
 * Derive presentation tier from hitch signals first, then steady-state rate.
 * Debt is the honest hitch signal; rate is intent.
 */
export function presentationLod(input: PresentationLodInput): PresentationLod {
  if (input.skipActive) {
    return {
      tier: 4,
      showStreaks: false,
      animateSway: false,
      animateClouds: false,
      weatherFog: false,
      rebuildOccupants: false,
      snowAffinityIntervalS: 10,
      freezeWeatherTheatre: true,
    };
  }

  const droppedRising =
    input.prevDroppedSteps !== undefined &&
    input.droppedSteps > input.prevDroppedSteps;

  if (droppedRising || input.droppedSteps > 0) {
    return {
      tier: 3,
      showStreaks: false,
      animateSway: false,
      animateClouds: false,
      weatherFog: false,
      rebuildOccupants: false,
      snowAffinityIntervalS: 8,
      freezeWeatherTheatre: false,
    };
  }

  if (input.timeDebt > 0 || input.trueWallDt > 0.1) {
    return {
      tier: 2,
      showStreaks: false,
      animateSway: false,
      animateClouds: false,
      weatherFog: false,
      rebuildOccupants: true,
      snowAffinityIntervalS: 6,
      freezeWeatherTheatre: false,
    };
  }

  if (FAST_RATES.has(input.timeRate) || input.hitMaxSteps) {
    return {
      tier: 1,
      showStreaks: false,
      animateSway: false,
      animateClouds: false,
      weatherFog: true,
      rebuildOccupants: true,
      snowAffinityIntervalS: 3,
      freezeWeatherTheatre: false,
    };
  }

  return {
    tier: 0,
    showStreaks: true,
    animateSway: true,
    animateClouds: true,
    weatherFog: true,
    rebuildOccupants: true,
    snowAffinityIntervalS: 3,
    freezeWeatherTheatre: false,
  };
}
