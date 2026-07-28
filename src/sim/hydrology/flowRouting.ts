/**
 * D8 flow direction and contributing area (SIMULATION_MODEL §3.9, H-002).
 * Routing surface is terrain elevation; structure.obstructionHeight deferred.
 */

const D8_DX = [-1, 0, 1, -1, 1, -1, 0, 1] as const;
const D8_DZ = [-1, -1, -1, 0, 0, 1, 1, 1] as const;

/** -1 = no downslope neighbor (sink). Otherwise D8 direction index. */
export type FlowDirection = Int8Array;

export function computeD8FlowDirection(
  width: number,
  height: number,
  elevation: Float32Array,
): FlowDirection {
  const n = width * height;
  const direction = new Int8Array(n);
  direction.fill(-1);

  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const i = z * width + x;
      const h = elevation[i]!;
      let bestDrop = 0;
      let bestDir = -1;

      for (let d = 0; d < 8; d++) {
        const nx = x + D8_DX[d]!;
        const nz = z + D8_DZ[d]!;
        if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
        const drop = h - elevation[nz * width + nx]!;
        if (drop > bestDrop) {
          bestDrop = drop;
          bestDir = d;
        }
      }
      direction[i] = bestDir;
    }
  }
  return direction;
}

/** Cell count contributing to each cell (includes self). O(n log n). */
export function computeD8Accumulation(
  width: number,
  height: number,
  elevation: Float32Array,
  direction: FlowDirection,
): Uint32Array {
  const n = width * height;
  const order = Array.from({ length: n }, (_, i) => i);
  // Descending elevation; index tie-break for determinism (§7.2).
  order.sort((a, b) => {
    const dh = elevation[b]! - elevation[a]!;
    return dh !== 0 ? dh : a - b;
  });

  const accumulation = new Uint32Array(n);
  accumulation.fill(1);

  for (const i of order) {
    const dir = direction[i]!;
    if (dir < 0) continue;
    const x = i % width;
    const z = (i / width) | 0;
    const nx = x + D8_DX[dir]!;
    const nz = z + D8_DZ[dir]!;
    if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
    const j = nz * width + nx;
    accumulation[j]! += accumulation[i]!;
  }
  return accumulation;
}

/** Trace each cell to its sink; label by sink index (W-002 emergent regions). */
export function computeWatershedLabels(
  width: number,
  height: number,
  direction: FlowDirection,
): Uint16Array {
  const n = width * height;
  const labels = new Uint16Array(n);
  const sinkOf = new Int32Array(n);
  sinkOf.fill(-1);

  let nextSink = 0;
  for (let i = 0; i < n; i++) {
    if (sinkOf[i]! >= 0) continue;
    let cur = i;
    const path: number[] = [];
    while (sinkOf[cur]! < 0) {
      path.push(cur);
      const dir = direction[cur]!;
      if (dir < 0) {
        sinkOf[cur] = nextSink++;
        break;
      }
      const x = cur % width;
      const z = (cur / width) | 0;
      const nx = x + D8_DX[dir]!;
      const nz = z + D8_DZ[dir]!;
      const next = nz * width + nx;
      if (path.includes(next)) {
        sinkOf[cur] = nextSink++;
        break;
      }
      cur = next;
    }
    const sinkId = sinkOf[cur]!;
    for (const p of path) sinkOf[p] = sinkId;
  }

  for (let i = 0; i < n; i++) labels[i] = sinkOf[i]! as number;
  return labels;
}
