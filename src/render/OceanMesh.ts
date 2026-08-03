import * as THREE from "three";
import { config } from "../config";

// Same panning-fbm ripple + sky-reflection + sun-specular treatment as
// WaterMesh's shader (kept as a separate copy, not a shared import — this
// file and WaterMesh.ts are each meant to be self-contained render pieces).
// See WaterMesh.ts's fragment shader comment: sun/sky constants mirror
// Scene.ts's DirectionalLight (position (24,40,16), color 0xfff2dd) and
// fog/background (0xb8c9d4) so the surrounding sea plane reads as the same
// water/light system as the inland WaterMesh, not a flat unlit backdrop.
const oceanVertex = /* glsl */ `
varying vec3 vWorldPos;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const oceanFragment = /* glsl */ `
varying vec3 vWorldPos;
uniform vec3 uBaseColor;
uniform float uOpacity;
uniform float uTime;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * valueNoise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

float rippleHeight(vec2 p, float t) {
  vec2 p1 = p * 0.35 + vec2(t * 0.07, t * 0.045);
  vec2 p2 = p * 0.83 - vec2(t * 0.05, t * 0.09);
  return fbm(p1) * 0.65 + fbm(p2) * 0.35;
}

vec2 rippleTilt(vec2 p, float t) {
  float eps = 0.12;
  float hL = rippleHeight(p - vec2(eps, 0.0), t);
  float hR = rippleHeight(p + vec2(eps, 0.0), t);
  float hD = rippleHeight(p - vec2(0.0, eps), t);
  float hU = rippleHeight(p + vec2(0.0, eps), t);
  return vec2(hL - hR, hD - hU) / (2.0 * eps);
}

void main() {
  vec2 p = vWorldPos.xz;

  // Fragment-only normal perturbation — the plane's vertex Y is left
  // untouched (no vertex displacement) so the depthWrite/polygonOffset
  // shoreline z-fight fix noted below still applies exactly as tuned.
  vec2 tilt = rippleTilt(p, uTime);
  vec3 n = normalize(vec3(0.0, 1.0, 0.0) + vec3(tilt.x, 0.0, tilt.y) * 0.5);

  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 reflectDir = reflect(-viewDir, n);
  float skyT = smoothstep(0.0, 0.7, reflectDir.y * 0.5 + 0.5);
  vec3 skyColor = mix(uSkyHorizon, uSkyZenith, skyT);

  float ndv = clamp(dot(n, viewDir), 0.0, 1.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  float ndl = 0.35 + 0.65 * max(dot(n, uSunDirection), 0.0);
  vec3 col = mix(uBaseColor * ndl, skyColor, fresnel * 0.65);

  // Sun specular sparkle, softly compressed so it never hard-clips to a
  // flat white disc (bar item 10).
  vec3 halfDir = normalize(viewDir + uSunDirection);
  float spec = pow(max(dot(n, halfDir), 0.0), 140.0);
  float sparkle = 0.5 + 0.9 * valueNoise(p * 9.0 + uTime * 0.6);
  spec *= sparkle * (0.3 + 0.7 * fresnel);
  vec3 specCol = uSunColor * spec * 1.4;
  specCol = specCol / (1.0 + specCol);
  col += specCol;

  // Let the specular sparkle read through the transparency instead of
  // being washed out flat by the fixed low opacity.
  float alpha = clamp(uOpacity + spec * 0.35, 0.0, 1.0);

  gl_FragColor = vec4(col, alpha);
}
`;

/**
 * Visual ocean plane at sea level (observer only — T-006).
 * C-015: shoreline reads against this plane without an inspector.
 */
export class OceanMesh {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;
  private readonly uniforms: Record<string, THREE.IUniform>;
  /** Wall-clock accumulator driving ripple/sparkle animation; wrapped to
   *  keep float precision sane across long play sessions. */
  private elapsedSeconds = 0;
  private lastRenderMs: number | undefined = undefined;

  constructor(worldSize = config.worldSize) {
    const geo = new THREE.PlaneGeometry(worldSize * 1.35, worldSize * 1.35);
    geo.rotateX(-Math.PI / 2);
    this.uniforms = {
      uBaseColor: { value: new THREE.Color(0x1a4a6e) },
      uOpacity: { value: 0.55 },
      uTime: { value: 0 },
      // Matches Scene.ts's sunDirectionFromSky(38, 205) — kept as a literal
      // constant here rather than imported so this file stays self-contained
      // (see comment above); update together if Scene.ts's sun angle changes.
      uSunDirection: { value: new THREE.Vector3(-0.333, 0.6157, -0.7142) },
      uSunColor: { value: new THREE.Color(0xfff2dd) },
      uSkyZenith: { value: new THREE.Color(0.53, 0.7, 0.86) },
      uSkyHorizon: { value: new THREE.Color(0xcdd9e2) },
    };
    // Opaque-enough + depthWrite + FrontSide: DoubleSide + depthWrite:false
    // z-fought the shoreline every sim/camera frame (playtest flash).
    // Opacity kept moderate so Sea: mid reads as a surrounding plane, not a
    // filled aquarium tank that looks like the island is drowning (playtest).
    this.material = new THREE.ShaderMaterial({
      vertexShader: oceanVertex,
      fragmentShader: oceanFragment,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = "ocean";
    this.mesh.renderOrder = 0;
    this.mesh.visible = false;
    // Self-contained animation hook: three.js calls this every render for
    // any mesh in the frustum, so ripples/sparkle animate without needing
    // a per-frame call wired in from main.ts. Uses real wall-clock delta
    // (not an assumed 60fps step) so ripple speed stays frame-rate-independent.
    this.mesh.onBeforeRender = () => {
      const now = performance.now();
      const dt =
        this.lastRenderMs === undefined
          ? 1 / 60
          : Math.min((now - this.lastRenderMs) / 1000, 0.1);
      this.lastRenderMs = now;
      this.elapsedSeconds = (this.elapsedSeconds + dt) % 10000;
      this.uniforms.uTime!.value = this.elapsedSeconds;
    };
  }

  /** Show ocean at sea level (m). Pass undefined to hide. */
  setSeaLevel(seaLevel: number | undefined): void {
    if (seaLevel === undefined) {
      this.mesh.visible = false;
      return;
    }
    // Hair below datum so land foreshore verts at ~sea win depth cleanly.
    this.mesh.position.y = seaLevel - 0.02;
    this.mesh.visible = true;
  }
}
