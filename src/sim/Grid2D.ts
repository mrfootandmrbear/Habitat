/** Flat Float32Array grid with row-major (z * width + x) indexing. */
export class Grid2D {
  readonly width: number;
  readonly height: number;
  readonly data: Float32Array;

  constructor(width: number, height: number, fill = 0) {
    this.width = width;
    this.height = height;
    this.data = new Float32Array(width * height);
    if (fill !== 0) this.data.fill(fill);
  }

  index(x: number, z: number): number {
    return z * this.width + x;
  }

  inBounds(x: number, z: number): boolean {
    return x >= 0 && z >= 0 && x < this.width && z < this.height;
  }

  get(x: number, z: number): number {
    return this.data[this.index(x, z)]!;
  }

  set(x: number, z: number, value: number): void {
    this.data[this.index(x, z)] = value;
  }

  fill(value: number): void {
    this.data.fill(value);
  }

  clone(): Grid2D {
    const g = new Grid2D(this.width, this.height);
    g.data.set(this.data);
    return g;
  }
}
