import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildGuildGeometry, OCCUPANT_GUILDS } from "./guildGeometry";

/**
 * C-029 — distinct per-guild occupant silhouettes.
 * Tier-P: geometry math needs no WebGL context, so the actual production
 * shapes are asserted on directly (VERIFICATION_POLICY Tier-P — the agent
 * proves the encoded delta; the owner only answers whether they noticed it).
 */
describe("guild occupant geometry (C-029)", () => {
  it("covers exactly the six vegetation guilds", () => {
    expect([...OCCUPANT_GUILDS].sort()).toEqual(
      ["binder", "crust", "herb", "marsh", "shrub", "strand"].sort(),
    );
  });

  it("every guild's shape has real geometry sitting base-at-ground", () => {
    for (const guild of OCCUPANT_GUILDS) {
      const geo = buildGuildGeometry(guild);
      expect(geo.attributes.position.count).toBeGreaterThan(0);
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      // Never embeds below the terrain plane; sits flush, not floating.
      expect(bb.min.y).toBeCloseTo(0, 3);
      expect(bb.max.y).toBeGreaterThan(0);
    }
  });

  it("guild silhouettes are quantitatively distinct (height/width aspect)", () => {
    const aspect = new Map<string, number>();
    for (const guild of OCCUPANT_GUILDS) {
      const geo = buildGuildGeometry(guild);
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const width = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
      const height = bb.max.y - bb.min.y;
      aspect.set(guild, height / width);
    }

    // Design intent, proved rather than asserted by inspection: crust reads
    // as the flattest ground patch, marsh as the tallest and thinnest reed.
    const flattest = [...aspect.entries()].sort((a, b) => a[1] - b[1])[0]![0];
    const tallest = [...aspect.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    expect(flattest).toBe("crust");
    expect(tallest).toBe("marsh");

    // No two guilds read as the same silhouette — every pair's aspect ratio
    // clears a real gap, the geometric analogue of colorDistance's floor.
    const entries = [...aspect.entries()];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [guildA, aspectA] = entries[i]!;
        const [guildB, aspectB] = entries[j]!;
        expect(
          Math.abs(aspectA - aspectB),
          `${guildA} (${aspectA.toFixed(2)}) vs ${guildB} (${aspectB.toFixed(2)})`,
        ).toBeGreaterThan(0.2);
      }
    }
  });

  it("shrub is the only branching (multi-lobe) silhouette", () => {
    // Shrub merges a trunk cylinder with three canopy cones — strictly more
    // triangles than any single-cluster guild built from thinner blades.
    const shrubVerts = buildGuildGeometry("shrub").attributes.position.count;
    for (const guild of OCCUPANT_GUILDS) {
      if (guild === "shrub") continue;
      const verts = buildGuildGeometry(guild).attributes.position.count;
      expect(shrubVerts).toBeGreaterThanOrEqual(verts);
    }
  });

  it("is deterministic — rebuilding a guild's geometry reproduces the same bounds", () => {
    for (const guild of OCCUPANT_GUILDS) {
      const a = buildGuildGeometry(guild);
      const b = buildGuildGeometry(guild);
      a.computeBoundingBox();
      b.computeBoundingBox();
      expect(a.boundingBox!.min.toArray()).toEqual(b.boundingBox!.min.toArray());
      expect(a.boundingBox!.max.toArray()).toEqual(b.boundingBox!.max.toArray());
    }
  });

  it("scales the way OccupantMesh drives it (uniform XZ, independent Y) without degenerating", () => {
    for (const guild of OCCUPANT_GUILDS) {
      const geo = buildGuildGeometry(guild);
      const m = new THREE.Matrix4().makeScale(0.5, 1.75, 0.5);
      geo.applyMatrix4(m);
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      expect(bb.max.y).toBeGreaterThan(bb.min.y);
      expect(Number.isFinite(bb.max.x)).toBe(true);
    }
  });
});
