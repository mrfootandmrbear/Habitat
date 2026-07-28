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

/** Deterministic mountain with basins and a gully for readable runoff (H-002). */
export function generateMountain(
  width: number,
  height: number,
  peakHeight: number,
  seed: number,
): Grid2D {
  const terrain = new Grid2D(width, height);
  const rand = mulberry32(seed);
  const cx = (width - 1) * 0.5;
  const cz = (height - 1) * 0.5;
  const maxR = Math.min(cx, cz);

  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / maxR;
      const dz = (z - cz) / maxR;
      const r = Math.sqrt(dx * dx + dz * dz);
      const radial = Math.max(0, 1 - r);
      let h = peakHeight * (radial * radial * (3 - 2 * radial));
      const gullyMask = Math.exp(-((dx * 8) ** 2)) * Math.max(0, dz);
      h -= peakHeight * 0.12 * gullyMask;
      terrain.set(x, z, Math.max(config.elevationFloor, h));
    }
  }

  const basins = [
    {
      cx: cx - maxR * 0.35,
      cz: cz + maxR * 0.15,
      sigma: maxR * 0.08,
      amp: -peakHeight * 0.22,
    },
    {
      cx: cx + maxR * 0.28,
      cz: cz - maxR * 0.2,
      sigma: maxR * 0.07,
      amp: -peakHeight * 0.18,
    },
    {
      cx: cx + maxR * 0.1,
      cz: cz + maxR * 0.4,
      sigma: maxR * 0.09,
      amp: -peakHeight * 0.15,
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

  for (let i = 0; i < 8; i++) {
    const bx = rand() * (width - 1);
    const bz = rand() * (height - 1);
    const sigma = maxR * (0.04 + rand() * 0.04);
    const amp = peakHeight * (0.02 + rand() * 0.04) * (rand() < 0.5 ? 1 : -1);
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
