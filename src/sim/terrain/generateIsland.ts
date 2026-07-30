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
 * Radial island with interior basins and a low perimeter shelf (C-015).
 * Elevations stay ≥ elevationFloor; pass seaLevel above the shelf so the
 * rim floods while the peak and hollows remain land.
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

  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / maxR;
      const dz = (z - cz) / maxR;
      const r = Math.sqrt(dx * dx + dz * dz);
      // Shore near r≈1; interior peak. Softfall so the rim is below typical sea.
      const radial = Math.max(0, 1 - r);
      let h = shelf + (peakHeight - shelf) * (radial * radial * (3 - 2 * radial));
      const gullyMask = Math.exp(-((dx * 7) ** 2)) * Math.max(0, dz);
      h -= (peakHeight - shelf) * 0.14 * gullyMask;
      // Force outer ring toward shelf so seaLevel > shelf floods a coastline.
      if (r > 0.92) {
        h = shelf + (h - shelf) * Math.max(0, (1 - r) / 0.08);
      }
      terrain.set(x, z, Math.max(config.elevationFloor, h));
    }
  }

  const basins = [
    {
      cx: cx - maxR * 0.28,
      cz: cz + maxR * 0.12,
      sigma: maxR * 0.09,
      amp: -(peakHeight - shelf) * 0.28,
    },
    {
      cx: cx + maxR * 0.22,
      cz: cz - maxR * 0.18,
      sigma: maxR * 0.08,
      amp: -(peakHeight - shelf) * 0.22,
    },
  ];

  for (const b of basins) {
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        terrain.set(
          x,
          z,
          Math.max(
            config.elevationFloor,
            terrain.get(x, z) + gaussian(x, z, b.cx, b.cz, b.sigma, b.amp),
          ),
        );
      }
    }
  }

  for (let i = 0; i < 6; i++) {
    const bx = cx + (rand() - 0.5) * maxR * 1.2;
    const bz = cz + (rand() - 0.5) * maxR * 1.2;
    const sigma = maxR * (0.04 + rand() * 0.05);
    const amp =
      (peakHeight - shelf) * (0.02 + rand() * 0.05) * (rand() < 0.45 ? 1 : -1);
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
