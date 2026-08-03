/**
 * Adaptive render quality — desktop gets the full post-fx stack, touch/
 * lower-power devices (iPad Safari included) get a cheaper path that still
 * runs smoothly. Detection is a heuristic, not a benchmark; `?quality=` in
 * the URL overrides it for testing on a specific device.
 */
export type QualityTierName = "high" | "medium" | "low";

export type QualityTier = {
  name: QualityTierName;
  pixelRatioCap: number;
  shadowMapSize: number;
  shadows: boolean;
  /** Full post-processing chain (bloom + SSAO + SMAA). Low tier renders direct, no composer. */
  postFx: boolean;
  ssao: boolean;
  bloom: boolean;
  /** PMREM environment map resolution (cube face size in px). */
  envMapSize: number;
  /** InstancedMesh count multiplier for vegetation etc. (1 = full density). */
  instanceDensity: number;
};

const TIERS: Record<QualityTierName, QualityTier> = {
  high: {
    name: "high",
    pixelRatioCap: 2,
    shadowMapSize: 2048,
    shadows: true,
    postFx: true,
    ssao: true,
    bloom: true,
    envMapSize: 256,
    instanceDensity: 1,
  },
  medium: {
    name: "medium",
    pixelRatioCap: 1.5,
    shadowMapSize: 1024,
    shadows: true,
    postFx: true,
    ssao: false,
    bloom: true,
    envMapSize: 128,
    instanceDensity: 1,
  },
  low: {
    name: "low",
    pixelRatioCap: 1,
    shadowMapSize: 512,
    shadows: true,
    postFx: false,
    ssao: false,
    bloom: false,
    envMapSize: 64,
    instanceDensity: 0.6,
  },
};

function isTouchPrimaryDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const touch = navigator.maxTouchPoints > 1;
  if (!touch) return false;
  // iPadOS Safari reports UA as a desktop Mac; touch-point count is the
  // standard way to tell it apart from an actual desktop Mac.
  return /iPad|iPhone|iPod|Android|Macintosh/i.test(navigator.userAgent);
}

/** Detected once at startup — device capability doesn't change mid-session. */
export function detectQualityTier(): QualityTier {
  if (typeof location !== "undefined") {
    const forced = new URLSearchParams(location.search).get("quality");
    if (forced === "high" || forced === "medium" || forced === "low") {
      return TIERS[forced];
    }
  }
  const cores = typeof navigator !== "undefined" ? (navigator.hardwareConcurrency ?? 4) : 4;
  const touch = isTouchPrimaryDevice();
  if (touch || cores <= 4) return TIERS.low;
  if (cores <= 8) return TIERS.medium;
  return TIERS.high;
}
