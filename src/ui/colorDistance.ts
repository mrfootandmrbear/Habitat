/**
 * Shared perceptual-distance metric for Tier-P encoding-delta proxies
 * (BUILD_GUIDE §4.52 / VERIFICATION_POLICY.md). Every delta function across
 * terrainEncoding.ts, occupantEncoding.ts, and lightEncoding.ts previously
 * measured raw RGB Euclidean distance, weighting a blue-channel difference
 * the same as an equally-sized green one — not how human vision works.
 *
 * Rec. 709 luma coefficients (0.2126R, 0.7152G, 0.0722B) weight the channels
 * by contribution to perceived brightness. They're scaled ×3 (sum 3, not 1)
 * so a neutral grey delta (ΔR=ΔG=ΔB) reproduces the exact magnitude the old
 * unweighted Euclidean distance gave it — every floor already calibrated
 * against an achromatic difference stays valid; only the *balance* across
 * channels changes, discounting blue and boosting green.
 *
 * Not CIELAB ΔE — that's a fuller fix BUILD_GUIDE §4.52 explicitly doesn't
 * require to close.
 */

export type Rgb = readonly [number, number, number];

const LUMA_R = 0.2126 * 3;
const LUMA_G = 0.7152 * 3;
const LUMA_B = 0.0722 * 3;

export function rgbDistance(a: Rgb, b: Rgb): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(LUMA_R * dr * dr + LUMA_G * dg * dg + LUMA_B * db * db);
}
