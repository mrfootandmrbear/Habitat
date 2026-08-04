/**
 * What does a linear radiance value actually look like on screen?
 *
 * Why this lives in the repo: the lighting rig calibrates against values it
 * measures in *linear* space (see `lightingRig.ts`), but every judgement about
 * the result — and every rubric point a critic scores — is made on the
 * *tonemapped, sRGB-encoded* frame. Those two numbers are not close, and
 * eyeballing the gap has already produced one wrong diagnosis on this project:
 * the rig's probe reports the sky at b/r 1.59 while the frame renders 1.015,
 * and a session recorded "ACES desaturation explains it" as established fact
 * without testing it. Running the number through here takes seconds and shows
 * ACES only accounts for 1.59 -> ~1.17 — real, but not the whole gap, which
 * means there is a second cause worth finding rather than assuming.
 *
 * Mirrors three r185's ACESFilmicToneMapping exactly
 * (`tonemapping_pars_fragment.glsl.js`) so the prediction is comparable with
 * what `npm run shot` measures off a real frame.
 *
 * Usage:
 *   npm run tonemap -- --linear=0.279,0.362,0.444
 *   npm run tonemap -- --luminance=0.35 --br=1.59   # solve from rig log output
 *   npm run tonemap -- --luminance=0.35 --br=1.59 --exposure=1.2
 */

type Vec3 = [number, number, number];

// three r185, verbatim.
const ACES_INPUT: Vec3[] = [
  [0.59719, 0.35458, 0.04823],
  [0.076, 0.90834, 0.01566],
  [0.0284, 0.13383, 0.83777],
];
const ACES_OUTPUT: Vec3[] = [
  [1.60475, -0.53108, -0.07367],
  [-0.10208, 1.10813, -0.00605],
  [-0.00327, -0.07276, 1.07602],
];

const mul = (m: Vec3[], v: Vec3): Vec3 =>
  m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as Vec3;

const rrtAndOdtFit = (v: Vec3): Vec3 =>
  v.map((x) => {
    const a = x * (x + 0.0245786) - 0.000090537;
    const b = x * (0.983729 * x + 0.432951) + 0.238081;
    return a / b;
  }) as Vec3;

const saturate = (v: Vec3): Vec3 => v.map((x) => Math.min(1, Math.max(0, x))) as Vec3;

export function acesFilmic(color: Vec3, exposure = 1): Vec3 {
  const scaled = color.map((x) => (x * exposure) / 0.6) as Vec3;
  return saturate(mul(ACES_OUTPUT, rrtAndOdtFit(mul(ACES_INPUT, scaled))));
}

/** three uses the exact sRGB transfer function, not a 2.2 gamma approximation. */
export function linearToSrgb(x: number): number {
  return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

export const luminance = (c: Vec3): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/**
 * Recover a linear triple from what the rig actually logs. `[rig]` prints
 * luminance and blue/red but not green, so green is a free parameter — callers
 * should bracket it rather than trust one value. `greenBias` 0 puts green level
 * with red, 1 puts it level with blue, 0.5 is the midpoint.
 */
export function solveLinear(targetLuminance: number, blueOverRed: number, greenBias = 0.5): Vec3 {
  const g = 1 + greenBias * (blueOverRed - 1);
  const basis = 0.2126 + 0.7152 * g + 0.0722 * blueOverRed;
  const r = targetLuminance / basis;
  return [r, r * g, r * blueOverRed];
}

function report(label: string, linear: Vec3, exposure: number): void {
  const tonemapped = acesFilmic(linear, exposure);
  const srgb = tonemapped.map((x) => Math.round(linearToSrgb(x) * 255)) as Vec3;
  const fmt = (v: Vec3, d = 3): string => v.map((x) => x.toFixed(d)).join(", ");
  console.log(
    `${label}\n` +
      `  linear  (${fmt(linear)})  L=${luminance(linear).toFixed(3)}  b/r=${(linear[2] / linear[0]).toFixed(3)}\n` +
      `  screen  (${srgb.join(", ")})  b/r=${(srgb[2] / srgb[0]).toFixed(3)}`,
  );
}

function main(): void {
  const get = (k: string): string | undefined =>
    process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");

  const exposure = Number(get("exposure") ?? 1);
  const linearArg = get("linear");

  if (linearArg) {
    const parts = linearArg.split(",").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
      throw new Error("--linear needs three comma-separated numbers, e.g. --linear=0.28,0.36,0.44");
    }
    report("given:", parts as Vec3, exposure);
    return;
  }

  const targetLuminance = Number(get("luminance") ?? NaN);
  const blueOverRed = Number(get("br") ?? NaN);
  if (Number.isNaN(targetLuminance) || Number.isNaN(blueOverRed)) {
    throw new Error("Pass either --linear=r,g,b or both --luminance= and --br=. See file header.");
  }

  // Green is unconstrained by the rig's log line, so bracket it — if the three
  // rows disagree, the conclusion depends on a guess and should not be trusted.
  for (const [label, bias] of [
    ["green toward red:", 0],
    ["green midpoint:  ", 0.5],
    ["green toward blue:", 1],
  ] as const) {
    report(label, solveLinear(targetLuminance, blueOverRed, bias), exposure);
  }
}

main();
