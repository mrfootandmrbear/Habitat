import * as THREE from "three";
import { config } from "../config";
import type { WaterStateView } from "../sim/types";

const waterVertex = /* glsl */ `
varying vec3 vWorldNormal;
varying float vAlpha;
varying float vDepthT;
attribute vec4 waterColor;

void main() {
  vAlpha = waterColor.a;
  vDepthT = waterColor.a > 0.0 ? waterColor.b : 0.0;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const waterFragment = /* glsl */ `
varying vec3 vWorldNormal;
varying float vAlpha;
varying float vDepthT;

void main() {
  if (vAlpha < 0.01) discard;
  vec3 n = normalize(vWorldNormal);
  vec3 lightDir = normalize(vec3(0.4, 1.0, 0.25));
  float ndl = 0.35 + 0.65 * max(dot(n, lightDir), 0.0);
  vec3 shallow = vec3(0.35, 0.62, 0.82);
  vec3 deep = vec3(0.12, 0.35, 0.62);
  vec3 col = mix(shallow, deep, clamp(vDepthT, 0.0, 1.0)) * ndl;
  gl_FragColor = vec4(col, vAlpha);
}
`;

export class WaterMesh {
  readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly width: number;
  private readonly height: number;
  private readonly worldSize: number;
  private readonly dryEpsilon: number;
  private readonly waterColor: THREE.BufferAttribute;

  constructor(width: number, height: number, worldSize: number) {
    this.width = width;
    this.height = height;
    this.worldSize = worldSize;
    this.dryEpsilon = config.dryEpsilon;

    this.geometry = new THREE.PlaneGeometry(
      worldSize,
      worldSize,
      width - 1,
      height - 1,
    );
    this.geometry.rotateX(-Math.PI / 2);

    const count = this.geometry.attributes.position!.count;
    this.waterColor = new THREE.BufferAttribute(new Float32Array(count * 4), 4);
    this.geometry.setAttribute("waterColor", this.waterColor);

    const material = new THREE.ShaderMaterial({
      vertexShader: waterVertex,
      fragmentShader: waterFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.renderOrder = 1;
    this.mesh.name = "water";
  }

  updateFrom(model: WaterStateView): void {
    const pos = this.geometry.attributes.position as THREE.BufferAttribute;
    const cellW = this.worldSize / (this.width - 1);
    const cellH = this.worldSize / (this.height - 1);
    const ox = -this.worldSize / 2;
    const oz = -this.worldSize / 2;

    let i = 0;
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const h = model.getTerrainHeight(x, z);
        const w = model.getWaterDepth(x, z);
        const wet = w > this.dryEpsilon;
        const y = wet ? h + w : h;
        pos.setXYZ(i, ox + x * cellW, y + 0.02, oz + z * cellH);

        const t = wet ? Math.min(1, w * 2) : 0;
        const a = wet ? 0.55 + 0.35 * t : 0;
        this.waterColor.setXYZW(i, 0, 0, t, a);
        i++;
      }
    }
    pos.needsUpdate = true;
    this.waterColor.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}
