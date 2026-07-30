/**
 * Optional Web Audio apply path — no-op without AudioContext.
 * Tier-M tests never import a live context; CI does not depend on browser audio.
 */

import type { AudioMix } from "./AudioBus";

export type GainTarget = {
  gain: { value: number };
};

/**
 * Apply mix level to a gain node when present; otherwise no-op.
 * Feature-gated by callers (e.g. only when AudioContext exists).
 */
export function applyMixToGain(mix: AudioMix, target: GainTarget | null): void {
  if (!target) return;
  target.gain.value = mix.silent ? 0 : mix.level;
}
