import { config } from "../../config";
import { Grid2D } from "../Grid2D";

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(
  x: number,
  z: number,
  cx: number,
  cz: number,
  sigma: number,
  amp: number,
): number {
  const dx = (x - cx) / sigma;
  const dz = (z - cz) / sigma;
  return amp * Math.exp(-0.5 * (dx * dx + dz * dz));
}

/**
 * Broad, lower island sculpting canvas (Slice F / C-015 / C-006).
 * Wider shelf and gentler dome so more land sits above mid sea as workable
 * ground; no deep pre-carved basins — hollows are mostly player-made.
 * Elevations stay ≥ elevationFloor; seaLevel above shelf floods the rim.
 */
export function generateIsland(
  width: number,
  height: number,
  peakHeight: number,
  seed: number,
  options?: { shelfHeight?: number },
): Grid2D {
  const terrain = new Grid2D(width, height);
  const rand = mulberry32(seed);
  const cx = (width - 1) * 0.5;
  const cz = (height - 1) * 0.5;
  const maxR = Math.min(cx, cz);
  const shelf = options?.shelfHeight ?? Math.max(config.elevationFloor, 0.4);
  // Effective relief ~55% of peakHeight — lower castle, more editable shelf.
  const relief = (peakHeight - shelf) * 0.55;

  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / maxR;
      const dz = (z - cz) / maxR;
      const r = Math.sqrt(dx * dx + dz * dz);
      // Gentler radial falloff — broader plateau of workable ground.
      const radial = Math.max(0, 1 - r);
      const dome = Math.pow(radial, 1.25);
      let h = shelf + relief * dome;
      // Mild drainage hint (not a finished hollow).
      const gullyMask = Math.exp(-((dx * 5) ** 2)) * Math.max(0, dz);
      h -= relief * 0.06 * gullyMask;
      // Soft outer ring toward shelf so sea floods a coastline.
      if (r > 0.88) {
        h = shelf + (h - shelf) * Math.max(0, (1 - r) / 0.12);
      }
      terrain.set(x, z, Math.max(config.elevationFloor, h));
    }
  }

  // Light seed noise only — no deep authored basins (player sculpts hollows).
  for (let i = 0; i < 8; i++) {
    const bx = cx + (rand() - 0.5) * maxR * 1.15;
    const bz = cz + (rand() - 0.5) * maxR * 1.15;
    const sigma = maxR * (0.05 + rand() * 0.07);
    const amp = relief * (0.015 + rand() * 0.035) * (rand() < 0.5 ? 1 : -1);
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        terrain.set(
          x,
          z,
          Math.max(
            config.elevationFloor,
            terrain.get(x, z) + gaussian(x, z, bx, bz, sigma, amp),
          ),
        );
      }
    }
  }

  return terrain;
}

/** Default playable sea level (m) — above elevationFloor, floods island shelf. */
export const DEFAULT_SEA_LEVEL_METERS = 2;
