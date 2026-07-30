/**
 * D8 flow direction, contributing area, and Priority-Flood fill
 * (SIMULATION_MODEL §3.9, H-002, H-003 / Slice 4b).
 */

const D8_DX = [-1, 0, 1, -1, 1, -1, 0, 1] as const;
const D8_DZ = [-1, -1, -1, 0, 0, 1, 1, 1] as const;

/** -1 = no downslope neighbor (sink). Otherwise D8 direction index. */
export type FlowDirection = Int8Array;

/**
 * Priority-flood depression fill (ε-style spill). Returns filled elevation;
 * depression depth is filled − original (clamped ≥ 0).
 */
export function priorityFloodFill(
  width: number,
  height: number,
  elevation: Float32Array,
): { filled: Float32Array; depressionDepth: Float32Array } {
  const n = width * height;
  const filled = new Float32Array(n);
  filled.set(elevation);
  const depressionDepth = new Float32Array(n);
  const visited = new Uint8Array(n);

  type Node = { i: number; h: number };
  const heap: Node[] = [];
  const less = (a: Node, b: Node): boolean =>
    a.h !== b.h ? a.h < b.h : a.i < b.i;

  const siftUp = (idx: number): void => {
    while (idx > 0) {
      const p = (idx - 1) >> 1;
      if (!less(heap[idx]!, heap[p]!)) break;
      const tmp = heap[idx]!;
      heap[idx] = heap[p]!;
      heap[p] = tmp;
      idx = p;
    }
  };
  const siftDown = (idx: number): void => {
    for (;;) {
      let m = idx;
      const l = idx * 2 + 1;
      const r = l + 1;
      if (l < heap.length && less(heap[l]!, heap[m]!)) m = l;
      if (r < heap.length && less(heap[r]!, heap[m]!)) m = r;
      if (m === idx) break;
      const tmp = heap[idx]!;
      heap[idx] = heap[m]!;
      heap[m] = tmp;
      idx = m;
    }
  };
  const push = (node: Node): void => {
    heap.push(node);
    siftUp(heap.length - 1);
  };
  const pop = (): Node => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      siftDown(0);
    }
    return top;
  };

  // Seed open boundary (edge cells drain off-map / spill).
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || z === 0 || x === width - 1 || z === height - 1) {
        const i = z * width + x;
        visited[i] = 1;
        push({ i, h: elevation[i]! });
      }
    }
  }

  while (heap.length > 0) {
    const { i, h } = pop();
    const x = i % width;
    const z = (i / width) | 0;
    for (let d = 0; d < 8; d++) {
      const nx = x + D8_DX[d]!;
      const nz = z + D8_DZ[d]!;
      if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
      const ni = nz * width + nx;
      if (visited[ni]) continue;
      visited[ni] = 1;
      const raw = elevation[ni]!;
      const nextH = raw < h ? h : raw;
      filled[ni] = nextH;
      depressionDepth[ni] = nextH - raw;
      push({ i: ni, h: nextH });
    }
  }

  return { filled, depressionDepth };
}

/**
 * D8 on a routing surface. Flat resolution: among non-uphill neighbors,
 * pick steepest drop; ties broken by neighbor index (deterministic).
 */
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
      let bestScore = -Infinity;
      let bestDir = -1;

      for (let d = 0; d < 8; d++) {
        const nx = x + D8_DX[d]!;
        const nz = z + D8_DZ[d]!;
        if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
        const ni = nz * width + nx;
        const nh = elevation[ni]!;
        if (nh > h) continue; // uphill only forbidden
        const drop = h - nh;
        // Tiny index bias resolves flats without inventing cliffs.
        const score = drop * 1e6 - ni;
        if (score > bestScore) {
          bestScore = score;
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

/**
 * Provisional preserve outlets (SIMULATION_MODEL §10.2): perimeter cells at
 * the edge-minimum elevation that are local minima along the boundary ring.
 * Matches Priority-Flood's open-edge spill assumption so ponded water can leave
 * instead of only evaporating. Flat closed basins opt out via WorldState.
 */
export function computePerimeterOutlets(
  width: number,
  height: number,
  elevation: Float32Array,
): Set<number> {
  if (width < 2 || height < 2) return new Set();

  const ring: number[] = [];
  for (let x = 0; x < width; x++) ring.push(x);
  for (let z = 1; z < height; z++) ring.push(z * width + (width - 1));
  for (let x = width - 2; x >= 0; x--) ring.push((height - 1) * width + x);
  for (let z = height - 2; z >= 1; z--) ring.push(z * width);

  let edgeMin = Infinity;
  let edgeMax = -Infinity;
  for (const i of ring) {
    const h = elevation[i]!;
    edgeMin = Math.min(edgeMin, h);
    edgeMax = Math.max(edgeMax, h);
  }
  // Flat rim (no pour-point relief) — stay closed (bathtub / flat unit grids).
  if (edgeMax - edgeMin < 1e-6) return new Set();

  const outlets = new Set<number>();
  const n = ring.length;
  for (let k = 0; k < n; k++) {
    const i = ring[k]!;
    const h = elevation[i]!;
    if (h > edgeMin + 1e-4) continue;
    const prev = elevation[ring[(k - 1 + n) % n]!]!;
    const next = elevation[ring[(k + 1) % n]!]!;
    if (h <= prev && h <= next) outlets.add(i);
  }
  return outlets;
}
