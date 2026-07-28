import type { HydrologyModel } from "./hydrology/HydrologyModel";
import type { Grid2D } from "./Grid2D";
import { HeightfieldHydrology } from "./hydrology/HeightfieldHydrology";

/**
 * Owns shared world fields (terrain + hydrology). Terrain is not cloned into
 * hydrology (E-005 / incremental report §2).
 */
export class WorldState {
  readonly terrain: Grid2D;
  readonly hydrology: HydrologyModel;

  constructor(terrain: Grid2D, hydrology?: HydrologyModel) {
    this.terrain = terrain;
    this.hydrology =
      hydrology ??
      new HeightfieldHydrology(terrain, { ownTerrain: false });
  }
}
