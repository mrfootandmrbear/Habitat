/**
 * Optional Web Audio apply path — no-op without AudioContext.
 * Tier-M tests never import a live context; CI does not depend on browser audio.
 *
 * Wave 0 wires two looping beds (AUD-001 water / AUD-003 life) on first gesture.
 * Mix math stays in AudioBus; this module only owns the browser graph.
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

/** Live ambient beds — null until unlocked by a user gesture (autoplay policy). */
export type AmbientAudioBeds = {
  water: GainTarget;
  life: GainTarget;
  /** Tear down on page hide / tests — optional. */
  dispose: () => void;
};

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  const g = globalThis as typeof globalThis & {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

/**
 * Build two quiet looping beds into master gains the AudioBus can drive.
 * Water: low filtered noise. Life: higher, thinner filtered noise.
 * Levels start at 0 — silence until the mix raises them (AUD-002).
 */
export function createAmbientBeds(): AmbientAudioBeds | null {
  const Ctor = audioContextCtor();
  if (!Ctor) return null;

  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);

  const waterGain = ctx.createGain();
  waterGain.gain.value = 0;
  waterGain.connect(master);

  const lifeGain = ctx.createGain();
  lifeGain.gain.value = 0;
  lifeGain.connect(master);

  const waterFilter = ctx.createBiquadFilter();
  waterFilter.type = "lowpass";
  waterFilter.frequency.value = 280;
  waterFilter.Q.value = 0.7;
  waterFilter.connect(waterGain);

  const lifeFilter = ctx.createBiquadFilter();
  lifeFilter.type = "bandpass";
  lifeFilter.frequency.value = 1200;
  lifeFilter.Q.value = 0.8;
  lifeFilter.connect(lifeGain);

  const waterNoise = loopNoiseSource(ctx, 2.0);
  waterNoise.connect(waterFilter);

  const lifeNoise = loopNoiseSource(ctx, 1.5);
  lifeNoise.connect(lifeFilter);

  waterNoise.start();
  lifeNoise.start();

  return {
    water: waterGain,
    life: lifeGain,
    dispose: () => {
      try {
        waterNoise.stop();
        lifeNoise.stop();
      } catch {
        /* already stopped */
      }
      void ctx.close();
    },
  };
}

/** Soft white-noise buffer loop — no samples shipped; procedural only. */
function loopNoiseSource(
  ctx: AudioContext,
  seconds: number,
): AudioBufferSourceNode {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const buffer = ctx.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  // Soften peaks so the beds stay beds, not hiss. Deterministic fill —
  // presentation-only; must not call Math.random (T-001 / audio.test scan).
  for (let i = 0; i < length; i++) {
    // Cheap hash → [-1, 1]; good enough for filtered ambient noise.
    const x = Math.sin(i * 12.9898) * 43758.5453;
    data[i] = (x - Math.floor(x) - 0.5) * 0.7;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

/**
 * Create beds and resume the context. Call from a user-gesture handler.
 * Returns null when Web Audio is unavailable (SSR / headless).
 */
export async function unlockAmbientAudio(): Promise<AmbientAudioBeds | null> {
  const beds = createAmbientBeds();
  if (!beds) return null;
  // GainNode.context is typed as BaseAudioContext; resume lives on AudioContext.
  const ctx = (beds.water as GainNode).context as AudioContext;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      beds.dispose();
      return null;
    }
  }
  return beds;
}
