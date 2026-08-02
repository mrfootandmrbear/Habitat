/**
 * Control-bar chrome density (U-001 / U-003).
 *
 * Simple keeps the sand-castle loop readable: sculpt · primary forces · run time.
 * Full exposes secondary force dials, inspect layers, branch/predict, and session chrome.
 * No sim authority — presentation only (T-006).
 */

export type ChromeDensity = "simple" | "full";

export const CHROME_DENSITY_STORAGE_KEY = "habitat.chromeDensity";

/** Controls that stay visible in Simple (core loop). */
export const SIMPLE_CONTROL_IDS = [
  "chrome-density",
  "force-panel",
  "rain-regime",
  "sea-level",
  "wind-regime",
  "time-rates",
  "siting-tool",
  "siting-brush-size",
  "deposit-material",
  "undo-edit",
  "siting-hint",
  "status",
] as const;

/** Controls only shown in Full (layered on demand — U-001). */
export const FULL_ONLY_CONTROL_IDS = [
  "heat-regime",
  "tide-envelope",
  "season-regime",
  "erosion-intensity",
  "toggle-brief",
  "toggle-notebook",
  "reset-water",
  "seed-actions",
  "remember-form",
  "branch-actions",
  "save-world",
  "load-world",
  "predict-actions",
  "inspector",
  "cutaway",
] as const;

export type SimpleControlId = (typeof SIMPLE_CONTROL_IDS)[number];
export type FullOnlyControlId = (typeof FULL_ONLY_CONTROL_IDS)[number];

export function isChromeDensity(value: unknown): value is ChromeDensity {
  return value === "simple" || value === "full";
}

/** Prefer a stored preference; fall back to Simple (world-first). */
export function resolveChromeDensity(
  stored: string | null | undefined,
): ChromeDensity {
  return isChromeDensity(stored) ? stored : "simple";
}

/** Whether a Full-only control is shown for the active density. */
export function fullOnlyVisible(density: ChromeDensity): boolean {
  return density === "full";
}

/**
 * Tier-P proxy: Simple must expose fewer controls than Full so the bar
 * cedes real estate to the world (U-003).
 */
export function chromeControlCount(density: ChromeDensity): number {
  return density === "full"
    ? SIMPLE_CONTROL_IDS.length + FULL_ONLY_CONTROL_IDS.length
    : SIMPLE_CONTROL_IDS.length;
}

/** Simple is strictly leaner than Full. */
export function chromeDensityDelta(): number {
  return chromeControlCount("full") - chromeControlCount("simple");
}
