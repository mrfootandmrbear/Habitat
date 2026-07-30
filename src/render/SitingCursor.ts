import * as THREE from "three";
import { config } from "../config";
import { worldToGrid } from "../ui/siting";

/**
 * Cell-snapped siting gizmo (BUILD_GUIDE §4.2). Presentation only — does not
 * write simulation state.
 */
export class SitingCursor {
  readonly group: THREE.Group;
  private readonly box: THREE.Mesh;
  private readonly width: number;
  private readonly height: number;
  private readonly worldSize: number;
  private cell: { x: number; z: number } | null = null;

  constructor(
    width: number = config.gridSize,
    height: number = config.gridSize,
    worldSize: number = config.worldSize,
  ) {
    this.width = width;
    this.height = height;
    this.worldSize = worldSize;
    this.group = new THREE.Group();
    this.group.name = "sitingCursor";

    const cellW = worldSize / (width - 1);
    const footprint = Math.max(1, 2 * config.sitingBrushRadius + 1);
    const geo = new THREE.BoxGeometry(
      cellW * footprint * 0.92,
      0.35,
      cellW * footprint * 0.92,
    );
    const mat = new THREE.MeshBasicMaterial({
      color: 0xe8c84a,
      transparent: true,
      opacity: 0.4,
      depthTest: true,
    });
    this.box = new THREE.Mesh(geo, mat);
    this.box.visible = false;
    this.group.add(this.box);
  }

  getCell(): { x: number; z: number } | null {
    return this.cell;
  }

  /** Snap world hit to grid; returns cell or null if outside. */
  setFromWorld(
    worldX: number,
    worldZ: number,
    terrainY: number,
  ): { x: number; z: number } | null {
    const cell = worldToGrid(
      worldX,
      worldZ,
      this.width,
      this.height,
      this.worldSize,
    );
    this.cell = cell;
    if (!cell) {
      this.box.visible = false;
      return null;
    }
    const cellW = this.worldSize / (this.width - 1);
    const cellH = this.worldSize / (this.height - 1);
    const ox = -this.worldSize / 2;
    const oz = -this.worldSize / 2;
    this.box.position.set(
      ox + cell.x * cellW,
      terrainY + 0.25,
      oz + cell.z * cellH,
    );
    this.box.visible = true;
    return cell;
  }

  setVisible(v: boolean): void {
    if (!v) this.box.visible = false;
    else if (this.cell) this.box.visible = true;
  }
}
